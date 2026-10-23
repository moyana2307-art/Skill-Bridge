// Health check endpoints.
const express = require('express');
const healthController = require('../controllers/health.controller');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/health
router.get('/', asyncHandler(healthController.getHealth));

module.exports = router;
