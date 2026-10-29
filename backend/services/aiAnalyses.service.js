const { pool } = require('../config/db');
const ANALYSIS_SELECT = 'SELECT id, analysis_type, career_goal_id, opportunity_id, model, payload, created_at FROM ai_analyses';

function parsePayload(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return null; } }
  return value;
}
function mapAnalysis(row) { return row ? { ...row, payload: parsePayload(row.payload) } : null; }

async function saveAnalysis(userId, { type, careerGoalId = null, opportunityId = null, model, payload }) {
  const { rows } = await pool.query(
    `INSERT INTO ai_analyses (user_id, analysis_type, career_goal_id, opportunity_id, model, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id`,
    [userId, type, careerGoalId, opportunityId, model, JSON.stringify(payload)]
  );
  const result = await pool.query(`${ANALYSIS_SELECT} WHERE id = $1 AND user_id = $2`, [rows[0].id, userId]);
  return mapAnalysis(result.rows[0]);
}

async function getLatestAnalysis(userId, type) {
  const { rows } = await pool.query(`${ANALYSIS_SELECT} WHERE user_id = $1 AND analysis_type = $2 ORDER BY created_at DESC, id DESC LIMIT 1`, [userId, type]);
  return mapAnalysis(rows[0]);
}

module.exports = { saveAnalysis, getLatestAnalysis };
