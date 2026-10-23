// Database work for a user's career goals. Every query is scoped to the user
// id from the login token.
const { pool } = require('../config/db');

const GOAL_SELECT = `
  SELECT g.id, g.user_id, g.career_title, g.status, g.created_at, g.updated_at,
         (SELECT COUNT(*) FROM learning_roadmaps r
          WHERE r.career_goal_id = g.id) AS roadmap_count
  FROM career_goals g
`;

function mapGoal(row) {
  if (!row) return null;

  return {
    ...row,
    roadmap_count: Number(row.roadmap_count || 0),
  };
}

async function listGoals(userId, status) {
  const conditions = ['g.user_id = ?'];
  const values = [userId];

  if (status) {
    conditions.push('g.status = ?');
    values.push(status);
  }

  const [rows] = await pool.execute(
    `${GOAL_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY FIELD(g.status, 'active', 'completed', 'archived'),
              g.updated_at DESC, g.id DESC`,
    values
  );

  return rows.map(mapGoal);
}

async function getGoalById(userId, goalId) {
  const [rows] = await pool.execute(
    `${GOAL_SELECT} WHERE g.user_id = ? AND g.id = ?`,
    [userId, goalId]
  );

  return mapGoal(rows[0]);
}

// The schema says one goal is active at a time. Activating a goal archives
// the previously active goal for the same user.
async function archiveOtherActiveGoals(connection, userId, keepGoalId = null) {
  if (keepGoalId === null) {
    await connection.execute(
      "UPDATE career_goals SET status = 'archived' WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    return;
  }

  await connection.execute(
    `UPDATE career_goals
     SET status = 'archived'
     WHERE user_id = ? AND status = 'active' AND id <> ?`,
    [userId, keepGoalId]
  );
}

async function createGoal(userId, data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (data.status === 'active') {
      await archiveOtherActiveGoals(connection, userId);
    }

    const [result] = await connection.execute(
      'INSERT INTO career_goals (user_id, career_title, status) VALUES (?, ?, ?)',
      [userId, data.career_title, data.status]
    );

    await connection.commit();

    return getGoalById(userId, result.insertId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateGoal(userId, goalId, fields) {
  const existing = await getGoalById(userId, goalId);
  if (!existing) return null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (fields.status === 'active') {
      await archiveOtherActiveGoals(connection, userId, goalId);
    }

    const columns = [];
    const values = [];

    for (const column of ['career_title', 'status']) {
      if (fields[column] === undefined) continue;
      columns.push(`${column} = ?`);
      values.push(fields[column]);
    }

    if (columns.length) {
      values.push(goalId, userId);
      await connection.execute(
        `UPDATE career_goals SET ${columns.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );
    }

    await connection.commit();

    return getGoalById(userId, goalId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteGoal(userId, goalId) {
  const [result] = await pool.execute(
    'DELETE FROM career_goals WHERE id = ? AND user_id = ?',
    [goalId, userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  listGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
};
