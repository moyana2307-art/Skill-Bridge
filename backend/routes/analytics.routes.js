// Employability analytics endpoints.
const express = require('express');
const controller = require('../controllers/analytics.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireFeature = require('../middleware/requireFeature');

const router = express.Router();

router.use(requireAuth);

router.get('/employability', requireFeature('advanced_analytics'), asyncHandler(controller.employability));

module.exports = router;
