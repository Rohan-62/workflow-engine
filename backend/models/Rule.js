const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ruleSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => uuidv4()
    },
    step_id: {
        type: String,
        ref: 'Step',
        required: [true, 'Step ID is required']
    },
    condition: {
        type: String,
        required: [true, 'Rule condition is required'],
        trim: true
    },
    next_step_id: {
        type: String,
        ref: 'Step',
        default: null
    },
    priority: {
        type: Number,
        required: [true, 'Rule priority is required']
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Rule', ruleSchema);
