const Execution = require('../models/Execution');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const { evaluateCondition } = require('../engine/ruleEvaluator');

// @desc    Start workflow execution
// @route   POST /api/workflows/:workflow_id/execute
exports.executeWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findById(req.params.workflow_id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        if (!workflow.start_step_id) {
            return res.status(400).json({ success: false, error: 'Workflow has no start step defined' });
        }

        const inputData = req.body.data || {};
        const triggeredBy = req.body.triggered_by || 'system';

        // Validate input against schema
        const schemaErrors = validateInput(workflow.input_schema, inputData);
        if (schemaErrors.length > 0) {
            return res.status(400).json({ success: false, error: 'Input validation failed', messages: schemaErrors });
        }

        // Create execution record
        const execution = await Execution.create({
            workflow_id: workflow._id,
            workflow_version: workflow.version,
            status: 'in_progress',
            data: inputData,
            current_step_id: workflow.start_step_id,
            triggered_by: triggeredBy,
            started_at: new Date()
        });

        // Start processing steps
        await processStep(execution, workflow.start_step_id, inputData);

        // Return the updated execution
        const updatedExecution = await Execution.findById(execution._id);
        res.status(201).json({ success: true, data: updatedExecution });
    } catch (error) {
        next(error);
    }
};

// Process a single step and continue chain
async function processStep(execution, stepId, inputData) {
    const step = await Step.findById(stepId);
    if (!step) {
        execution.status = 'failed';
        execution.ended_at = new Date();
        await execution.save();
        return;
    }

    // Loop Protection: Max iterations per step
    const MAX_ITERATIONS = 50;
    const stepVisits = execution.logs.filter(log => log.step_id === String(step._id)).length;
    if (stepVisits >= MAX_ITERATIONS) {
        execution.status = 'failed';
        execution.ended_at = new Date();
        execution.logs.push({
            step_id: step._id,
            step_name: step.name,
            step_type: step.step_type,
            status: 'failed',
            error_message: `Infinite loop detected: Step executed ${MAX_ITERATIONS} times.`,
            started_at: new Date(),
            ended_at: new Date()
        });
        await execution.save();
        return;
    }

    const stepLog = {
        step_id: step._id,
        step_name: step.name,
        step_type: step.step_type,
        evaluated_rules: [],
        selected_next_step: null,
        status: 'in_progress',
        started_at: new Date()
    };

    try {
        // Handle step based on type
        if (step.step_type === 'approval') {
            // Approval steps pause execution - need manual approve/reject
            stepLog.status = 'pending';
            stepLog.ended_at = new Date();
            execution.logs.push(stepLog);
            execution.current_step_id = step._id;
            execution.status = 'in_progress';
            await execution.save();
            return; // Stop here, wait for approval
        }

        if (step.step_type === 'notification') {
            // Notification steps auto-complete (simulate sending)
            stepLog.status = 'completed';
        }

        if (step.step_type === 'task') {
            // Task steps auto-complete
            stepLog.status = 'completed';
        }

        // Evaluate rules to find next step
        const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
        let nextStepId = null;
        let foundMatch = false;

        for (const rule of rules) {
            let result = false;
            try {
                if (rule.condition === 'DEFAULT') {
                    result = true;
                } else {
                    result = evaluateCondition(rule.condition, inputData);
                }
            } catch (evalError) {
                stepLog.error_message = `Rule evaluation error: ${evalError.message}`;
                result = false;
            }

            stepLog.evaluated_rules.push({
                rule: rule.condition,
                result
            });

            if (result && !foundMatch) {
                nextStepId = rule.next_step_id;
                foundMatch = true;
            }
        }

        if (foundMatch && nextStepId) {
            const nextStep = await Step.findById(nextStepId);
            stepLog.selected_next_step = nextStep ? nextStep.name : nextStepId;
        } else if (foundMatch && !nextStepId) {
            stepLog.selected_next_step = 'END';
        }

        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);

        if (!foundMatch && rules.length > 0) {
            // No rule matched and no DEFAULT
            execution.status = 'failed';
            execution.current_step_id = step._id;
            execution.ended_at = new Date();
            await execution.save();
            return;
        }

        if (!nextStepId) {
            // Workflow completed (next_step_id is null or no rules)
            execution.status = 'completed';
            execution.current_step_id = null;
            execution.ended_at = new Date();
            await execution.save();
            return;
        }

        // Continue to next step
        execution.current_step_id = nextStepId;
        await execution.save();

        // Recursively process next step
        await processStep(execution, nextStepId, inputData);
    } catch (error) {
        stepLog.status = 'failed';
        stepLog.error_message = error.message;
        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);
        execution.status = 'failed';
        execution.ended_at = new Date();
        await execution.save();
    }
}

// Validate input against workflow schema
function validateInput(schema, data) {
    const errors = [];
    if (!schema || typeof schema !== 'object') return errors;

    for (const [field, config] of Object.entries(schema)) {
        if (config.required && (data[field] === undefined || data[field] === null || data[field] === '')) {
            errors.push(`Field '${field}' is required`);
            continue;
        }

        if (data[field] !== undefined && data[field] !== null) {
            // Type checking
            if (config.type === 'number' && typeof data[field] !== 'number') {
                errors.push(`Field '${field}' must be a number`);
            }
            if (config.type === 'string' && typeof data[field] !== 'string') {
                errors.push(`Field '${field}' must be a string`);
            }

            // Allowed values
            if (config.allowed_values && !config.allowed_values.includes(data[field])) {
                errors.push(`Field '${field}' must be one of: ${config.allowed_values.join(', ')}`);
            }
        }
    }

    return errors;
}

