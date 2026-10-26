// Database work for learning roadmaps and their tasks. A roadmap and its
// tasks always belong to the user id from the login token.
const { pool } = require('../config/db');
const careerGoalsService = require('./careerGoals.service');

const ROADMAP_SELECT = `
  SELECT r.id, r.user_id, r.career_goal_id, r.title, r.summary, r.status,
         r.created_at, r.updated_at, g.career_title,
         (SELECT COUNT(*) FROM roadmap_tasks t
          WHERE t.roadmap_id = r.id) AS task_count,
         (SELECT COUNT(*) FROM roadmap_tasks t
          WHERE t.roadmap_id = r.id AND t.status = 'completed')
           AS completed_task_count
  FROM learning_roadmaps r
  LEFT JOIN career_goals g ON g.id = r.career_goal_id
`;

const TASK_COLUMNS = `
  id, roadmap_id, title, description, skills_to_develop, learning_activities,
  practical_project, resources, estimated_duration, sort_order, status,
  created_at, updated_at
`;

const ROADMAP_UPDATABLE_COLUMNS = [
  'title',
  'summary',
  'career_goal_id',
  'status',
];

const TASK_UPDATABLE_COLUMNS = [
  'title',
  'description',
  'skills_to_develop',
  'learning_activities',
  'practical_project',
  'resources',
  'estimated_duration',
  'sort_order',
  'status',
];

function mapRoadmap(row) {
  if (!row) return null;

  const taskCount = Number(row.task_count || 0);
  const completedTaskCount = Number(row.completed_task_count || 0);

  return {
    ...row,
    task_count: taskCount,
    completed_task_count: completedTaskCount,
    progress_percent:
      taskCount === 0 ? 0 : Math.round((completedTaskCount / taskCount) * 100),
  };
}

async function listRoadmaps(userId, filters) {
  const conditions = ['r.user_id = ?'];
  const values = [userId];

  if (filters.status) {
    conditions.push('r.status = ?');
    values.push(filters.status);
  }

  if (filters.career_goal_id) {
    conditions.push('r.career_goal_id = ?');
    values.push(filters.career_goal_id);
  }

  const [rows] = await pool.execute(
    `${ROADMAP_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY FIELD(r.status, 'active', 'completed', 'archived'),
              r.updated_at DESC, r.id DESC`,
    values
  );

  return rows.map(mapRoadmap);
}

async function getRoadmapRow(userId, roadmapId) {
  const [rows] = await pool.execute(
    `${ROADMAP_SELECT} WHERE r.user_id = ? AND r.id = ?`,
    [userId, roadmapId]
  );

  return mapRoadmap(rows[0]);
}

