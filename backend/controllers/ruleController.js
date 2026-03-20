const Rule = require('../models/Rule');
const Step = require('../models/Step');

// @desc    Add rule to step
// @route   POST /api/steps/:step_id/rules

exports.createRule = async (req, res, next) => {
    try {
        const { condition, next_step_id, priority } = req.body;
        const step_id = req.params.step_id;

        // Verify step exists

        const step = await Step.findById(step_id);
        if (!step) {
            return res.status(404).json({ success: false, error: 'Step not found' });
        }

        // Auto-assign priority if not provided

        let rulePriority = priority;
        if (rulePriority === undefined) {
            const lastRule = await Rule.findOne({ step_id }).sort({ priority: -1 });
            rulePriority = lastRule ? lastRule.priority + 1 : 1;
        }

        const rule = await Rule.create({
            step_id,
            condition,
            next_step_id: next_step_id || null,
            priority: rulePriority
        });

        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all rules for a step
// @route   GET /api/steps/:step_id/rules

exports.getRules = async (req, res, next) => {
    try {
        const rules = await Rule.find({ step_id: req.params.step_id })
            .sort({ priority: 1 });

        res.json({ success: true, data: rules });
    } catch (error) {
        next(error);
    }
};

// @desc    Update rule
// @route   PUT /api/rules/:id

exports.updateRule = async (req, res, next) => {
    try {
        const rule = await Rule.findById(req.params.id);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }

        const { condition, next_step_id, priority } = req.body;
        if (condition !== undefined) rule.condition = condition;
        if (next_step_id !== undefined) rule.next_step_id = next_step_id;
        if (priority !== undefined) rule.priority = priority;

        await rule.save();
        res.json({ success: true, data: rule });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete rule
// @route   DELETE /api/rules/:id

exports.deleteRule = async (req, res, next) => {
    try {
        const rule = await Rule.findById(req.params.id);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }

        await Rule.findByIdAndDelete(req.params.id);
        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
