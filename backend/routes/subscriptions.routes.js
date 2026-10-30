// Subscription plans, current entitlements, and upgrade requests.
const express = require('express');
const controller = require('../controllers/subscriptions.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const {
  requestUpgradeBody,
} = require('../validators/subscriptions.validator');

const router = express.Router();

router.get('/plans', asyncHandler(controller.plans));

router.use(requireAuth);
router.get('/me', asyncHandler(controller.me));
router.get('/requests', asyncHandler(controller.myRequests));
router.post(
  '/requests',
  writeLimiter,
  validate({ body: requestUpgradeBody }),
  asyncHandler(controller.requestUpgrade)
);

module.exports = router;
