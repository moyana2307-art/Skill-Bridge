// Admin control-centre reporting: users, activity, finance, subscriptions,
// analytics, audit logs, and export rows. Every figure is derived from real
// database records. Pending/failed payments are never counted as revenue.
const { pool } = require('../config/db');
const { env } = require('../config/env');
const { escapeLike } = require('../utils/sql');
const { toNumber, ratio, netCents } = require('../utils/metrics');
const ApiError = require('../utils/ApiError');

const REPORT_TZ = String(env.reporting.timezone || 'UTC').replace(/'/g, "''");
const MAX_EXPORT_ROWS = 50000;

function todayInTimezone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.reporting.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function resolveRange({ range = '30d', from, to } = {}) {
  const today = todayInTimezone();
  if (from || to) {
    return {
      from: from || addDays(today, -29),
      to: to || today,
      range: 'custom',
    };
  }
  if (range === 'today') return { from: today, to: today, range };
  if (range === '90d') return { from: addDays(today, -89), to: today, range };
  if (range === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today, range };
  if (range === '7d') return { from: addDays(today, -6), to: today, range };
  return { from: addDays(today, -29), to: today, range: range === 'custom' ? '30d' : range };
}

function previousRange({ from, to }) {
  const length = daysBetween(from, to) + 1;
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(length - 1));
  return { from: previousFrom, to: previousTo };
}

function dateClause(column, from, to, params) {
  const clauses = [];
  if (from) {
    params.push(from);
    clauses.push(`(${column} AT TIME ZONE '${REPORT_TZ}')::date >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    clauses.push(`(${column} AT TIME ZONE '${REPORT_TZ}')::date <= $${params.length}::date`);
  }
  return clauses;
}

function moneyPeriod(grossCents, refundsCents) {
  return {
    gross_cents: toNumber(grossCents),
    refunds_cents: toNumber(refundsCents),
    net_cents: netCents(grossCents, refundsCents),
  };
}

function monthKeys(startDate, endDate) {
  const keys = [];
  const cursor = new Date(`${startDate.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${endDate.slice(0, 7)}-01T00:00:00Z`);
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function weekKey(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

function summariseRegistrations(daily) {
  const weeklyMap = new Map();
  const monthlyMap = new Map();
  daily.forEach((row) => {
    const week = weekKey(row.date);
    weeklyMap.set(week, (weeklyMap.get(week) || 0) + row.count);
    const month = row.date.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + row.count);
  });
  return {
    daily,
    weekly: [...weeklyMap.entries()].map(([date, count]) => ({ date, count })),
    monthly: [...monthlyMap.entries()].map(([month, count]) => ({ month, count })),
  };
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

function userFilters(query, params) {
  const { search, role, status, plan, from, to } = query;
  const conditions = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    params.push(like, like);
    conditions.push(
      `(u.name ILIKE $${params.length - 1} ESCAPE '\\' OR u.email ILIKE $${params.length} ESCAPE '\\')`
    );
  }
  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (plan === 'free') {
    conditions.push(`(s.plan_code IS NULL OR s.plan_code = 'free')`);
  } else if (plan) {
    params.push(plan);
    conditions.push(`s.plan_code = $${params.length}`);
  }
  conditions.push(...dateClause('u.created_at', from, to, params));

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

const USER_COLUMNS = `u.id, u.name, u.email, u.role, u.status, u.suspended_at,
  u.suspension_reason, u.last_login_at, u.last_active_at, u.created_at,
  COALESCE(s.plan_code, 'free') AS plan_code,
  COALESCE(p.name, 'Free') AS plan_name,
  COALESCE(s.status, 'active') AS subscription_status,
  COALESCE(s.source, 'none') AS subscription_source,
  (SELECT COUNT(*) FROM career_assessments ca WHERE ca.user_id = u.id)::int AS career_assessment_count,
  (SELECT COUNT(*) FROM user_skills us WHERE us.user_id = u.id)::int AS skill_count,
  (SELECT COUNT(*) FROM career_goals cg WHERE cg.user_id = u.id)::int AS goal_count,
  (SELECT COUNT(*) FROM learning_roadmaps lr WHERE lr.user_id = u.id)::int AS roadmap_count,
  (SELECT COUNT(*) FROM cv_documents cd WHERE cd.user_id = u.id)::int AS cv_count,
  (SELECT COUNT(*) FROM projects pr WHERE pr.user_id = u.id)::int AS project_count,
  (SELECT COUNT(*) FROM projects pr WHERE pr.user_id = u.id AND pr.status = 'completed')::int AS projects_completed,
  (SELECT COUNT(*) FROM applications ap WHERE ap.user_id = u.id)::int AS application_count,
  (SELECT COUNT(*) FROM payment_records pay
    WHERE pay.user_id = u.id AND pay.status IN ('paid','refunded','disputed')
      AND pay.paid_at IS NOT NULL)::int AS payment_count,
  (SELECT COALESCE(SUM(pay.amount_cents - pay.refunded_amount_cents), 0)
    FROM payment_records pay
    WHERE pay.user_id = u.id AND pay.status IN ('paid','refunded','disputed')
      AND pay.paid_at IS NOT NULL)::bigint AS amount_paid_cents,
  (
    (SELECT COUNT(*) FROM mentor_messages mm
      JOIN mentor_threads mt ON mt.id = mm.thread_id
      WHERE mt.user_id = u.id AND mm.role = 'user')
    + (SELECT COUNT(*) FROM ai_analyses aa WHERE aa.user_id = u.id)
    + (SELECT COUNT(*) FROM career_assessments ca2 WHERE ca2.user_id = u.id)
  )::int AS ai_interaction_count`;

async function listUsers(query) {
  const { page = 1, limit = 20 } = query;
  const params = [];
  const where = userFilters(query, params);
  const countParams = [...params];
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT ${USER_COLUMNS}
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN subscription_plans p ON p.code = s.plan_code
       ${where}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       ${where}`,
      countParams
    ),
  ]);

  return {
    users: rowsResult.rows.map((row) => ({
      ...row,
      amount_paid_cents: toNumber(row.amount_paid_cents),
      ai_interaction_count: toNumber(row.ai_interaction_count),
    })),
    total: toNumber(countResult.rows[0]?.total),
    page,
    limit,
  };
}

