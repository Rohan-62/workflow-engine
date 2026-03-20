const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const stepLogSchema = new mongoose.Schema({
    step_id: String,
    step_name: String,
    step_type: String,
    evaluated_rules: [{
        rule: String,
        result: Boolean
    }],
    selected_next_step: String,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
        default: 'pending'
    },
    approver_id: { type: String, default: null },
    error_message: { type: String, default: null },
    started_at: { type: Date, default: null },
    ended_at: { type: Date, default: null }
}, { _id: false });

const executionSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => uuidv4()
    },
    workflow_id: {
        type: String,
        ref: 'Workflow',
        required: [true, 'Workflow ID is required']
    },
    workflow_version: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
            message: 'Invalid execution status'
        },
        default: 'pending'
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    logs: {
        type: [stepLogSchema],
        default: []
    },
    current_step_id: {
        type: String,
        ref: 'Step',
        default: null
    },
    retries: {
        type: Number,
        default: 0
    },
    triggered_by: {
        type: String,
        default: 'system'
    },
    started_at: {
        type: Date,
        default: null
    },
    ended_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Execution', executionSchema);
