// Notification endpoints.
const express = require('express');
const controller = require('../controllers/notifications.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  listNotificationsQuery,
  notificationIdParams,
} = require('../validators/notifications.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listNotificationsQuery }), asyncHandler(controller.list));
router.get('/unread-count', asyncHandler(controller.unreadCount));
router.post('/read-all', asyncHandler(controller.markAllRead));
router.patch('/:notificationId/read', validate({ params: notificationIdParams }), asyncHandler(controller.markRead));
router.delete('/:notificationId', validate({ params: notificationIdParams }), asyncHandler(controller.remove));

module.exports = router;