async function getUserDetail(userId) {
  const userResult = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.suspended_at,
       u.suspension_reason, u.last_login_at, u.last_active_at,
       u.created_at, u.updated_at,
       p.education_level, p.work_experience, p.career_interests, p.location,
       p.learning_preferences, p.portfolio_slug, p.portfolio_headline,
       p.portfolio_about, p.portfolio_public
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  const [
    subscription,
    subscriptionHistory,
    payments,
    assessments,
    skills,
    roadmaps,
    mentorThreads,
    mentorStats,
    cvs,
    coverLetters,
    interviews,
    savedOpportunities,
    applications,
    projects,
    notifications,
    activities,
    stats,
  ] = await Promise.all([
    pool.query(
      `SELECT s.*, p.name AS plan_name, p.price_cents AS plan_price_cents,
         p.currency AS plan_currency, p.billing_interval AS plan_billing_interval
       FROM subscriptions s
       JOIN subscription_plans p ON p.code = s.plan_code
       WHERE s.user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT e.*, fp.name AS from_plan_name, tp.name AS to_plan_name
       FROM subscription_events e
       LEFT JOIN subscription_plans fp ON fp.code = e.from_plan_code
       LEFT JOIN subscription_plans tp ON tp.code = e.to_plan_code
       WHERE e.user_id = $1
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT pr.id, pr.plan_code, p.name AS plan_name, pr.amount_cents,
         pr.refunded_amount_cents, pr.currency, pr.provider,
         pr.provider_reference, pr.status, pr.paid_at, pr.refunded_at,
         pr.failed_at, pr.failure_reason, pr.created_at
       FROM payment_records pr
       LEFT JOIN subscription_plans p ON p.code = pr.plan_code
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC, pr.id DESC
       LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT id, model, result, created_at
       FROM career_assessments
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 20`,
      [userId]
    ),
    pool.query(
      `SELECT us.id, us.proficiency, us.created_at, s.name, s.category
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY us.created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT r.id, r.title, r.status, r.created_at, r.updated_at,
         COUNT(t.id)::int AS task_count,
         COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS completed_tasks
       FROM learning_roadmaps r
       LEFT JOIN roadmap_tasks t ON t.roadmap_id = r.id
       WHERE r.user_id = $1
       GROUP BY r.id
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT 30`,
      [userId]
    ),
    pool.query(
      `SELECT t.id, t.title, t.created_at, t.updated_at,
         COUNT(m.id)::int AS message_count
       FROM mentor_threads t
       LEFT JOIN mentor_messages m ON m.thread_id = t.id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.updated_at DESC, t.id DESC
       LIMIT 20`,
      [userId]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM mentor_threads WHERE user_id = $1)::int AS thread_count,
         (SELECT COUNT(*) FROM mentor_messages m
           JOIN mentor_threads t ON t.id = m.thread_id
           WHERE t.user_id = $1 AND m.role = 'user')::int AS message_count`,
      [userId]
    ),
    pool.query(
      `SELECT id, title, is_primary, created_at, updated_at
       FROM cv_documents WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT 30`,
      [userId]
    ),
    pool.query(
      `SELECT id, title, opportunity_id, created_at, updated_at
       FROM cover_letters WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT 30`,
      [userId]
    ),
    pool.query(
      `SELECT i.id, i.role AS target_role, i.interview_type, i.status,
         i.created_at, i.completed_at,
         COUNT(a.id)::int AS answer_count,
         ROUND(AVG(a.score))::int AS average_score
       FROM mock_interviews i
       LEFT JOIN interview_answers a ON a.interview_id = i.id
       WHERE i.user_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT 30`,
      [userId]
    ),
    pool.query(
      `SELECT so.saved_at, o.id, o.title, o.organisation, o.opportunity_type
       FROM saved_opportunities so
       JOIN opportunities o ON o.id = so.opportunity_id
       WHERE so.user_id = $1
       ORDER BY so.saved_at DESC, so.id DESC
       LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT id, title, organisation, status, applied_at, deadline, created_at, updated_at
       FROM applications WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT id, title, status, score, submitted_at, completed_at, created_at, updated_at
       FROM projects WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC, id DESC LIMIT 50`,
      [userId]
    ),
    pool.query(
      `SELECT id, event_type, entity_type, entity_id, title, metadata,
         ip_address, created_at
       FROM activity_logs WHERE user_id = $1
       ORDER BY created_at DESC, id DESC LIMIT 100`,
      [userId]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM career_assessments WHERE user_id = $1)::int AS career_assessments,
         (SELECT COUNT(*) FROM learning_roadmaps WHERE user_id = $1)::int AS roadmaps,
         (SELECT COUNT(*) FROM roadmap_tasks t
           JOIN learning_roadmaps r ON r.id = t.roadmap_id
           WHERE r.user_id = $1 AND t.status = 'completed')::int AS roadmap_tasks_completed,
         (SELECT COUNT(*) FROM cv_documents WHERE user_id = $1)::int AS cvs,
         (SELECT COUNT(*) FROM cover_letters WHERE user_id = $1)::int AS cover_letters,
         (SELECT COUNT(*) FROM mock_interviews WHERE user_id = $1)::int AS interviews,
         (SELECT COUNT(*) FROM saved_opportunities WHERE user_id = $1)::int AS saved_opportunities,
         (SELECT COUNT(*) FROM applications WHERE user_id = $1)::int AS applications,
         (SELECT COUNT(*) FROM projects WHERE user_id = $1)::int AS projects,
         (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND status = 'completed')::int AS projects_completed,
         (SELECT COUNT(*) FROM payment_records WHERE user_id = $1)::int AS payments,
         (SELECT COALESCE(SUM(amount_cents - refunded_amount_cents), 0)
           FROM payment_records
           WHERE user_id = $1 AND status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL)::bigint AS amount_paid_cents`,
      [userId]
    ),
  ]);

  const statsRow = stats.rows[0] || {};
  return {
    user,
    subscription: subscription.rows[0] || null,
    subscription_history: subscriptionHistory.rows,
    payment_history: payments.rows,
    career_assessments: assessments.rows,
    skills: skills.rows,
    learning_roadmaps: roadmaps.rows.map((row) => ({
      ...row,
      task_count: toNumber(row.task_count),
      completed_tasks: toNumber(row.completed_tasks),
    })),
    mentor: {
      thread_count: toNumber(mentorStats.rows[0]?.thread_count),
      message_count: toNumber(mentorStats.rows[0]?.message_count),
      threads: mentorThreads.rows.map((row) => ({
        ...row,
        message_count: toNumber(row.message_count),
      })),
    },
    cvs: cvs.rows,
    cover_letters: coverLetters.rows,
    interviews: interviews.rows.map((row) => ({
      ...row,
      answer_count: toNumber(row.answer_count),
    })),
    saved_opportunities: savedOpportunities.rows,
    applications: applications.rows,
    projects: projects.rows,
    notifications: notifications.rows,
    activities: activities.rows,
    stats: {
      ...statsRow,
      amount_paid_cents: toNumber(statsRow.amount_paid_cents),
    },
  };
}

