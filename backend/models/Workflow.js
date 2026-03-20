const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const workflowSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => uuidv4()
    },
    name: {
        type: String,
        required: [true, 'Workflow name is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    version: {
        type: Number,
        default: 1
    },
    is_active: {
        type: Boolean,
        default: true
    },
    input_schema: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    start_step_id: {
        type: String,
        ref: 'Step',
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual to get step count
workflowSchema.virtual('steps', {
    ref: 'Step',
    localField: '_id',
    foreignField: 'workflow_id'
});

workflowSchema.set('toJSON', { virtuals: true });
workflowSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Workflow', workflowSchema);
