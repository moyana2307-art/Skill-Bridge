// Notifications are small in-app messages tied to one user. They are created
// by other features (roadmaps, applications, projects, admin announcements)
// and read through /api/notifications.
const { pool } = require('../config/db');

const NOTIFICATION_COLUMNS = `id, user_id, type, title, body, link, is_read, read_at, created_at`;

function mapNotification(row) {
  return row ? { ...row, is_read: Boolean(row.is_read) } : null;
}

async function createNotification(userId, { type, title, body = null, link = null }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${NOTIFICATION_COLUMNS}`,
    [userId, type, title, body, link]
  );
  return mapNotification(rows[0]);
}

// A notification must never make the action that triggered it fail.
async function notify(userId, payload) {
  try {
    return await createNotification(userId, payload);
  } catch (err) {
    console.error('[notifications] could not create notification:', err.message);
    return null;
  }
}

async function notifyMany(userIds, payload) {
  if (!userIds.length) return 0;
  const values = [];
  const rows = userIds.map((userId) => {
    values.push(userId, payload.type, payload.title, payload.body ?? null, payload.link ?? null);
    const base = values.length - 4;
    return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  const { rowCount } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ${rows.join(', ')}`,
    values
  );
  return rowCount;
}

async function listNotifications(userId, { unread, page, limit }) {
  const conditions = ['user_id = $1'];
  const values = [userId];

  if (unread !== undefined) {
    values.push(unread);
    conditions.push(`is_read = $${values.length}`);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
     WHERE ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM notifications WHERE ${where}`,
    values.slice(0, values.length - 2)
  );

  return {
    notifications: rows.map(mapNotification),
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function unreadCount(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return Number(rows[0].count);
}

async function markRead(userId, notificationId) {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 RETURNING ${NOTIFICATION_COLUMNS}`,
    [notificationId, userId]
  );
  return mapNotification(rows[0]);
}

async function markAllRead(userId) {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
}

async function deleteNotification(userId, notificationId) {
  const { rowCount } = await pool.query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  return rowCount > 0;
}

async function broadcast({ type = 'announcement', title, body, link = null }) {
  const { rows } = await pool.query('SELECT id FROM users');
  return notifyMany(
    rows.map((row) => row.id),
    { type, title, body, link }
  );
}

module.exports = {
  createNotification,
  notify,
  notifyMany,
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  broadcast,
};
