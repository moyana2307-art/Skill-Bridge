// Notification endpoints.
const notificationsService = require('../services/notifications.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const result = await notificationsService.listNotifications(
    req.user.id,
    req.validated.query
  );
  const unread = await notificationsService.unreadCount(req.user.id);

  return sendSuccess(res, {
    data: { notifications: result.notifications },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
      unread_count: unread,
    },
  });
}

async function unreadCount(req, res) {
  const count = await notificationsService.unreadCount(req.user.id);
  return sendSuccess(res, { data: { unread_count: count } });
}

async function markRead(req, res) {
  const { notificationId } = req.validated.params;
  const notification = await notificationsService.markRead(
    req.user.id,
    notificationId
  );
  if (!notification) throw ApiError.notFound(`Notification ${notificationId} was not found`);
  return sendSuccess(res, { data: { notification } });
}

async function markAllRead(req, res) {
  const updated = await notificationsService.markAllRead(req.user.id);
  return sendSuccess(res, {
    data: { updated },
    message: 'All notifications marked as read',
  });
}

async function remove(req, res) {
  const { notificationId } = req.validated.params;
  const deleted = await notificationsService.deleteNotification(
    req.user.id,
    notificationId
  );
  if (!deleted) throw ApiError.notFound(`Notification ${notificationId} was not found`);
  return sendSuccess(res, {
    data: { notification_id: notificationId },
    message: 'Notification deleted',
  });
}

module.exports = { list, unreadCount, markRead, markAllRead, remove };
