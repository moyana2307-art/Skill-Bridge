// Reference data endpoints (dropdown values for the frontend).
const express = require('express');
const metaController = require('../controllers/meta.controller');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/meta
router.get('/', asyncHandler(metaController.getMeta));

module.exports = router;
