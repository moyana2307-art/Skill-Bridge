const express = require('express');
const controller = require('../controllers/payments.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { z } = require('zod');

const checkoutBody = z.object({
  plan_code: z.enum(['plus', 'premium']),
  provider: z.enum(['paynow']).default('paynow'),
}).strict();

const router = express.Router();

// Public endpoints
router.get('/providers', asyncHandler(controller.getProviders));
router.post('/webhook/:provider', asyncHandler(controller.webhook)); // Webhook must be public but verified by signature

// Protected endpoints
router.use(requireAuth);
router.post('/checkout', validate({ body: checkoutBody }), asyncHandler(controller.createCheckout));
router.get('/status/:reference', asyncHandler(controller.checkStatus));

module.exports = router;
