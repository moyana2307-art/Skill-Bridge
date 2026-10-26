// Stores AI results so a user can come back to their latest analysis instead
// of paying for the same generation again on every page load.
const { pool } = require('../config/db');

const ANALYSIS_SELECT = `
  SELECT id, analysis_type, career_goal_id, opportunity_id, model, payload,
         created_at
  FROM ai_analyses
`;

function parsePayload(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function mapAnalysis(row) {
  if (!row) return null;

  return {
    ...row,
    payload: parsePayload(row.payload),
  };
}

async function saveAnalysis(
  userId,
  { type, careerGoalId = null, opportunityId = null, model, payload }
) {
  const [result] = await pool.execute(
    `INSERT INTO ai_analyses
       (user_id, analysis_type, career_goal_id, opportunity_id, model, payload)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      careerGoalId,
      opportunityId,
      model,
      JSON.stringify(payload),
    ]
  );

  const [rows] = await pool.execute(
    `${ANALYSIS_SELECT} WHERE id = ? AND user_id = ?`,
    [result.insertId, userId]
  );

  return mapAnalysis(rows[0]);
}

async function getLatestAnalysis(userId, type) {
  const [rows] = await pool.execute(
    `${ANALYSIS_SELECT}
     WHERE user_id = ? AND analysis_type = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId, type]
  );

  return mapAnalysis(rows[0]);
}

module.exports = { saveAnalysis, getLatestAnalysis };
