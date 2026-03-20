const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Execution = require('../models/Execution');

// @desc    Create workflow
// @route   POST /api/workflows
exports.createWorkflow = async (req, res, next) => {
    try {
        const { name, description, input_schema } = req.body;
        const workflow = await Workflow.create({ name, description, input_schema });
        res.status(201).json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all workflows (with pagination & search)
// @route   GET /api/workflows
exports.getWorkflows = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = search
            ? { name: { $regex: search, $options: 'i' } }
            : {};

        const [workflows, total] = await Promise.all([
            Workflow.find(query)
                .populate('steps')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),
            Workflow.countDocuments(query)
        ]);

        // Add step count to each workflow
        const data = workflows.map(w => {
            const obj = w.toJSON();
            obj.step_count = obj.steps ? obj.steps.length : 0;
            return obj;
        });

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

// @desc    Get single workflow with steps & rules
// @route   GET /api/workflows/:id
exports.getWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        // Get steps with their rules
        const steps = await Step.find({ workflow_id: req.params.id })
            .populate('rules')
            .sort({ order: 1 });

        const result = workflow.toJSON();
        result.steps = steps;

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// @desc    Update workflow (increments version)
// @route   PUT /api/workflows/:id
exports.updateWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        const { name, description, input_schema, is_active, start_step_id } = req.body;

        if (name !== undefined) workflow.name = name;
        if (description !== undefined) workflow.description = description;
        if (input_schema !== undefined) workflow.input_schema = input_schema;
        if (is_active !== undefined) workflow.is_active = is_active;
        if (start_step_id !== undefined) workflow.start_step_id = start_step_id;

        // Increment version on update
        workflow.version += 1;

        await workflow.save();
        res.json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete workflow (cascade delete steps & rules)
// @route   DELETE /api/workflows/:id
exports.deleteWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        // Get all steps for this workflow
        const steps = await Step.find({ workflow_id: req.params.id });
        const stepIds = steps.map(s => s._id);

        // Delete all rules for these steps
        await Rule.deleteMany({ step_id: { $in: stepIds } });

        // Delete all steps
        await Step.deleteMany({ workflow_id: req.params.id });

        // Delete all executions
        await Execution.deleteMany({ workflow_id: req.params.id });

        // Delete workflow
        await Workflow.findByIdAndDelete(req.params.id);

        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
