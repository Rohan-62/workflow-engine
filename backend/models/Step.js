const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const stepSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => uuidv4()
    },
    workflow_id: {
        type: String,
        ref: 'Workflow',
        required: [true, 'Workflow ID is required']
    },
    name: {
        type: String,
        required: [true, 'Step name is required'],
        trim: true
    },
    step_type: {
        type: String,
        enum: {
            values: ['task', 'approval', 'notification'],
            message: 'Step type must be task, approval, or notification'
        },
        required: [true, 'Step type is required']
    },
    order: {
        type: Number,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual to get rules
stepSchema.virtual('rules', {
    ref: 'Rule',
    localField: '_id',
    foreignField: 'step_id'
});

stepSchema.set('toJSON', { virtuals: true });
stepSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Step', stepSchema);
