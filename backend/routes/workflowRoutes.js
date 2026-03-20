const express = require('express');
const router = express.Router();
const {
    createWorkflow,
    getWorkflows,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow
} = require('../controllers/workflowController');

router.route('/')
    .post(createWorkflow)
    .get(getWorkflows);

router.route('/:id')
    .get(getWorkflow)
    .put(updateWorkflow)
    .delete(deleteWorkflow);

module.exports = router;
