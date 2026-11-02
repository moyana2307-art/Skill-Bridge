// Immutable admin audit ledger. The database trigger rejects updates/deletes,
// so this service only appends. Writes are best-effort so an audit outage does
// not take down an otherwise valid admin action.
const { pool } = require('../config/db');

function trim(value, max) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

function json(value) {
  return value === undefined || value === null
    ? null
    : JSON.stringify(value);
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

async function recordAudit({
  adminId,
  adminName = null,
  action,
  targetType,
  targetId = null,
  targetLabel = null,
  before = null,
  after = null,
  metadata = null,
  req = null,
}) {
  if (!adminId || !action || !targetType) return null;
  const { ipAddress, userAgent } = requestContext(req);

  try {
    const { rows } = await pool.query(
      `INSERT INTO admin_audit_logs
         (admin_user_id, admin_name, action, target_type, target_id, target_label,
          before_data, after_data, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
       RETURNING id, created_at`,
      [
        adminId,
        trim(adminName, 100),
        trim(action, 80),
        trim(targetType, 40),
        targetId || null,
        trim(targetLabel, 200),
        json(before),
        json(after),
        JSON.stringify(metadata || {}),
        ipAddress,
        userAgent,
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[admin-audit] could not record audit entry:', err.message);
    return null;
  }
}

module.exports = { recordAudit };