async function getUserActivities(userId, { page = 1, limit = 20, from, to } = {}) {
  const params = [userId];
  const conditions = ['user_id = $1'];
  conditions.push(...dateClause('created_at', from, to, params));
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  const listParams = [...params, limit, offset];

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT id, user_id, event_type, entity_type, entity_id, title, metadata,
         ip_address, created_at
       FROM activity_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM activity_logs ${where}`, params),
  ]);

  return {
    activities: rows.rows,
    total: toNumber(count.rows[0]?.total),
    page,
    limit,
  };
}

async function suspendUser(adminId, userId, reason = null) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, status FROM users WHERE id = $1',
    [userId]
  );
  const existing = rows[0];
  if (!existing) return null;
  if (String(userId) === String(adminId)) {
    throw ApiError.badRequest('You cannot suspend your own account.');
  }
  if (existing.role === 'admin') {
    throw ApiError.badRequest('Administrator accounts cannot be suspended here.');
  }

  const updated = await pool.query(
    `UPDATE users
     SET status = 'suspended', suspended_at = CURRENT_TIMESTAMP,
         suspended_by = $1, suspension_reason = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, name, email, role, status, suspended_at, suspension_reason`,
    [adminId, reason, userId]
  );
  return { user: updated.rows[0], before: existing };
}

async function reactivateUser(adminId, userId) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, status FROM users WHERE id = $1',
    [userId]
  );
  const existing = rows[0];
  if (!existing) return null;

  const updated = await pool.query(
    `UPDATE users
     SET status = 'active', suspended_at = NULL, suspended_by = NULL,
         suspension_reason = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, status, suspended_at, suspension_reason`,
    [userId]
  );
  return { user: updated.rows[0], before: existing };
}

/* -------------------------------------------------------------------------- */
/* Financial overview                                                          */
/* -------------------------------------------------------------------------- */

async function financialOverview(query = {}) {
  const range = resolveRange(query);
  const params = [range.from, range.to];

  const [
    lifetimeResult,
    rangeResult,
    mrrResult,
    planResult,
    providerResult,
    dailyResult,
    monthlyResult,
    yearlyResult,
    subscriptionSeriesResult,
    mixResult,
  ] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
         ), 0)::bigint AS refunds_cents,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count,
         COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed_count,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint AS pending_amount_cents,
         COUNT(DISTINCT user_id) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS paying_users,
         COALESCE(MAX(currency), 'USD') AS currency,
         COUNT(DISTINCT currency)::int AS currency_count
       FROM payment_records`
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
         ), 0)::bigint AS refunds_cents,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents,
         COUNT(DISTINCT user_id) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS paying_users,
         COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count,
         COUNT(*) FILTER (WHERE status IN ('paid','refunded','disputed'))::int AS successful_count
       FROM payment_records
       WHERE (paid_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date`,
      params
    ),
    pool.query(
      `SELECT COALESCE(SUM(
         CASE s.billing_interval
           WHEN 'year' THEN COALESCE(NULLIF(s.amount_cents, 0), p.price_cents, 0)::numeric / 12
           WHEN 'none' THEN 0
           ELSE COALESCE(NULLIF(s.amount_cents, 0), p.price_cents, 0)
         END
       ), 0)::bigint AS mrr_cents
       FROM subscriptions s
       JOIN subscription_plans p ON p.code = s.plan_code
       WHERE s.source = 'payment'
         AND s.plan_code IN ('plus', 'premium')
         AND s.status IN ('active', 'trialing')
         AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)`
    ),
    pool.query(
      `SELECT COALESCE(plan_code, 'unknown') AS plan_code,
         COUNT(*) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS payments,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents
       FROM payment_records
       GROUP BY COALESCE(plan_code, 'unknown')
       ORDER BY net_cents DESC, plan_code ASC`
    ),
    pool.query(
      `SELECT COALESCE(provider, 'unknown') AS provider,
         COUNT(*) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS payments,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents
       FROM payment_records
       GROUP BY COALESCE(provider, 'unknown')
       ORDER BY net_cents DESC, provider ASC`
    ),
    pool.query(
      `WITH days AS (
         SELECT generate_series($1::date, $2::date, INTERVAL '1 day') AS day
       ),
       gross AS (
         SELECT (paid_at AT TIME ZONE '${REPORT_TZ}')::date AS day,
           SUM(amount_cents)::bigint AS gross_cents
         FROM payment_records
         WHERE paid_at IS NOT NULL AND status IN ('paid','refunded','disputed')
           AND (paid_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date
         GROUP BY 1
       ),
       refunds AS (
         SELECT (refunded_at AT TIME ZONE '${REPORT_TZ}')::date AS day,
           SUM(refunded_amount_cents)::bigint AS refunds_cents
         FROM payment_records
         WHERE refunded_at IS NOT NULL AND refunded_amount_cents > 0
           AND (refunded_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date
         GROUP BY 1
       )
       SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
         COALESCE(g.gross_cents, 0)::bigint AS gross_cents,
         COALESCE(r.refunds_cents, 0)::bigint AS refunds_cents,
         (COALESCE(g.gross_cents, 0) - COALESCE(r.refunds_cents, 0))::bigint AS net_cents
       FROM days d
       LEFT JOIN gross g ON g.day = d.day::date
       LEFT JOIN refunds r ON r.day = d.day::date
       ORDER BY d.day ASC`,
      params
    ),
    pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')) - INTERVAL '11 months',
           date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')),
           INTERVAL '1 month'
         ) AS month
       ),
       gross AS (
         SELECT date_trunc('month', (paid_at AT TIME ZONE '${REPORT_TZ}')) AS month,
           SUM(amount_cents)::bigint AS gross_cents
         FROM payment_records
         WHERE paid_at IS NOT NULL AND status IN ('paid','refunded','disputed')
         GROUP BY 1
       ),
       refunds AS (
         SELECT date_trunc('month', (refunded_at AT TIME ZONE '${REPORT_TZ}')) AS month,
           SUM(refunded_amount_cents)::bigint AS refunds_cents
         FROM payment_records
         WHERE refunded_at IS NOT NULL AND refunded_amount_cents > 0
         GROUP BY 1
       )
       SELECT TO_CHAR(m.month, 'YYYY-MM') AS month,
         COALESCE(g.gross_cents, 0)::bigint AS gross_cents,
         COALESCE(r.refunds_cents, 0)::bigint AS refunds_cents,
         (COALESCE(g.gross_cents, 0) - COALESCE(r.refunds_cents, 0))::bigint AS net_cents
       FROM months m
       LEFT JOIN gross g ON g.month = m.month
       LEFT JOIN refunds r ON r.month = m.month
       ORDER BY m.month ASC`
    ),
    pool.query(
      `WITH years AS (
         SELECT generate_series(
           date_trunc('year', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')) - INTERVAL '4 years',
           date_trunc('year', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')),
           INTERVAL '1 year'
         ) AS year
       ),
       gross AS (
         SELECT date_trunc('year', (paid_at AT TIME ZONE '${REPORT_TZ}')) AS year,
           SUM(amount_cents)::bigint AS gross_cents
         FROM payment_records
         WHERE paid_at IS NOT NULL AND status IN ('paid','refunded','disputed')
         GROUP BY 1
       ),
       refunds AS (
         SELECT date_trunc('year', (refunded_at AT TIME ZONE '${REPORT_TZ}')) AS year,
           SUM(refunded_amount_cents)::bigint AS refunds_cents
         FROM payment_records
         WHERE refunded_at IS NOT NULL AND refunded_amount_cents > 0
         GROUP BY 1
       )
       SELECT TO_CHAR(y.year, 'YYYY') AS year,
         COALESCE(g.gross_cents, 0)::bigint AS gross_cents,
         COALESCE(r.refunds_cents, 0)::bigint AS refunds_cents,
         (COALESCE(g.gross_cents, 0) - COALESCE(r.refunds_cents, 0))::bigint AS net_cents
       FROM years y
       LEFT JOIN gross g ON g.year = y.year
       LEFT JOIN refunds r ON r.year = y.year
       ORDER BY y.year ASC`
    ),
    pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')) - INTERVAL '11 months',
           date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE '${REPORT_TZ}')),
           INTERVAL '1 month'
         ) AS month
       ),
       new_subs AS (
         SELECT date_trunc('month', (created_at AT TIME ZONE '${REPORT_TZ}')) AS month,
           COUNT(*)::int AS new_count
         FROM subscriptions
         WHERE plan_code IN ('plus','premium')
         GROUP BY 1
       ),
       cancelled AS (
         SELECT date_trunc('month', (canceled_at AT TIME ZONE '${REPORT_TZ}')) AS month,
           COUNT(*)::int AS cancelled_count
         FROM subscriptions
         WHERE canceled_at IS NOT NULL
         GROUP BY 1
       )
       SELECT TO_CHAR(m.month, 'YYYY-MM') AS month,
         COALESCE(n.new_count, 0)::int AS new_count,
         COALESCE(c.cancelled_count, 0)::int AS cancelled_count
       FROM months m
       LEFT JOIN new_subs n ON n.month = m.month
       LEFT JOIN cancelled c ON c.month = m.month
       ORDER BY m.month ASC`
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE s.plan_code IN ('plus','premium')
             AND s.status IN ('active','trialing')
             AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
         )::int AS premium,
         COUNT(*) FILTER (
           WHERE s.plan_code = 'institution'
             AND s.status IN ('active','trialing')
             AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
         )::int AS institution
       FROM subscriptions s`
    ),
  ]);

  const lifetime = lifetimeResult.rows[0];
  const rangeRevenue = rangeResult.rows[0];
  const mrrCents = toNumber(mrrResult.rows[0]?.mrr_cents);
  const payingUsers = toNumber(lifetime.paying_users);
  const totalUsers = toNumber(
    (await pool.query('SELECT COUNT(*)::int AS total FROM users')).rows[0]?.total
  );
  const premiumActive = toNumber(mixResult.rows[0]?.premium);
  const institutionActive = toNumber(mixResult.rows[0]?.institution);

  return {
    currency: lifetime.currency || 'USD',
    currency_count: toNumber(lifetime.currency_count, 1),
    range,
    lifetime: moneyPeriod(lifetime.gross_cents, lifetime.refunds_cents),
    selected_range: moneyPeriod(rangeRevenue.gross_cents, rangeRevenue.refunds_cents),
    mrr_cents: mrrCents,
    paying_users: payingUsers,
    arppu_cents: payingUsers
      ? Math.round(toNumber(lifetime.net_cents) / payingUsers)
      : 0,
    transaction_counts: {
      total: toNumber(lifetime.pending_count) + toNumber(lifetime.paid_count) +
        toNumber(lifetime.failed_count) + toNumber(lifetime.cancelled_count) +
        toNumber(lifetime.refunded_count) + toNumber(lifetime.disputed_count),
      pending: toNumber(lifetime.pending_count),
      successful: toNumber(lifetime.paid_count),
      failed: toNumber(lifetime.failed_count),
      cancelled: toNumber(lifetime.cancelled_count),
      refunded: toNumber(lifetime.refunded_count),
      disputed: toNumber(lifetime.disputed_count),
      pending_amount_cents: toNumber(lifetime.pending_amount_cents),
    },
    range_transaction_counts: {
      successful: toNumber(rangeRevenue.successful_count),
      refunded: toNumber(rangeRevenue.refunded_count),
    },
    revenue_by_plan: planResult.rows.map((row) => ({
      plan_code: row.plan_code,
      payments: toNumber(row.payments),
      net_cents: toNumber(row.net_cents),
    })),
    revenue_by_provider: providerResult.rows.map((row) => ({
      provider: row.provider,
      payments: toNumber(row.payments),
      net_cents: toNumber(row.net_cents),
    })),
    series: {
      daily: dailyResult.rows.map((row) => ({
        date: row.date,
        gross_cents: toNumber(row.gross_cents),
        refunds_cents: toNumber(row.refunds_cents),
        net_cents: toNumber(row.net_cents),
      })),
      monthly: monthlyResult.rows.map((row) => ({
        month: row.month,
        gross_cents: toNumber(row.gross_cents),
        refunds_cents: toNumber(row.refunds_cents),
        net_cents: toNumber(row.net_cents),
      })),
      yearly: yearlyResult.rows.map((row) => ({
        year: row.year,
        gross_cents: toNumber(row.gross_cents),
        refunds_cents: toNumber(row.refunds_cents),
        net_cents: toNumber(row.net_cents),
      })),
      subscriptions: subscriptionSeriesResult.rows.map((row) => ({
        month: row.month,
        new_count: toNumber(row.new_count),
        cancelled_count: toNumber(row.cancelled_count),
      })),
    },
    subscription_mix: {
      free: Math.max(0, totalUsers - premiumActive - institutionActive),
      premium: premiumActive,
      institution: institutionActive,
      total_users: totalUsers,
    },
    definitions: {
      revenue: 'Verified successful payments minus completed refunds; pending and failed payments are excluded.',
      mrr: 'Active payment-source Plus/Premium subscriptions normalized to a monthly amount. Yearly plans are divided by 12 and one-time plans are excluded.',
      arppu: 'Lifetime net revenue divided by distinct users with at least one verified successful payment.',
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

function transactionFilters(query, params, { alias = 'pr' } = {}) {
  const { search, status, plan, provider, from, to } = query;
  const conditions = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    params.push(like, like, like, like);
    conditions.push(
      `(${alias}.provider_reference ILIKE $${params.length - 3} ESCAPE '\\'
        OR ${alias}.provider_transaction_id ILIKE $${params.length - 2} ESCAPE '\\'
        OR u.name ILIKE $${params.length - 1} ESCAPE '\\'
        OR u.email ILIKE $${params.length} ESCAPE '\\')`
    );
  }
  if (status) {
    params.push(status);
    conditions.push(`${alias}.status = $${params.length}`);
  }
  if (plan) {
    params.push(plan);
    conditions.push(`${alias}.plan_code = $${params.length}`);
  }
  if (provider) {
    params.push(provider);
    conditions.push(`${alias}.provider = $${params.length}`);
  }
  conditions.push(...dateClause(`${alias}.created_at`, from, to, params));

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

const TRANSACTION_COLUMNS = `pr.id, pr.user_id, u.name AS user_name, u.email AS user_email,
  pr.plan_code, p.name AS plan_name, pr.amount_cents, pr.refunded_amount_cents,
  pr.currency, pr.provider, pr.provider_reference, pr.provider_transaction_id,
  pr.status, pr.paid_at, pr.refunded_at, pr.failed_at, pr.failure_reason,
  pr.subscription_id, pr.created_at, pr.updated_at`;

async function listTransactions(query) {
  const { page = 1, limit = 20 } = query;
  const params = [];
  const where = transactionFilters(query, params);
  const countParams = [...params];
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${TRANSACTION_COLUMNS}
       FROM payment_records pr
       LEFT JOIN users u ON u.id = pr.user_id
       LEFT JOIN subscription_plans p ON p.code = pr.plan_code
       ${where}
       ORDER BY pr.created_at DESC, pr.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payment_records pr
       LEFT JOIN users u ON u.id = pr.user_id
       ${where}`,
      countParams
    ),
  ]);

  return {
    transactions: rows.rows.map((row) => ({
      ...row,
      amount_cents: toNumber(row.amount_cents),
      refunded_amount_cents: toNumber(row.refunded_amount_cents),
    })),
    total: toNumber(count.rows[0]?.total),
    page,
    limit,
  };
}

async function getTransaction(transactionId) {
  const { rows } = await pool.query(
    `SELECT ${TRANSACTION_COLUMNS}, pr.metadata
     FROM payment_records pr
     LEFT JOIN users u ON u.id = pr.user_id
     LEFT JOIN subscription_plans p ON p.code = pr.plan_code
     WHERE pr.id = $1`,
    [transactionId]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    amount_cents: toNumber(rows[0].amount_cents),
    refunded_amount_cents: toNumber(rows[0].refunded_amount_cents),
  };
}

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                               */
/* -------------------------------------------------------------------------- */

const SUBSCRIPTION_COLUMNS = `s.id, s.user_id, u.name AS user_name, u.email AS user_email,
  s.plan_code, p.name AS plan_name, s.status, s.source, s.institution_id,
  s.amount_cents, s.currency, s.billing_interval, s.started_at,
  s.current_period_start, s.current_period_end, s.canceled_at, s.cancel_reason,
  s.created_at, s.updated_at,
  (SELECT pr.status FROM payment_records pr
    WHERE pr.subscription_id = s.id
    ORDER BY pr.created_at DESC, pr.id DESC LIMIT 1) AS latest_payment_status`;

function subscriptionFilters(query, params) {
  const { search, plan, status, expiring, from, to } = query;
  const conditions = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    params.push(like, like);
    conditions.push(
      `(u.name ILIKE $${params.length - 1} ESCAPE '\\' OR u.email ILIKE $${params.length} ESCAPE '\\')`
    );
  }
  if (plan) {
    params.push(plan);
    conditions.push(`s.plan_code = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }
  if (expiring) {
    conditions.push(
      `s.status IN ('active','trialing') AND s.current_period_end IS NOT NULL
       AND s.current_period_end BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '30 days'`
    );
  }
  conditions.push(...dateClause('s.created_at', from, to, params));

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

async function listSubscriptions(query) {
  const { page = 1, limit = 20 } = query;
  const params = [];
  const where = subscriptionFilters(query, params);
  const countParams = [...params];
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${SUBSCRIPTION_COLUMNS}
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       JOIN subscription_plans p ON p.code = s.plan_code
       ${where}
       ORDER BY s.updated_at DESC, s.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ${where}`,
      countParams
    ),
  ]);

  return {
    subscriptions: rows.rows.map((row) => ({
      ...row,
      amount_cents: toNumber(row.amount_cents),
    })),
    total: toNumber(count.rows[0]?.total),
    page,
    limit,
  };
}

async function getSubscription(subscriptionId) {
  const { rows } = await pool.query(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     JOIN subscription_plans p ON p.code = s.plan_code
     WHERE s.id = $1`,
    [subscriptionId]
  );
  if (!rows[0]) return null;

  const [payments, events] = await Promise.all([
    pool.query(
      `SELECT id, plan_code, amount_cents, refunded_amount_cents, currency,
         provider, provider_reference, status, paid_at, refunded_at, created_at
       FROM payment_records
       WHERE subscription_id = $1 OR (user_id = $2 AND plan_code = $3)
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [subscriptionId, rows[0].user_id, rows[0].plan_code]
    ),
    pool.query(
      `SELECT id, event_type, from_plan_code, to_plan_code, from_status,
         to_status, source, amount_cents, currency, created_at
       FROM subscription_events
       WHERE subscription_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [subscriptionId]
    ),
  ]);

  return {
    subscription: {
      ...rows[0],
      amount_cents: toNumber(rows[0].amount_cents),
    },
    payments: payments.rows.map((row) => ({
      ...row,
      amount_cents: toNumber(row.amount_cents),
      refunded_amount_cents: toNumber(row.refunded_amount_cents),
    })),
    events: events.rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

async function analytics(query = {}) {
  const range = resolveRange(query);
  const previous = previousRange(range);
  const currentParams = [range.from, range.to];
  const previousParams = [previous.from, previous.to];

  const [
    usersResult,
    activityResult,
    featureResult,
    revenueResult,
    previousRevenueResult,
    subscriptionResult,
    registrationsResult,
    payingSeriesResult,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date
         )::int AS new_users,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $3::date AND $4::date
         )::int AS previous_new_users,
         COUNT(*) FILTER (WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS active_30d,
         COUNT(*) FILTER (
           WHERE last_active_at IS NULL OR last_active_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
         )::int AS inactive_30d,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
       FROM users`,
      [...currentParams, ...previousParams]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS events,
         COUNT(DISTINCT a.user_id)::int AS active_users,
         COUNT(DISTINCT a.user_id) FILTER (
           WHERE u.id IS NOT NULL
             AND (u.created_at AT TIME ZONE '${REPORT_TZ}')::date < $1::date
         )::int AS returning_users
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE (a.created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date`,
      currentParams
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM career_assessments
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS career_assessments,
         (SELECT COUNT(*) FROM mentor_messages m
           JOIN mentor_threads t ON t.id = m.thread_id
           WHERE m.role = 'user'
             AND (m.created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS mentor_messages,
         (SELECT COUNT(*) FROM learning_roadmaps
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS roadmaps,
         (SELECT COUNT(*) FROM cv_documents
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS cvs,
         (SELECT COUNT(*) FROM cover_letters
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS cover_letters,
         (SELECT COUNT(*) FROM mock_interviews
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS interviews,
         (SELECT COUNT(*) FROM saved_opportunities
           WHERE (saved_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS saved_opportunities,
         (SELECT COUNT(*) FROM applications
           WHERE (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS applications,
         (SELECT COUNT(*) FROM projects
           WHERE submitted_at IS NOT NULL
             AND (submitted_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS projects_submitted,
         (SELECT COUNT(*) FROM activity_logs
           WHERE event_type = 'opportunity.viewed'
             AND (created_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date)::int AS opportunity_views`,
      currentParams
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
         ), 0)::bigint AS refunds_cents,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents,
         COUNT(DISTINCT user_id) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS paying_users,
         COUNT(*) FILTER (WHERE status IN ('paid','refunded','disputed'))::int AS successful_count,
         COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count
       FROM payment_records
       WHERE (paid_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date`,
      currentParams
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents,
         COUNT(DISTINCT user_id) FILTER (
           WHERE status IN ('paid','refunded','disputed') AND paid_at IS NOT NULL
         )::int AS paying_users
       FROM payment_records
       WHERE (paid_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date`,
      previousParams
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_subscriptions,
         COUNT(*) FILTER (
           WHERE plan_code IN ('plus','premium')
             AND status IN ('active','trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS paid_active,
         COUNT(*) FILTER (
           WHERE plan_code = 'institution'
             AND status IN ('active','trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS institution_active,
         COUNT(*) FILTER (WHERE status = 'canceled')::int AS canceled,
         COUNT(*) FILTER (
           WHERE status = 'expired'
             OR (status IN ('active','trialing') AND current_period_end IS NOT NULL
               AND current_period_end <= CURRENT_TIMESTAMP)
         )::int AS expired
       FROM subscriptions`
    ),
    pool.query(
      `WITH days AS (
         SELECT generate_series($1::date, $2::date, INTERVAL '1 day') AS day
       )
       SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date, COUNT(u.id)::int AS count
       FROM days d
       LEFT JOIN users u
         ON (u.created_at AT TIME ZONE '${REPORT_TZ}')::date = d.day::date
       GROUP BY d.day
       ORDER BY d.day ASC`,
      currentParams
    ),
    pool.query(
      `WITH days AS (
         SELECT generate_series($1::date, $2::date, INTERVAL '1 day') AS day
       ),
       paying AS (
         SELECT (paid_at AT TIME ZONE '${REPORT_TZ}')::date AS day,
           COUNT(DISTINCT user_id)::int AS paying_users
         FROM payment_records
         WHERE paid_at IS NOT NULL AND status IN ('paid','refunded','disputed')
           AND (paid_at AT TIME ZONE '${REPORT_TZ}')::date BETWEEN $1::date AND $2::date
         GROUP BY 1
       )
       SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
         COALESCE(p.paying_users, 0)::int AS paying_users
       FROM days d
       LEFT JOIN paying p ON p.day = d.day::date
       ORDER BY d.day ASC`,
      currentParams
    ),
  ]);

  const users = usersResult.rows[0];
  const activity = activityResult.rows[0];
  const features = featureResult.rows[0];
  const revenue = revenueResult.rows[0];
  const previousRevenue = previousRevenueResult.rows[0];
  const subscriptions = subscriptionResult.rows[0];
  const totalUsers = toNumber(users.total);
  const paidActive = toNumber(subscriptions.paid_active);
  const successful = toNumber(revenue.successful_count);
  const refunded = toNumber(revenue.refunded_count);

  const daily = registrationsResult.rows.map((row) => ({
    date: row.date,
    count: toNumber(row.count),
  }));

  return {
    range,
    previous_range: previous,
    users: {
      total: totalUsers,
      new: toNumber(users.new_users),
      previous_new: toNumber(users.previous_new_users),
      active_30d: toNumber(users.active_30d),
      inactive_30d: toNumber(users.inactive_30d),
      suspended: toNumber(users.suspended),
      active_users_in_range: toNumber(activity.active_users),
      returning_users_in_range: toNumber(activity.returning_users),
      events_in_range: toNumber(activity.events),
      activated_rate: ratio(totalUsers - toNumber(users.inactive_30d), totalUsers, 4),
      active_rate_30d: ratio(users.active_30d, totalUsers, 4),
    },
    registrations: summariseRegistrations(daily),
    feature_usage: {
      career_assessments: toNumber(features.career_assessments),
      mentor_messages: toNumber(features.mentor_messages),
      roadmaps: toNumber(features.roadmaps),
      cvs: toNumber(features.cvs),
      cover_letters: toNumber(features.cover_letters),
      interviews: toNumber(features.interviews),
      saved_opportunities: toNumber(features.saved_opportunities),
      applications: toNumber(features.applications),
      projects_submitted: toNumber(features.projects_submitted),
      opportunity_views: toNumber(features.opportunity_views),
    },
    business: {
      revenue: moneyPeriod(revenue.gross_cents, revenue.refunds_cents),
      previous_revenue_net_cents: toNumber(previousRevenue.net_cents),
      paying_users: toNumber(revenue.paying_users),
      previous_paying_users: toNumber(previousRevenue.paying_users),
      paid_active_subscriptions: paidActive,
      canceled_subscriptions: toNumber(subscriptions.canceled),
      expired_subscriptions: toNumber(subscriptions.expired),
      free_to_premium_conversion: ratio(paidActive, totalUsers, 4),
      subscription_conversion_rate: ratio(paidActive, toNumber(subscriptions.total_subscriptions), 4),
      cancellation_rate: ratio(subscriptions.canceled, subscriptions.total_subscriptions, 4),
      refund_rate: ratio(refunded, successful + refunded, 4),
    },
    paying_user_series: payingSeriesResult.rows.map((row) => ({
      date: row.date,
      paying_users: toNumber(row.paying_users),
    })),
    definitions: {
      active_user: 'A user is active when last_active_at is within the last 30 days. Presence is updated by authenticated API requests, not by account existence.',
      returning_user: 'A user who registered before the selected range started but recorded at least one activity during the range.',
      free_to_premium_conversion: 'Active paid Plus/Premium subscriptions divided by total registered users.',
      subscription_conversion_rate: 'Active paid Plus/Premium subscriptions divided by all subscription rows.',
      cancellation_rate: 'Cancelled subscriptions divided by all subscription rows.',
      refund_rate: 'Refunded payments divided by refunded plus successful payments in the selected range.',
      revenue: 'Verified successful payments minus completed refunds. Pending and failed payments are excluded.',
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Audit logs                                                                  */
/* -------------------------------------------------------------------------- */

async function listAuditLogs(query = {}) {
  const { page = 1, limit = 20, action, search, admin_id: adminId, from, to } = query;
  const params = [];
  const conditions = [];

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (adminId) {
    params.push(adminId);
    conditions.push(`admin_user_id = $${params.length}`);
  }
  if (search) {
    const like = `%${escapeLike(search)}%`;
    params.push(like, like, like);
    conditions.push(
      `(admin_name ILIKE $${params.length - 2} ESCAPE '\\'
        OR action ILIKE $${params.length - 1} ESCAPE '\\'
        OR target_label ILIKE $${params.length} ESCAPE '\\')`
    );
  }
  conditions.push(...dateClause('created_at', from, to, params));

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT id, admin_user_id, admin_name, action, target_type, target_id,
         target_label, before_data, after_data, metadata, ip_address, user_agent,
         created_at
       FROM admin_audit_logs
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM admin_audit_logs ${where}`, countParams),
  ]);

  return {
    logs: rows.rows,
    total: toNumber(count.rows[0]?.total),
    page,
    limit,
  };
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                     */
/* -------------------------------------------------------------------------- */

async function exportUsers(query = {}) {
  const result = await listUsers({ ...query, page: 1, limit: MAX_EXPORT_ROWS });
  return result.users;
}

async function exportTransactions(query = {}) {
  const result = await listTransactions({ ...query, page: 1, limit: MAX_EXPORT_ROWS });
  return result.transactions;
}

async function exportSubscriptions(query = {}) {
  const result = await listSubscriptions({ ...query, page: 1, limit: MAX_EXPORT_ROWS });
  return result.subscriptions;
}

module.exports = {
  resolveRange,
  listUsers,
  getUserDetail,
  getUserActivities,
  suspendUser,
  reactivateUser,
  financialOverview,
  listTransactions,
  getTransaction,
  listSubscriptions,
  getSubscription,
  analytics,
  listAuditLogs,
  exportUsers,
  exportTransactions,
  exportSubscriptions,
};
