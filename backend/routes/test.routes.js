// Test endpoints used to check the API foundation.
// They are mounted only when NODE_ENV is not "production".
const express = require('express');
const testController = require('../controllers/test.controller');
const validate = require('../middleware/validate');
const { echoBody } = require('../validators/test.validator');

const router = express.Router();

// GET /api/test
router.get('/', testController.ping);

// POST /api/test/echo
router.post('/echo', validate({ body: echoBody }), testController.echo);

module.exports = router;
