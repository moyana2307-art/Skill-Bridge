// AI Career Mentor endpoints.
const express = require('express');
const controller = require('../controllers/mentor.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const requireFeature = require('../middleware/requireFeature');
const {
  threadIdParams,
  createThreadBody,
  updateThreadBody,
  sendMessageBody,
} = require('../validators/mentor.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: createThreadBody }), asyncHandler(controller.create));
router.get('/:threadId', validate({ params: threadIdParams }), asyncHandler(controller.getOne));
router.patch('/:threadId', validate({ params: threadIdParams, body: updateThreadBody }), asyncHandler(controller.update));
router.delete('/:threadId', validate({ params: threadIdParams }), asyncHandler(controller.remove));
router.post(
  '/:threadId/messages',
  requireFeature('mentor'),
  aiLimiter,
  validate({ params: threadIdParams, body: sendMessageBody }),
  asyncHandler(controller.send)
);

module.exports = router;
