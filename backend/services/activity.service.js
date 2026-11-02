// Human-readable activity feed used by the admin control centre.
// Logging is best-effort: a failed feed write must never break the action that
// triggered it.
const { pool } = require('../config/db');
const { env } = require('../config/env');
const { escapeLike } = require('../utils/sql');

const REPORT_TZ = String(env.reporting.timezone || 'UTC').replace(/'/g, "''");

// Event types are grouped so the admin feed can be filtered without the
// frontend having to know every individual event name.
const CATEGORY_CONDITIONS = {
  registrations: [`a.event_type = 'auth.registered'`, `a.event_type = 'user.registered'`],
  auth: [`a.event_type LIKE 'auth.%'`, `a.event_type = 'user.registered'`],
  ai: [
    `a.event_type LIKE 'ai.%'`,
    `a.event_type LIKE 'mentor.%'`,
    `a.event_type LIKE 'career.%'`,
    `a.event_type LIKE 'career_studio.%'`,
  ],
  learning: [
    `a.event_type LIKE 'roadmap.%'`,
    `a.event_type LIKE 'career_goal.%'`,
    `a.event_type LIKE 'skill.%'`,
    `a.event_type LIKE 'user_skill.%'`,
    `a.event_type LIKE 'opportunity.%'`,
    `a.event_type LIKE 'project.%'`,
    `a.event_type LIKE 'portfolio.%'`,
  ],
  payments: [`a.event_type LIKE 'payment%'`],
  subscriptions: [
    `a.event_type LIKE 'subscription%'`,
    `a.event_type LIKE 'plan_request%'`,
    `a.event_type IN ('admin_assigned','institution_assigned','institution_removed','institution_suspended')`,
  ],
  admin: [`a.event_type LIKE 'admin.%'`, `a.event_type LIKE 'institution.%'`],
};

function trim(value, max) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

function requestContext(req) {
  if (!req) return { ipAddress: null, userAgent: null };
  return {
    ipAddress: trim(req.ip || req.socket?.remoteAddress, 64),
    userAgent: trim(
      req.get ? req.get('user-agent') : req.headers?.['user-agent'],
      300
    ),
  };
}

async function logActivity({
  userId = null,
  eventType,
  entityType = null,
  entityId = null,
  title = null,
  metadata = null,
  req = null,
}) {
  if (!eventType) return null;
  const { ipAddress, userAgent } = requestContext(req);

  try {
    const { rows } = await pool.query(
      `INSERT INTO activity_logs
         (user_id, event_type, entity_type, entity_id, title, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING id, created_at`,
      [
        userId || null,
        trim(eventType, 80),
        trim(entityType, 40),
        entityId || null,
        trim(title, 200),
        JSON.stringify(metadata || {}),
        ipAddress,
        userAgent,
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[activity] could not record activity:', err.message);
    return null;
  }
}

async function listActivity({
  page = 1,
  limit = 20,
  event_type: eventType,
  category,
  search,
  user_id: userId,
  from,
  to,
} = {}) {
  const conditions = [];
  const values = [];

  if (eventType) {
    values.push(eventType);
    conditions.push(`a.event_type = $${values.length}`);
  }
  if (category && category !== 'all' && CATEGORY_CONDITIONS[category]) {
    conditions.push(`(${CATEGORY_CONDITIONS[category].join(' OR ')})`);
  }
  if (userId) {
    values.push(userId);
    conditions.push(`a.user_id = $${values.length}`);
  }
  if (search) {
    const like = `%${escapeLike(search)}%`;
    values.push(like, like, like);
    conditions.push(
      `(u.name ILIKE $${values.length - 2} ESCAPE '\\'
        OR u.email ILIKE $${values.length - 1} ESCAPE '\\'
        OR a.title ILIKE $${values.length} ESCAPE '\\')`
    );
  }
  if (from) {
    values.push(from);
    conditions.push(`(a.created_at AT TIME ZONE '${REPORT_TZ}')::date >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    conditions.push(`(a.created_at AT TIME ZONE '${REPORT_TZ}')::date <= $${values.length}::date`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countValues = [...values];
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const [activityResult, countResult, typesResult] = await Promise.all([
    pool.query(
      `SELECT a.id, a.user_id, a.event_type, a.entity_type, a.entity_id,
         a.title, a.metadata, a.created_at,
         u.name AS user_name, u.email AS user_email
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    ),
    pool.query(
      `SELECT COUNT(*) AS total
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}`,
      countValues
    ),
    pool.query(
      `SELECT DISTINCT event_type FROM activity_logs
       ORDER BY event_type ASC`
    ),
  ]);

  return {
    activity: activityResult.rows,
    event_types: typesResult.rows.map((row) => row.event_type),
    total: Number(countResult.rows[0].total),
    page,
    limit,
  };
}

module.exports = { logActivity, listActivity };
