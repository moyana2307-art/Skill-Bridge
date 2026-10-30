const { pool } = require('../config/db');
const careerGoalsService = require('./careerGoals.service');
const notificationsService = require('./notifications.service');

const ROADMAP_SELECT = `SELECT r.id, r.user_id, r.career_goal_id, r.title, r.summary, r.status,
  r.created_at, r.updated_at, g.career_title,
  (SELECT COUNT(*) FROM roadmap_tasks t WHERE t.roadmap_id = r.id) AS task_count,
  (SELECT COUNT(*) FROM roadmap_tasks t WHERE t.roadmap_id = r.id AND t.status = 'completed') AS completed_task_count
  FROM learning_roadmaps r LEFT JOIN career_goals g ON g.id = r.career_goal_id`;
const TASK_COLUMNS = `id, roadmap_id, title, description, skills_to_develop, learning_activities,
  practical_project, resources, estimated_duration, sort_order, status, created_at, updated_at`;
const ROADMAP_UPDATABLE_COLUMNS = ['title','summary','career_goal_id','status'];
const TASK_UPDATABLE_COLUMNS = ['title','description','skills_to_develop','learning_activities','practical_project','resources','estimated_duration','sort_order','status'];

function mapRoadmap(row) {
  if (!row) return null;
  const taskCount = Number(row.task_count || 0);
  const completedTaskCount = Number(row.completed_task_count || 0);
  return { ...row, task_count: taskCount, completed_task_count: completedTaskCount,
    progress_percent: taskCount === 0 ? 0 : Math.round((completedTaskCount / taskCount) * 100) };
}

function placeholders(count, start = 1) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(', ');
}

async function listRoadmaps(userId, filters) {
  const conditions = ['r.user_id = $1']; const values = [userId];
  if (filters.status) { values.push(filters.status); conditions.push(`r.status = $${values.length}`); }
  if (filters.career_goal_id) { values.push(filters.career_goal_id); conditions.push(`r.career_goal_id = $${values.length}`); }
  const { rows } = await pool.query(`${ROADMAP_SELECT} WHERE ${conditions.join(' AND ')}
    ORDER BY CASE r.status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 WHEN 'archived' THEN 3 END,
    r.updated_at DESC, r.id DESC`, values);
  return rows.map(mapRoadmap);
}

async function getRoadmapRow(userId, roadmapId) {
  const { rows } = await pool.query(`${ROADMAP_SELECT} WHERE r.user_id = $1 AND r.id = $2`, [userId, roadmapId]);
  return mapRoadmap(rows[0]);
}

async function getRoadmapById(userId, roadmapId) {
  const roadmap = await getRoadmapRow(userId, roadmapId); if (!roadmap) return null;
  const { rows: tasks } = await pool.query(`SELECT ${TASK_COLUMNS} FROM roadmap_tasks
    WHERE roadmap_id = $1 ORDER BY sort_order ASC, id ASC`, [roadmapId]);
  return { ...roadmap, tasks };
}

async function createRoadmap(userId, data) {
  if (data.career_goal_id != null && !(await careerGoalsService.getGoalById(userId, data.career_goal_id))) return { status: 'goal_not_found' };
  const columns = ['user_id','title','status']; const values = [userId, data.title, data.status];
  if (data.summary !== undefined) { columns.push('summary'); values.push(data.summary); }
  if (data.career_goal_id !== undefined) { columns.push('career_goal_id'); values.push(data.career_goal_id); }
  const { rows } = await pool.query(`INSERT INTO learning_roadmaps (${columns.join(', ')}) VALUES (${placeholders(values.length)}) RETURNING id`, values);
  const roadmap = await getRoadmapById(userId, rows[0].id);
  await notificationsService.notify(userId, {
    type: 'roadmap',
    title: 'Learning roadmap created',
    body: `"${roadmap.title}" is ready. Start with the first task.`,
    link: '/roadmaps',
  });
  return { status: 'created', roadmap };
}

async function updateRoadmap(userId, roadmapId, fields) {
  if (!(await getRoadmapRow(userId, roadmapId))) return { status: 'not_found' };
  if (fields.career_goal_id != null && !(await careerGoalsService.getGoalById(userId, fields.career_goal_id))) return { status: 'goal_not_found' };
  const columns = []; const values = [];
  for (const column of ROADMAP_UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]); columns.push(`${column} = $${values.length}`);
  }
  if (columns.length) {
    values.push(roadmapId, userId);
    await pool.query(`UPDATE learning_roadmaps SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 1} AND user_id = $${values.length}`, values);
  }
  return { status: 'updated', roadmap: await getRoadmapById(userId, roadmapId) };
}

async function deleteRoadmap(userId, roadmapId) {
  const result = await pool.query('DELETE FROM learning_roadmaps WHERE id = $1 AND user_id = $2', [roadmapId, userId]);
  return result.rowCount > 0;
}

