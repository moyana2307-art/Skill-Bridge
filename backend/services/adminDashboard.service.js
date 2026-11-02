const { pool } = require('../config/db');
const { env } = require('../config/env');
const { toNumber, ratio, netCents } = require('../utils/metrics');

function moneyPeriod(grossCents, refundsCents) {
  return {
    gross_cents: toNumber(grossCents),
    refunds_cents: toNumber(refundsCents),
    net_cents: netCents(grossCents, refundsCents),
  };
}

function dayKey(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function dashboard(database = pool) {
  const timezone = env.reporting.timezone;
  const [
    usersResult,
    subscriptionsResult,
    revenueResult,
    mrrResult,
    featuresResult,
    signupsResult,
    revenueSeriesResult,
    revenueByPlanResult,
    institutionsResult,
    activityResult,
    recentUsersResult,
    planRequestsResult,
  ] = await Promise.all([
    database.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
         COUNT(*) FILTER (WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::int AS active_last_7_days,
         COUNT(*) FILTER (WHERE last_active_at >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS active_last_30_days,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE $1)::date = (CURRENT_TIMESTAMP AT TIME ZONE $1)::date
         )::int AS new_today,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS new_last_24_hours,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::int AS new_last_7_days,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS new_last_30_days,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE $1) >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS new_this_week,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS new_this_month,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE $1) >= date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS new_this_year
       FROM users`,
      [timezone]
    ),
    database.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (
           WHERE plan_code <> 'free'
             AND status IN ('active', 'trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS active_entitled,
         COUNT(*) FILTER (
           WHERE source = 'payment'
             AND plan_code IN ('plus', 'premium')
             AND status IN ('active', 'trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS paid_active,
         COUNT(*) FILTER (
           WHERE plan_code = 'plus'
             AND status IN ('active', 'trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS plus_active,
         COUNT(*) FILTER (
           WHERE plan_code = 'premium'
             AND status IN ('active', 'trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS premium_active,
         COUNT(*) FILTER (
           WHERE plan_code = 'institution'
             AND status IN ('active', 'trialing')
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS institution_active,
         COUNT(*) FILTER (
           WHERE status = 'trialing'
             AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
         )::int AS trialing,
         COUNT(*) FILTER (WHERE status = 'past_due')::int AS past_due,
         COUNT(*) FILTER (WHERE status = 'canceled')::int AS canceled,
         COUNT(*) FILTER (
           WHERE status = 'expired'
             OR (
               status IN ('active', 'trialing')
               AND current_period_end IS NOT NULL
               AND current_period_end <= CURRENT_TIMESTAMP
             )
         )::int AS expired
       FROM subscriptions`
    ),
    database.query(
      `SELECT
         COUNT(*)::int AS transaction_count,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS successful_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count,
         COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed_count,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint AS pending_amount_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS lifetime_gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
         ), 0)::bigint AS lifetime_refunds_cents,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS lifetime_net_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed')
             AND paid_at IS NOT NULL
             AND (paid_at AT TIME ZONE $1)::date = (CURRENT_TIMESTAMP AT TIME ZONE $1)::date
         ), 0)::bigint AS today_gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
             AND refunded_at IS NOT NULL
             AND (refunded_at AT TIME ZONE $1)::date = (CURRENT_TIMESTAMP AT TIME ZONE $1)::date
         ), 0)::bigint AS today_refunds_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed')
             AND paid_at IS NOT NULL
             AND (paid_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         ), 0)::bigint AS this_month_gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
             AND refunded_at IS NOT NULL
             AND (refunded_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         ), 0)::bigint AS this_month_refunds_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed')
             AND paid_at IS NOT NULL
             AND (paid_at AT TIME ZONE $1) >= date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE $1)
         ), 0)::bigint AS this_year_gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
             AND refunded_at IS NOT NULL
             AND (refunded_at AT TIME ZONE $1) >= date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE $1)
         ), 0)::bigint AS this_year_refunds_cents,
         COALESCE(SUM(amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed')
             AND paid_at IS NOT NULL
             AND paid_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
         ), 0)::bigint AS last_30_days_gross_cents,
         COALESCE(SUM(refunded_amount_cents) FILTER (
           WHERE refunded_amount_cents > 0
             AND refunded_at IS NOT NULL
             AND refunded_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
         ), 0)::bigint AS last_30_days_refunds_cents,
         COUNT(DISTINCT user_id) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed') AND paid_at IS NOT NULL
         )::int AS paying_users,
         COALESCE(MAX(currency), 'USD') AS currency,
         COUNT(DISTINCT currency)::int AS currency_count
       FROM payment_records`,
      [timezone]
    ),
    database.query(
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
    database.query(
      `SELECT
         (SELECT COUNT(*) FROM career_goals)::int AS career_goals_total,
         (SELECT COUNT(*) FROM career_goals WHERE status = 'active')::int AS career_goals_active,
         (SELECT COUNT(*) FROM learning_roadmaps)::int AS roadmaps_total,
         (SELECT COUNT(*) FROM learning_roadmaps WHERE status = 'completed')::int AS roadmaps_completed,
         (SELECT COUNT(*) FROM learning_roadmaps WHERE status = 'active')::int AS roadmaps_active,
         (SELECT COUNT(*) FROM roadmap_tasks)::int AS roadmap_tasks_total,
         (SELECT COUNT(*) FROM roadmap_tasks WHERE status = 'completed')::int AS roadmap_tasks_completed,
         (SELECT COUNT(*) FROM projects)::int AS projects_total,
         (SELECT COUNT(*) FROM projects WHERE status = 'completed')::int AS projects_completed,
         (SELECT AVG(score) FROM projects WHERE score IS NOT NULL) AS projects_average_score,
         (SELECT COUNT(*) FROM applications)::int AS applications_total,
         (SELECT COUNT(*) FROM applications WHERE status IN ('applied', 'interviewing', 'offer'))::int AS applications_active,
         (SELECT COUNT(*) FROM ai_analyses)::int AS ai_analyses_total,
         (SELECT COUNT(*) FROM career_assessments)::int AS career_assessments_total,
         (SELECT COUNT(*) FROM career_assessments
           WHERE (created_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS career_assessments_this_month,
         (SELECT COUNT(*) FROM mentor_threads)::int AS mentor_threads_total,
         (SELECT COUNT(*) FROM mentor_threads
           WHERE (created_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS mentor_threads_this_month,
         (SELECT COUNT(*) FROM mentor_messages m
           JOIN mentor_threads t ON t.id = m.thread_id
           WHERE m.role = 'user'
         )::int AS mentor_messages_total,
         (SELECT COUNT(*) FROM mentor_messages m
           JOIN mentor_threads t ON t.id = m.thread_id
           WHERE m.role = 'user'
             AND (m.created_at AT TIME ZONE $1) >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $1)
         )::int AS mentor_messages_this_month,
         (SELECT COUNT(*) FROM cv_documents)::int AS cv_documents_total,
         (SELECT COUNT(*) FROM cover_letters)::int AS cover_letters_total,
         (SELECT COUNT(*) FROM mock_interviews)::int AS mock_interviews_total,
         (SELECT COUNT(*) FROM mock_interviews WHERE status = 'completed')::int AS mock_interviews_completed,
         (SELECT COUNT(*) FROM saved_opportunities)::int AS opportunity_saves_total,
         (SELECT COUNT(*) FROM activity_logs WHERE event_type = 'opportunity.viewed')::int AS opportunity_views_total,
         (SELECT COUNT(*) FROM opportunities)::int AS opportunities_total,
         (SELECT COUNT(*) FROM opportunities WHERE is_active)::int AS opportunities_active,
         (SELECT COUNT(*) FROM learning_resources)::int AS learning_resources_total,
         (SELECT COUNT(*) FROM learning_resources WHERE is_active)::int AS learning_resources_active,
         (SELECT COUNT(*) FROM notifications)::int AS notifications_total,
         (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE)::int AS notifications_unread`,
      [timezone]
    ),
    database.query(
      `WITH bounds AS (
         SELECT date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $1) AS today
       ),
       days AS (
         SELECT generate_series(today - INTERVAL '13 days', today, INTERVAL '1 day') AS day
         FROM bounds
       )
       SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date, COUNT(u.id)::int AS count
       FROM days d
       LEFT JOIN users u
         ON (u.created_at AT TIME ZONE $1) >= d.day
        AND (u.created_at AT TIME ZONE $1) < d.day + INTERVAL '1 day'
       GROUP BY d.day
       ORDER BY d.day ASC`,
      [timezone]
    ),
    database.query(
      `WITH bounds AS (
         SELECT date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $1) AS today
       ),
       days AS (
         SELECT generate_series(today - INTERVAL '13 days', today, INTERVAL '1 day') AS day
         FROM bounds
       ),
       gross AS (
         SELECT (paid_at AT TIME ZONE $1)::date AS day, SUM(amount_cents)::bigint AS gross_cents
         FROM payment_records
         WHERE paid_at IS NOT NULL
           AND status IN ('paid', 'refunded', 'disputed')
         GROUP BY 1
       ),
       refunds AS (
         SELECT (refunded_at AT TIME ZONE $1)::date AS day,
           SUM(refunded_amount_cents)::bigint AS refunds_cents
         FROM payment_records
         WHERE refunded_at IS NOT NULL
           AND refunded_amount_cents > 0
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
      [timezone]
    ),
    database.query(
      `SELECT COALESCE(plan_code, 'unknown') AS plan_code,
         COUNT(*) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed') AND paid_at IS NOT NULL
         )::int AS payments,
         COALESCE(SUM(amount_cents - refunded_amount_cents) FILTER (
           WHERE status IN ('paid', 'refunded', 'disputed') AND paid_at IS NOT NULL
         ), 0)::bigint AS net_cents
       FROM payment_records
       GROUP BY COALESCE(plan_code, 'unknown')
       ORDER BY net_cents DESC, plan_code ASC`
    ),
    database.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
         (SELECT COUNT(*) FROM institution_members WHERE status = 'active')::int AS active_members
       FROM institutions`
    ),
    database.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS last_24_hours,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::int AS last_7_days
       FROM activity_logs`
    ),
    database.query(
      `SELECT id, name, email, role, status, last_active_at, created_at FROM users
       ORDER BY created_at DESC, id DESC LIMIT 8`
    ),
    database.query('SELECT COUNT(*)::int AS pending FROM plan_requests WHERE status = $1', [
      'pending',
    ]),
  ]);

  const users = usersResult.rows[0];
  const subscriptions = subscriptionsResult.rows[0];
  const revenue = revenueResult.rows[0];
  const features = featuresResult.rows[0];
  const totalUsers = toNumber(users.total);
  const activeEntitled = toNumber(subscriptions.active_entitled);
  const freeUsers = Math.max(0, totalUsers - activeEntitled);
  const payingUsers = toNumber(revenue.paying_users);
  const lifetimeNet = toNumber(revenue.lifetime_net_cents);
  const today = moneyPeriod(revenue.today_gross_cents, revenue.today_refunds_cents);
  const thisMonth = moneyPeriod(
    revenue.this_month_gross_cents,
    revenue.this_month_refunds_cents
  );
  const thisYear = moneyPeriod(
    revenue.this_year_gross_cents,
    revenue.this_year_refunds_cents
  );
  const lifetime = moneyPeriod(
    revenue.lifetime_gross_cents,
    revenue.lifetime_refunds_cents
  );
  const last30Days = moneyPeriod(
    revenue.last_30_days_gross_cents,
    revenue.last_30_days_refunds_cents
  );
  const roadmapTasksTotal = toNumber(features.roadmap_tasks_total);
  const roadmapTasksCompleted = toNumber(features.roadmap_tasks_completed);

  return {
    users: {
      total: totalUsers,
      admins: toNumber(users.admins),
      suspended: toNumber(users.suspended),
      free_users: freeUsers,
      premium_subscribers:
        toNumber(subscriptions.plus_active) + toNumber(subscriptions.premium_active),
      paid_subscribers: toNumber(subscriptions.paid_active),
      active_last_7_days: toNumber(users.active_last_7_days),
      active_last_30_days: toNumber(users.active_last_30_days),
      new_today: toNumber(users.new_today),
      new_last_24_hours: toNumber(users.new_last_24_hours),
      new_last_7_days: toNumber(users.new_last_7_days),
      new_last_30_days: toNumber(users.new_last_30_days),
      new_this_week: toNumber(users.new_this_week),
      new_this_month: toNumber(users.new_this_month),
      new_this_year: toNumber(users.new_this_year),
    },
    subscriptions: {
      total: toNumber(subscriptions.total),
      free: freeUsers,
      plus: toNumber(subscriptions.plus_active),
      premium: toNumber(subscriptions.premium_active),
      institution: toNumber(subscriptions.institution_active),
      active: activeEntitled,
      paid_active: toNumber(subscriptions.paid_active),
      premium_subscribers:
        toNumber(subscriptions.plus_active) + toNumber(subscriptions.premium_active),
      trialing: toNumber(subscriptions.trialing),
      past_due: toNumber(subscriptions.past_due),
      canceled: toNumber(subscriptions.canceled),
      expired: toNumber(subscriptions.expired),
      pending_requests: toNumber(planRequestsResult.rows[0]?.pending),
    },
    revenue: {
      currency: revenue.currency || 'USD',
      currency_count: toNumber(revenue.currency_count, 1),
      today,
      this_month: thisMonth,
      this_year: thisYear,
      lifetime,
      last_30_days: last30Days,
      mrr_cents: toNumber(mrrResult.rows[0]?.mrr_cents),
      arppu_cents: payingUsers ? Math.round(lifetimeNet / payingUsers) : 0,
      paying_users: payingUsers,
      transaction_count: toNumber(revenue.transaction_count),
      pending_count: toNumber(revenue.pending_count),
      successful_count: toNumber(revenue.successful_count),
      failed_count: toNumber(revenue.failed_count),
      cancelled_count: toNumber(revenue.cancelled_count),
      refunded_count: toNumber(revenue.refunded_count),
      disputed_count: toNumber(revenue.disputed_count),
      pending_amount_cents: toNumber(revenue.pending_amount_cents),
      conversion_rate: ratio(payingUsers, totalUsers, 4),
      revenue_by_plan: revenueByPlanResult.rows.map((row) => ({
        plan_code: row.plan_code,
        payments: toNumber(row.payments),
        net_cents: toNumber(row.net_cents),
      })),
    },
    payments: {
      paid_count: toNumber(revenue.successful_count),
      pending_count: toNumber(revenue.pending_count),
      failed_count: toNumber(revenue.failed_count),
      refunded_count: toNumber(revenue.refunded_count),
      paid_total_cents: lifetimeNet,
      paid_last_30_days_cents: last30Days.net_cents,
      currency: revenue.currency || 'USD',
    },
    feature_usage: {
      career_assessments: {
        total: toNumber(features.career_assessments_total),
        this_month: toNumber(features.career_assessments_this_month),
      },
      mentor: {
        sessions_total: toNumber(features.mentor_threads_total),
        sessions_this_month: toNumber(features.mentor_threads_this_month),
        messages_total: toNumber(features.mentor_messages_total),
        messages_this_month: toNumber(features.mentor_messages_this_month),
      },
      roadmaps: {
        total: toNumber(features.roadmaps_total),
        active: toNumber(features.roadmaps_active),
        completed: toNumber(features.roadmaps_completed),
      },
      cv_documents: toNumber(features.cv_documents_total),
      cover_letters: toNumber(features.cover_letters_total),
      mock_interviews: {
        total: toNumber(features.mock_interviews_total),
        completed: toNumber(features.mock_interviews_completed),
      },
      opportunities: {
        total: toNumber(features.opportunities_total),
        active: toNumber(features.opportunities_active),
        saves: toNumber(features.opportunity_saves_total),
        views: toNumber(features.opportunity_views_total),
      },
      applications: {
        total: toNumber(features.applications_total),
        active: toNumber(features.applications_active),
      },
      projects: {
        total: toNumber(features.projects_total),
        completed: toNumber(features.projects_completed),
        average_score:
          features.projects_average_score === null
            ? null
            : Math.round(Number(features.projects_average_score)),
      },
      ai_analyses: toNumber(features.ai_analyses_total),
      learning_resources: {
        total: toNumber(features.learning_resources_total),
        active: toNumber(features.learning_resources_active),
      },
      notifications: {
        total: toNumber(features.notifications_total),
        unread: toNumber(features.notifications_unread),
      },
    },
    career_goals: {
      total: toNumber(features.career_goals_total),
      active: toNumber(features.career_goals_active),
    },
    roadmaps: {
      total: toNumber(features.roadmaps_total),
      completed: toNumber(features.roadmaps_completed),
      tasks_total: roadmapTasksTotal,
      tasks_completed: roadmapTasksCompleted,
      task_completion_percent: roadmapTasksTotal
        ? Math.round((roadmapTasksCompleted / roadmapTasksTotal) * 100)
        : 0,
    },
    projects: {
      total: toNumber(features.projects_total),
      completed: toNumber(features.projects_completed),
      average_score:
        features.projects_average_score === null
          ? null
          : Math.round(Number(features.projects_average_score)),
    },
    applications: {
      total: toNumber(features.applications_total),
      active: toNumber(features.applications_active),
    },
    opportunities: {
      total: toNumber(features.opportunities_total),
      active: toNumber(features.opportunities_active),
    },
    learning_resources: {
      total: toNumber(features.learning_resources_total),
      active: toNumber(features.learning_resources_active),
    },
    ai_analyses: toNumber(features.ai_analyses_total),
    mock_interviews: {
      total: toNumber(features.mock_interviews_total),
      completed: toNumber(features.mock_interviews_completed),
    },
    institutions: {
      total: toNumber(institutionsResult.rows[0].total),
      active: toNumber(institutionsResult.rows[0].active),
      pending: toNumber(institutionsResult.rows[0].pending),
      suspended: toNumber(institutionsResult.rows[0].suspended),
      active_members: toNumber(institutionsResult.rows[0].active_members),
    },
    activity: {
      total: toNumber(activityResult.rows[0].total),
      last_24_hours: toNumber(activityResult.rows[0].last_24_hours),
      last_7_days: toNumber(activityResult.rows[0].last_7_days),
    },
    growth: {
      signups_last_14_days: signupsResult.rows.map((row) => ({
        date: dayKey(row.date),
        count: toNumber(row.count),
      })),
      revenue_last_14_days: revenueSeriesResult.rows.map((row) => ({
        date: dayKey(row.date),
        gross_cents: toNumber(row.gross_cents),
        refunds_cents: toNumber(row.refunds_cents),
        net_cents: toNumber(row.net_cents),
      })),
    },
    signups_last_14_days: signupsResult.rows.map((row) => ({
      date: dayKey(row.date),
      count: toNumber(row.count),
    })),
    recent_users: recentUsersResult.rows,
    generated_at: new Date().toISOString(),
    timezone,
  };
}

module.exports = { dashboard };
