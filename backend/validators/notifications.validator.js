// Validation for notifications.
const { z } = require('zod');
const {
  idParam,
  booleanFromQuery,
  paginationQuery,
  optionalText,
} = require('./common.validator');

const listNotificationsQuery = paginationQuery.extend({
  unread: booleanFromQuery(),
});

const notificationIdParams = z.object({ notificationId: idParam });

const broadcastBody = z
  .object({
    title: z.string().trim().min(2, 'Title is required').max(200),
    body: optionalText(2000),
    link: optionalText(300),
  })
  .strict();

module.exports = {
  listNotificationsQuery,
  notificationIdParams,
  broadcastBody,
};
