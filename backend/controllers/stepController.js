const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');

// @desc    Add step to workflow
// @route   POST /api/workflows/:workflow_id/steps
exports.createStep = async (req, res, next) => {
    try {
        const { name, step_type, order, metadata } = req.body;
        const workflow_id = req.params.workflow_id;

        // Verify workflow exists
        const workflow = await Workflow.findById(workflow_id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        // Auto-assign order if not provided
        let stepOrder = order;
        if (stepOrder === undefined) {
            const lastStep = await Step.findOne({ workflow_id }).sort({ order: -1 });
            stepOrder = lastStep ? lastStep.order + 1 : 1;
        }

        const step = await Step.create({
            workflow_id,
            name,
            step_type,
            order: stepOrder,
            metadata: metadata || {}
        });

        // If this is the first step, set it as start_step_id
        const stepCount = await Step.countDocuments({ workflow_id });
        if (stepCount === 1) {
            workflow.start_step_id = step._id;
            await workflow.save();
        }

        res.status(201).json({ success: true, data: step });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all steps for a workflow
// @route   GET /api/workflows/:workflow_id/steps
exports.getSteps = async (req, res, next) => {
    try {
        const steps = await Step.find({ workflow_id: req.params.workflow_id })
            .populate('rules')
            .sort({ order: 1 });

        res.json({ success: true, data: steps });
    } catch (error) {
        next(error);
    }
};

// @desc    Update step
// @route   PUT /api/steps/:id
exports.updateStep = async (req, res, next) => {
    try {
        const step = await Step.findById(req.params.id);
        if (!step) {
            return res.status(404).json({ success: false, error: 'Step not found' });
        }

        const { name, step_type, order, metadata } = req.body;
        if (name !== undefined) step.name = name;
        if (step_type !== undefined) step.step_type = step_type;
        if (order !== undefined) step.order = order;
        if (metadata !== undefined) step.metadata = metadata;

        await step.save();
        res.json({ success: true, data: step });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete step (cascade delete rules)
// @route   DELETE /api/steps/:id
exports.deleteStep = async (req, res, next) => {
    try {
        const step = await Step.findById(req.params.id);
        if (!step) {
            return res.status(404).json({ success: false, error: 'Step not found' });
        }

        // Delete all rules for this step
        await Rule.deleteMany({ step_id: req.params.id });

        // Also remove rules pointing to this step as next_step_id
        await Rule.updateMany(
            { next_step_id: req.params.id },
            { next_step_id: null }
        );

        // If this was the start step, clear it
        await Workflow.updateMany(
            { start_step_id: req.params.id },
            { start_step_id: null }
        );

        await Step.findByIdAndDelete(req.params.id);

        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
