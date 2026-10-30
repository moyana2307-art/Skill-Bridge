// Authentication endpoints.
//
//   POST /api/auth/register  create an account and log in
//   POST /api/auth/login     log in
//   POST /api/auth/logout    clear the login cookie
//   GET  /api/auth/me        current user (protected)
const express = require('express');
const authController = require('../controllers/auth.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { registerBody, loginBody } = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: registerBody }), asyncHandler(authController.register));
router.post('/login', authLimiter, validate({ body: loginBody }), asyncHandler(authController.login));
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
