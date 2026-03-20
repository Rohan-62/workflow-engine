const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    createRule,
    getRules,
    updateRule,
    deleteRule
} = require('../controllers/ruleController');

// Routes under /api/steps/:step_id/rules
router.route('/')
    .post(createRule)
    .get(getRules);

// Routes under /api/rules/:id
router.route('/:id')
    .put(updateRule)
    .delete(deleteRule);

module.exports = router;