async function getTaskForUser(userId, roadmapId, taskId) {
  const { rows } = await pool.query(`SELECT t.id, t.roadmap_id, t.title, t.description, t.skills_to_develop,
    t.learning_activities, t.practical_project, t.resources, t.estimated_duration, t.sort_order, t.status,
    t.created_at, t.updated_at FROM roadmap_tasks t JOIN learning_roadmaps r ON r.id = t.roadmap_id
    WHERE t.id = $1 AND t.roadmap_id = $2 AND r.user_id = $3`, [taskId, roadmapId, userId]);
  return rows[0] || null;
}

async function createTask(userId, roadmapId, data) {
  if (!(await getRoadmapRow(userId, roadmapId))) return { status: 'roadmap_not_found' };
  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const { rows } = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM roadmap_tasks WHERE roadmap_id = $1', [roadmapId]);
    sortOrder = Number(rows[0].next_order);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const columns = ['roadmap_id','title','status','sort_order']; const values = [roadmapId, data.title, data.status, sortOrder];
    for (const column of TASK_UPDATABLE_COLUMNS) {
      if (['title','sort_order','status'].includes(column) || data[column] === undefined) continue;
      columns.push(column); values.push(data[column]);
    }
    const { rows } = await client.query(`INSERT INTO roadmap_tasks (${columns.join(', ')}) VALUES (${placeholders(values.length)}) RETURNING id`, values);
    const taskId = rows[0].id;
    if (data.status !== 'not_started') await client.query(`INSERT INTO user_progress (user_id, roadmap_task_id, previous_status, new_status) VALUES ($1,$2,NULL,$3)`, [userId, taskId, data.status]);
    await client.query('COMMIT');
    return { status: 'created', task: await getTaskForUser(userId, roadmapId, taskId) };
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function updateTask(userId, roadmapId, taskId, fields) {
  const existing = await getTaskForUser(userId, roadmapId, taskId); if (!existing) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); const columns = []; const values = [];
    for (const column of TASK_UPDATABLE_COLUMNS) {
      if (fields[column] === undefined) continue; values.push(fields[column]); columns.push(`${column} = $${values.length}`);
    }
    if (columns.length) {
      values.push(taskId, roadmapId);
      await client.query(`UPDATE roadmap_tasks SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length - 1} AND roadmap_id = $${values.length}`, values);
    }
    if (fields.status !== undefined && fields.status !== existing.status) await client.query(`INSERT INTO user_progress (user_id, roadmap_task_id, previous_status, new_status) VALUES ($1,$2,$3,$4)`, [userId, taskId, existing.status, fields.status]);
    await client.query('COMMIT');
    const task = await getTaskForUser(userId, roadmapId, taskId);
    if (fields.status === 'completed' && existing.status !== 'completed') {
      await notificationsService.notify(userId, {
        type: 'milestone',
        title: 'Milestone completed',
        body: `"${task.title}" is marked complete. Keep going.`,
        link: '/roadmaps',
      });
    }
    return task;
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function deleteTask(userId, roadmapId, taskId) {
  const result = await pool.query(`DELETE FROM roadmap_tasks t WHERE t.id = $1 AND t.roadmap_id = $2
    AND EXISTS (SELECT 1 FROM learning_roadmaps r WHERE r.id = t.roadmap_id AND r.user_id = $3)`, [taskId, roadmapId, userId]);
  return result.rowCount > 0;
}

async function createRoadmapWithTasks(userId, data, tasks) {
  if (data.career_goal_id != null && !(await careerGoalsService.getGoalById(userId, data.career_goal_id))) return { status: 'goal_not_found' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`INSERT INTO learning_roadmaps (user_id,title,summary,career_goal_id,status)
      VALUES ($1,$2,$3,$4,$5) RETURNING id`, [userId, data.title, data.summary ?? null, data.career_goal_id ?? null, data.status || 'active']);
    const roadmapId = rows[0].id;
    for (const task of tasks) await client.query(`INSERT INTO roadmap_tasks
      (roadmap_id,title,description,skills_to_develop,learning_activities,practical_project,resources,estimated_duration,sort_order,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [roadmapId, task.title, task.description ?? null, task.skills_to_develop ?? null,
      task.learning_activities ?? null, task.practical_project ?? null, task.resources ?? null, task.estimated_duration ?? null, task.sort_order ?? 0, task.status || 'not_started']);
    await client.query('COMMIT');
    const roadmap = await getRoadmapById(userId, roadmapId);
    await notificationsService.notify(userId, {
      type: 'roadmap',
      title: 'New learning roadmap ready',
      body: `"${roadmap.title}" has ${tasks.length} tasks to work through.`,
      link: '/roadmaps',
    });
    return { status: 'created', roadmap };
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

module.exports = { listRoadmaps, getRoadmapById, createRoadmap, updateRoadmap, deleteRoadmap,
  createTask, updateTask, deleteTask, createRoadmapWithTasks };
