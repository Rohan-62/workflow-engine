const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    createStep,
    getSteps,
    updateStep,
    deleteStep
} = require('../controllers/stepController');

// Routes under /api/workflows/:workflow_id/steps
router.route('/')
    .post(createStep)
    .get(getSteps);

// Routes under /api/steps/:id
router.route('/:id')
    .put(updateStep)
    .delete(deleteStep);

module.exports = router;
