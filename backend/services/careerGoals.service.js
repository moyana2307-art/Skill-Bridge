const { pool } = require('../config/db');
const GOAL_SELECT = `SELECT g.id, g.user_id, g.career_title, g.status, g.created_at, g.updated_at,
  (SELECT COUNT(*) FROM learning_roadmaps r WHERE r.career_goal_id = g.id) AS roadmap_count FROM career_goals g`;

function mapGoal(row) { return row ? { ...row, roadmap_count: Number(row.roadmap_count || 0) } : null; }

async function listGoals(userId, status) {
  const values = [userId];
  const conditions = ['g.user_id = $1'];
  if (status) { values.push(status); conditions.push(`g.status = $${values.length}`); }
  const { rows } = await pool.query(`${GOAL_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY CASE g.status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 WHEN 'archived' THEN 3 END, g.updated_at DESC, g.id DESC`, values);
  return rows.map(mapGoal);
}

async function getGoalById(userId, goalId) {
  const { rows } = await pool.query(`${GOAL_SELECT} WHERE g.user_id = $1 AND g.id = $2`, [userId, goalId]);
  return mapGoal(rows[0]);
}

async function archiveOtherActiveGoals(client, userId, keepGoalId = null) {
  if (keepGoalId === null) {
    await client.query("UPDATE career_goals SET status = 'archived' WHERE user_id = $1 AND status = 'active'", [userId]);
  } else {
    await client.query("UPDATE career_goals SET status = 'archived' WHERE user_id = $1 AND status = 'active' AND id <> $2", [userId, keepGoalId]);
  }
}

async function createGoal(userId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (data.status === 'active') await archiveOtherActiveGoals(client, userId);
    const { rows } = await client.query('INSERT INTO career_goals (user_id, career_title, status) VALUES ($1, $2, $3) RETURNING id', [userId, data.career_title, data.status]);
    await client.query('COMMIT');
    return getGoalById(userId, rows[0].id);
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function updateGoal(userId, goalId, fields) {
  const existing = await getGoalById(userId, goalId);
  if (!existing) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (fields.status === 'active') await archiveOtherActiveGoals(client, userId, goalId);
    const columns = [], values = [];
    for (const column of ['career_title', 'status']) {
      if (fields[column] === undefined) continue;
      values.push(fields[column]); columns.push(`${column} = $${values.length}`);
    }
    if (columns.length) { values.push(goalId, userId); await client.query(`UPDATE career_goals SET ${columns.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length}`, values); }
    await client.query('COMMIT');
    return getGoalById(userId, goalId);
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function deleteGoal(userId, goalId) {
  const result = await pool.query('DELETE FROM career_goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
  return result.rowCount > 0;
}

module.exports = { listGoals, getGoalById, createGoal, updateGoal, deleteGoal };