// @desc    Get execution by ID
// @route   GET /api/executions/:id
exports.getExecution = async (req, res, next) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ success: false, error: 'Execution not found' });
        }
        res.json({ success: true, data: execution });
    } catch (error) {
        next(error);
    }
};

// @desc    List all executions (audit log)
// @route   GET /api/executions
exports.getExecutions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const workflow_id = req.query.workflow_id;

        const query = {};
        if (status) query.status = status;
        if (workflow_id) query.workflow_id = workflow_id;

        const [executions, total] = await Promise.all([
            Execution.find(query)
                .sort({ started_at: -1 })
                .skip(skip)
                .limit(limit),
            Execution.countDocuments(query)
        ]);

        // Populate workflow names
        const data = [];
        for (const exec of executions) {
            const obj = exec.toJSON();
            const workflow = await Workflow.findById(exec.workflow_id);
            obj.workflow_name = workflow ? workflow.name : 'Deleted Workflow';
            data.push(obj);
        }

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve execution (current approval step)
// @route   POST /api/executions/:id/approve
exports.approveExecution = async (req, res, next) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ success: false, error: 'Execution not found' });
        }

        if (execution.status !== 'in_progress') {
            return res.status(400).json({ success: false, error: 'Execution is not in progress' });
        }

        const currentStep = await Step.findById(execution.current_step_id);
        if (!currentStep || currentStep.step_type !== 'approval') {
            return res.status(400).json({ success: false, error: 'Current step is not an approval step' });
        }

        // Find the pending log entry and mark it completed
        const lastLog = execution.logs[execution.logs.length - 1];
        if (lastLog && lastLog.step_id === execution.current_step_id) {
            lastLog.status = 'completed';
            lastLog.approver_id = req.body.approver_id || 'user';
            lastLog.ended_at = new Date();

            // Evaluate rules for this approval step
            const rules = await Rule.find({ step_id: currentStep._id }).sort({ priority: 1 });
            let nextStepId = null;
            let foundMatch = false;

            for (const rule of rules) {
                let result = false;
                try {
                    if (rule.condition === 'DEFAULT') {
                        result = true;
                    } else {
                        result = evaluateCondition(rule.condition, execution.data);
                    }
                } catch (evalError) {
                    result = false;
                }

                lastLog.evaluated_rules.push({
                    rule: rule.condition,
                    result
                });

                if (result && !foundMatch) {
                    nextStepId = rule.next_step_id;
                    foundMatch = true;
                }
            }

            if (foundMatch && nextStepId) {
                const nextStep = await Step.findById(nextStepId);
                lastLog.selected_next_step = nextStep ? nextStep.name : nextStepId;
            } else if (foundMatch && !nextStepId) {
                lastLog.selected_next_step = 'END';
            }
        }

        execution.markModified('logs');
        await execution.save();

        // Continue processing
        const rules = await Rule.find({ step_id: currentStep._id }).sort({ priority: 1 });
        let nextStepId = null;

        for (const rule of rules) {
            let result = false;
            if (rule.condition === 'DEFAULT') {
                result = true;
            } else {
                try {
                    result = evaluateCondition(rule.condition, execution.data);
                } catch (e) {
                    result = false;
                }
            }
            if (result) {
                nextStepId = rule.next_step_id;
                break;
            }
        }

        if (!nextStepId) {
            execution.status = 'completed';
            execution.current_step_id = null;
            execution.ended_at = new Date();
            await execution.save();
        } else {
            await processStep(execution, nextStepId, execution.data);
        }

        const updatedExecution = await Execution.findById(execution._id);
        res.json({ success: true, data: updatedExecution });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject execution (current approval step)
// @route   POST /api/executions/:id/reject
exports.rejectExecution = async (req, res, next) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ success: false, error: 'Execution not found' });
        }

        // Mark current step as failed/rejected
        const lastLog = execution.logs[execution.logs.length - 1];
        if (lastLog) {
            lastLog.status = 'failed';
            lastLog.error_message = req.body.reason || 'Rejected by approver';
            lastLog.approver_id = req.body.approver_id || 'user';
            lastLog.ended_at = new Date();
        }

        execution.status = 'failed';
        execution.ended_at = new Date();
        execution.markModified('logs');
        await execution.save();

        res.json({ success: true, data: execution });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel execution
// @route   POST /api/executions/:id/cancel
exports.cancelExecution = async (req, res, next) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ success: false, error: 'Execution not found' });
        }

        if (['completed', 'canceled'].includes(execution.status)) {
            return res.status(400).json({ success: false, error: 'Execution cannot be canceled' });
        }

        execution.status = 'canceled';
        execution.ended_at = new Date();
        await execution.save();

        res.json({ success: true, data: execution });
    } catch (error) {
        next(error);
    }
};

// @desc    Retry failed step
// @route   POST /api/executions/:id/retry
exports.retryExecution = async (req, res, next) => {
    try {
        const execution = await Execution.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ success: false, error: 'Execution not found' });
        }

        if (execution.status !== 'failed') {
            return res.status(400).json({ success: false, error: 'Only failed executions can be retried' });
        }

        // Re-execute the current (failed) step
        execution.status = 'in_progress';
        execution.retries += 1;
        execution.ended_at = null;
        await execution.save();

        await processStep(execution, execution.current_step_id, execution.data);

        const updatedExecution = await Execution.findById(execution._id);
        res.json({ success: true, data: updatedExecution });
    } catch (error) {
        next(error);
    }
};
