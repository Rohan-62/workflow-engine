const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    executeWorkflow,
    getExecution,
    getExecutions,
    approveExecution,
    rejectExecution,
    cancelExecution,
    retryExecution
} = require('../controllers/executionController');

// Start execution for a workflow
router.post('/workflows/:workflow_id/execute', executeWorkflow);

// List all executions (audit log)
router.get('/', getExecutions);

// Get single execution
router.get('/:id', getExecution);

// Execution actions
router.post('/:id/approve', approveExecution);
router.post('/:id/reject', rejectExecution);
router.post('/:id/cancel', cancelExecution);
router.post('/:id/retry', retryExecution);

module.exports = router;