async function getRoadmapById(userId, roadmapId) {
  const roadmap = await getRoadmapRow(userId, roadmapId);
  if (!roadmap) return null;

  const [tasks] = await pool.execute(
    `SELECT ${TASK_COLUMNS}
     FROM roadmap_tasks
     WHERE roadmap_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [roadmapId]
  );

  return { ...roadmap, tasks };
}

async function createRoadmap(userId, data) {
  if (
    data.career_goal_id !== undefined &&
    data.career_goal_id !== null &&
    !(await careerGoalsService.getGoalById(userId, data.career_goal_id))
  ) {
    return { status: 'goal_not_found' };
  }

  const columns = ['user_id', 'title', 'status'];
  const values = [userId, data.title, data.status];

  if (data.summary !== undefined) {
    columns.push('summary');
    values.push(data.summary);
  }

  if (data.career_goal_id !== undefined) {
    columns.push('career_goal_id');
    values.push(data.career_goal_id);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.execute(
    `INSERT INTO learning_roadmaps (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  return {
    status: 'created',
    roadmap: await getRoadmapById(userId, result.insertId),
  };
}

async function updateRoadmap(userId, roadmapId, fields) {
  const existing = await getRoadmapRow(userId, roadmapId);
  if (!existing) return { status: 'not_found' };

  if (
    fields.career_goal_id !== undefined &&
    fields.career_goal_id !== null &&
    !(await careerGoalsService.getGoalById(userId, fields.career_goal_id))
  ) {
    return { status: 'goal_not_found' };
  }

  const columns = [];
  const values = [];

  for (const column of ROADMAP_UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    columns.push(`${column} = ?`);
    values.push(fields[column]);
  }

  if (columns.length) {
    values.push(roadmapId, userId);
    await pool.execute(
      `UPDATE learning_roadmaps
       SET ${columns.join(', ')}
       WHERE id = ? AND user_id = ?`,
      values
    );
  }

  return {
    status: 'updated',
    roadmap: await getRoadmapById(userId, roadmapId),
  };
}

async function deleteRoadmap(userId, roadmapId) {
  const [result] = await pool.execute(
    'DELETE FROM learning_roadmaps WHERE id = ? AND user_id = ?',
    [roadmapId, userId]
  );

  return result.affectedRows > 0;
}

async function getTaskForUser(userId, roadmapId, taskId) {
  const [rows] = await pool.execute(
    `SELECT ${TASK_COLUMNS.split(',')
      .map((column) => `t.${column.trim()}`)
      .join(', ')}
     FROM roadmap_tasks t
     JOIN learning_roadmaps r ON r.id = t.roadmap_id
     WHERE t.id = ? AND t.roadmap_id = ? AND r.user_id = ?`,
    [taskId, roadmapId, userId]
  );

  return rows[0] || null;
}

async function createTask(userId, roadmapId, data) {
  const roadmap = await getRoadmapRow(userId, roadmapId);
  if (!roadmap) return { status: 'roadmap_not_found' };

  let sortOrder = data.sort_order;

  if (sortOrder === undefined) {
    const [rows] = await pool.execute(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM roadmap_tasks WHERE roadmap_id = ?',
      [roadmapId]
    );
    sortOrder = Number(rows[0].next_order);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const columns = ['roadmap_id', 'title', 'status', 'sort_order'];
    const values = [roadmapId, data.title, data.status, sortOrder];

    for (const column of TASK_UPDATABLE_COLUMNS) {
      if (column === 'title' || column === 'sort_order' || column === 'status') {
        continue;
      }
      if (data[column] === undefined) continue;
      columns.push(column);
      values.push(data[column]);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await connection.execute(
      `INSERT INTO roadmap_tasks (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    if (data.status !== 'not_started') {
      await connection.execute(
        `INSERT INTO user_progress
           (user_id, roadmap_task_id, previous_status, new_status)
         VALUES (?, ?, NULL, ?)`,
        [userId, result.insertId, data.status]
      );
    }

    await connection.commit();

    return {
      status: 'created',
      task: await getTaskForUser(userId, roadmapId, result.insertId),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateTask(userId, roadmapId, taskId, fields) {
  const existing = await getTaskForUser(userId, roadmapId, taskId);
  if (!existing) return null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const columns = [];
    const values = [];

    for (const column of TASK_UPDATABLE_COLUMNS) {
      if (fields[column] === undefined) continue;
      columns.push(`${column} = ?`);
      values.push(fields[column]);
    }

    if (columns.length) {
      values.push(taskId, roadmapId);
      await connection.execute(
        `UPDATE roadmap_tasks
         SET ${columns.join(', ')}
         WHERE id = ? AND roadmap_id = ?`,
        values
      );
    }

    if (fields.status !== undefined && fields.status !== existing.status) {
      await connection.execute(
        `INSERT INTO user_progress
           (user_id, roadmap_task_id, previous_status, new_status)
         VALUES (?, ?, ?, ?)`,
        [userId, taskId, existing.status, fields.status]
      );
    }

    await connection.commit();

    return getTaskForUser(userId, roadmapId, taskId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteTask(userId, roadmapId, taskId) {
  const [result] = await pool.execute(
    `DELETE t
     FROM roadmap_tasks t
     JOIN learning_roadmaps r ON r.id = t.roadmap_id
     WHERE t.id = ? AND t.roadmap_id = ? AND r.user_id = ?`,
    [taskId, roadmapId, userId]
  );

  return result.affectedRows > 0;
}

// Creates a roadmap and all of its tasks in one transaction. Used by the AI
// generator so a failed insert never leaves half a plan in the database.
async function createRoadmapWithTasks(userId, data, tasks) {
  if (
    data.career_goal_id !== undefined &&
    data.career_goal_id !== null &&
    !(await careerGoalsService.getGoalById(userId, data.career_goal_id))
  ) {
    return { status: 'goal_not_found' };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roadmapResult] = await connection.execute(
      `INSERT INTO learning_roadmaps
         (user_id, title, summary, career_goal_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        data.title,
        data.summary ?? null,
        data.career_goal_id ?? null,
        data.status || 'active',
      ]
    );

    for (const task of tasks) {
      await connection.execute(
        `INSERT INTO roadmap_tasks
           (roadmap_id, title, description, skills_to_develop,
            learning_activities, practical_project, resources,
            estimated_duration, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roadmapResult.insertId,
          task.title,
          task.description ?? null,
          task.skills_to_develop ?? null,
          task.learning_activities ?? null,
          task.practical_project ?? null,
          task.resources ?? null,
          task.estimated_duration ?? null,
          task.sort_order ?? 0,
          task.status || 'not_started',
        ]
      );
    }

    await connection.commit();

    return {
      status: 'created',
      roadmap: await getRoadmapById(userId, roadmapResult.insertId),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  listRoadmaps,
  getRoadmapById,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
  createTask,
  updateTask,
  deleteTask,
  createRoadmapWithTasks,
};
