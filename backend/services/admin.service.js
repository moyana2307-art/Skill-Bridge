// Admin-only platform management and usage analytics.
const { pool } = require('../config/db');
const { escapeLike } = require('../utils/sql');
const ApiError = require('../utils/ApiError');
const subscriptionsService = require('./subscriptions.service');
const institutionsService = require('./institutions.service');

function dayKey(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function overview() {
  const [
    usersResult,
    newUsersResult,
    goalsResult,
    roadmapsResult,
    tasksResult,
    projectsResult,
    applicationsResult,
    opportunitiesResult,
    resourcesResult,
    analysesResult,
    interviewsResult,
    signupsResult,
    recentUsersResult,
    paymentsResult,
    activityResult,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE role = 'admin') AS admins,
         COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
         COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days') AS active_7_days,
         COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_30_days
       FROM users`
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24_hours,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7_days,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30_days
       FROM users`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM career_goals`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed FROM learning_roadmaps`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed FROM roadmap_tasks`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         AVG(score) FILTER (WHERE score IS NOT NULL) AS average_score FROM projects`
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status IN ('applied','interviewing','offer')) AS active
       FROM applications`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM opportunities`
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM learning_resources`
    ),
    pool.query('SELECT COUNT(*) AS total FROM ai_analyses'),
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM mock_interviews`
    ),
    pool.query(
      `SELECT TO_CHAR(day, 'YYYY-MM-DD') AS day, COUNT(u.id) AS count
       FROM generate_series(
         CURRENT_DATE - INTERVAL '13 days',
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS day
       LEFT JOIN users u
         ON u.created_at >= day
        AND u.created_at < day + INTERVAL '1 day'
       GROUP BY day
       ORDER BY day ASC`
    ),
    pool.query(
      `SELECT id, name, email, role, status, last_active_at, created_at FROM users
       ORDER BY created_at DESC, id DESC LIMIT 8`
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
         COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_count,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0) AS paid_total_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days'
         ), 0) AS paid_last_30_days_cents,
         COALESCE(MAX(currency), 'USD') AS currency
       FROM payment_records`
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24_hours,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7_days
       FROM activity_logs`
    ),
  ]);

  const users = usersResult.rows[0];
  const newUsers = newUsersResult.rows[0];
  const tasks = tasksResult.rows[0];
  const payments = paymentsResult.rows[0];
  const activity = activityResult.rows[0];

  const [subscriptionStats, institutionCount] = await Promise.all([
    subscriptionsService.adminStats(),
    pool.query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
         (SELECT COUNT(*) FROM institution_members WHERE status = 'active') AS active_members
       FROM institutions`
    ),
  ]);

  const institutions = institutionCount.rows[0];

  return {
    users: {
      total: Number(users.total),
      admins: Number(users.admins),
      suspended: Number(users.suspended),
      active_last_7_days: Number(users.active_7_days),
      active_last_30_days: Number(users.active_30_days),
      new_last_24_hours: Number(newUsers.last_24_hours),
      new_last_7_days: Number(newUsers.last_7_days),
      new_last_30_days: Number(newUsers.last_30_days),
    },
    career_goals: {
      total: Number(goalsResult.rows[0].total),
      active: Number(goalsResult.rows[0].active),
    },
    roadmaps: {
      total: Number(roadmapsResult.rows[0].total),
      completed: Number(roadmapsResult.rows[0].completed),
      tasks_total: Number(tasks.total),
      tasks_completed: Number(tasks.completed),
      task_completion_percent: Number(tasks.total)
        ? Math.round((Number(tasks.completed) / Number(tasks.total)) * 100)
        : 0,
    },
    projects: {
      total: Number(projectsResult.rows[0].total),
      completed: Number(projectsResult.rows[0].completed),
      average_score:
        projectsResult.rows[0].average_score === null
          ? null
          : Math.round(Number(projectsResult.rows[0].average_score)),
    },
    applications: {
      total: Number(applicationsResult.rows[0].total),
      active: Number(applicationsResult.rows[0].active),
    },
    opportunities: {
      total: Number(opportunitiesResult.rows[0].total),
      active: Number(opportunitiesResult.rows[0].active),
    },
    learning_resources: {
      total: Number(resourcesResult.rows[0].total),
      active: Number(resourcesResult.rows[0].active),
    },
    ai_analyses: Number(analysesResult.rows[0].total),
    mock_interviews: {
      total: Number(interviewsResult.rows[0].total),
      completed: Number(interviewsResult.rows[0].completed),
    },
    subscriptions: subscriptionStats,
    payments: {
      paid_count: Number(payments.paid_count),
      pending_count: Number(payments.pending_count),
      failed_count: Number(payments.failed_count),
      refunded_count: Number(payments.refunded_count),
      paid_total_cents: Number(payments.paid_total_cents),
      paid_last_30_days_cents: Number(payments.paid_last_30_days_cents),
      currency: payments.currency || 'USD',
    },
    institutions: {
      total: Number(institutions.total),
      active: Number(institutions.active),
      pending: Number(institutions.pending),
      suspended: Number(institutions.suspended),
      active_members: Number(institutions.active_members),
    },
    activity: {
      last_24_hours: Number(activity.last_24_hours),
      last_7_days: Number(activity.last_7_days),
    },
    signups_last_14_days: signupsResult.rows.map((row) => ({
      date: dayKey(row.day),
      count: Number(row.count),
    })),
    recent_users: recentUsersResult.rows,
    generated_at: new Date().toISOString(),
  };
}

async function listUsers({ search, role, page, limit }) {
  const conditions = [];
  const values = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    values.push(like, like);
    conditions.push(`(u.name ILIKE $${values.length - 1} ESCAPE '\\' OR u.email ILIKE $${values.length} ESCAPE '\\')`);
  }
  if (role) {
    values.push(role);
    conditions.push(`u.role = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.last_login_at, u.last_active_at,
       u.created_at,
       COALESCE((SELECT s.plan_code FROM subscriptions s WHERE s.user_id = u.id), 'free') AS plan_code,
       COALESCE((SELECT p.name FROM subscriptions s
         JOIN subscription_plans p ON p.code = s.plan_code
         WHERE s.user_id = u.id), 'Free') AS plan_name,
       (SELECT COUNT(*) FROM user_skills us WHERE us.user_id = u.id) AS skill_count,
       (SELECT COUNT(*) FROM career_goals g WHERE g.user_id = u.id) AS goal_count,
       (SELECT COUNT(*) FROM learning_roadmaps r WHERE r.user_id = u.id) AS roadmap_count,
       (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS project_count,
       (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS application_count
     FROM users u ${where}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    countValues
  );

  return {
    users: rows.map((row) => ({
      ...row,
      skill_count: Number(row.skill_count),
      goal_count: Number(row.goal_count),
      roadmap_count: Number(row.roadmap_count),
      project_count: Number(row.project_count),
      application_count: Number(row.application_count),
    })),
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function updateUser(adminId, userId, fields) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
    [userId]
  );
  const existing = rows[0];
  if (!existing) return null;

  if (fields.role && String(userId) === String(adminId) && fields.role !== existing.role) {
    throw ApiError.badRequest('You cannot change your own admin role.');
  }

  const columns = [];
  const values = [];

  for (const column of ['name', 'role']) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  let user = existing;
  if (columns.length) {
    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length} RETURNING id, name, email, role, created_at`,
      values
    );
    user = result.rows[0];
  }

  if (fields.plan_code !== undefined) {
    await subscriptionsService.assignPlan(userId, fields.plan_code, {
      source: 'admin',
      status: 'active',
      actorUserId: adminId,
      eventType: 'admin_assigned',
    });
  }

  const { rows: planRows } = await pool.query(
    `SELECT COALESCE(s.plan_code, 'free') AS plan_code,
       COALESCE(p.name, 'Free') AS plan_name
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     LEFT JOIN subscription_plans p ON p.code = s.plan_code
     WHERE u.id = $1`,
    [userId]
  );

  return {
    user: {
      ...user,
      plan_code: planRows[0]?.plan_code || 'free',
      plan_name: planRows[0]?.plan_name || 'Free',
    },
    before: existing,
  };
}

async function deleteUser(adminId, userId) {
  if (String(adminId) === String(userId)) {
    throw ApiError.badRequest('You cannot delete your own account here.');
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
    [userId]
  );
  const existing = rows[0] || null;
  if (!existing) return { deleted: false, before: null };

  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  return { deleted: rowCount > 0, before: existing };
}

async function listSubscriptions(query) {
  return subscriptionsService.listSubscriptions(query);
}

async function listPlanRequests(query) {
  return subscriptionsService.listPlanRequests(query);
}

async function reviewPlanRequest(adminId, requestId, status) {
  return subscriptionsService.reviewPlanRequest(adminId, requestId, status);
}

async function listInstitutions(query) {
  return institutionsService.listAllInstitutions(query);
}

async function updateInstitution(institutionId, fields) {
  return institutionsService.adminUpdateInstitution(institutionId, fields);
}

module.exports = {
  overview,
  listUsers,
  updateUser,
  deleteUser,
  listSubscriptions,
  listPlanRequests,
  reviewPlanRequest,
  listInstitutions,
  updateInstitution,
};
