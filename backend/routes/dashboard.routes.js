// Advanced user dashboard endpoint.
const express = require('express');
const controller = require('../controllers/dashboard.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(controller.get));

module.exports = router;
