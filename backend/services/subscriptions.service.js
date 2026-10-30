// Subscription and entitlement logic. Plans are defined in config/plans.js;
// this service resolves a user's effective plan, measures monthly usage, and
// enforces feature gates.
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const notificationsService = require('./notifications.service');
const {
  PLANS,
  FEATURES,
  FEATURE_LABELS,
  LIMIT_SOURCES,
  getPlan,
  getPlanByRank,
  planForRank,
  nextPlan,
} = require('../config/plans');

const SUBSCRIPTION_SELECT = `SELECT s.id, s.user_id, s.plan_code, s.status, s.source,
  s.institution_id, s.started_at, s.current_period_end, s.canceled_at,
  s.created_at, s.updated_at, i.name AS institution_name, i.slug AS institution_slug
  FROM subscriptions s
  LEFT JOIN institutions i ON i.id = s.institution_id`;

const PLAN_LIST = Object.values(PLANS).sort((a, b) => a.sort_order - b.sort_order);

function publicPlan(plan) {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price_cents: plan.price_cents,
    currency: plan.currency,
    billing_interval: plan.billing_interval,
    rank: plan.rank,
    recommended: Boolean(plan.recommended),
    feature_list: plan.feature_list,
    limits: plan.limits,
  };
}

function getPlans() {
  return PLAN_LIST.map(publicPlan);
}

function isSubscriptionUsable(subscription) {
  if (!subscription) return false;
  if (!['active', 'trialing'].includes(subscription.status)) return false;
  if (
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() < Date.now()
  ) {
    return false;
  }
  return true;
}

async function getSubscriptionRow(userId) {
  const { rows } = await pool.query(
    `${SUBSCRIPTION_SELECT} WHERE s.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function getSubscription(userId) {
  const row = await getSubscriptionRow(userId);
  if (!isSubscriptionUsable(row)) return null;

  // Institution plans only apply while the membership is active.
  if (row.source === 'institution' && row.institution_id) {
    const { rows } = await pool.query(
      `SELECT 1 FROM institution_members m
       JOIN institutions i ON i.id = m.institution_id
       WHERE m.institution_id = $1 AND m.user_id = $2
         AND m.status = 'active' AND i.status = 'active'`,
      [row.institution_id, userId]
    );
    if (!rows.length) return null;
  }

  return row;
}

async function getEffectivePlan(userId) {
  const subscription = await getSubscription(userId);
  const plan = subscription ? getPlan(subscription.plan_code) : getPlan('free');
  return { subscription, plan };
}

async function getUsage(userId) {
  const selects = Object.entries(LIMIT_SOURCES).map(
    ([key, source]) => `(${source.sql}) AS ${key}`
  );

  const { rows } = await pool.query(
    `SELECT ${selects.join(', ')}`,
    [userId]
  );

  const usage = {};
  for (const key of Object.keys(LIMIT_SOURCES)) {
    usage[key] = Number(rows[0]?.[key] || 0);
  }
  return usage;
}

function buildFeatures(plan, usage) {
  const features = {};
  for (const [feature, definition] of Object.entries(FEATURES)) {
    const limit = definition.limit ? plan.limits[definition.limit] ?? null : null;
    const used = definition.limit ? usage[definition.limit] ?? 0 : null;
    const remaining = limit === null ? null : Math.max(0, limit - used);
    features[feature] = {
      label: FEATURE_LABELS[feature] || feature,
      allowed: plan.rank >= definition.min_rank,
      min_plan: getPlanByRank(definition.min_rank).code,
      limit,
      used,
      remaining,
      limit_key: definition.limit || null,
    };
  }
  return features;
}

async function getEntitlements(userId) {
  const [{ subscription, plan }, usage] = await Promise.all([
    getEffectivePlan(userId),
    getUsage(userId),
  ]);

  const features = buildFeatures(plan, usage);

  return {
    plan: publicPlan(plan),
    subscription: subscription
      ? {
          id: subscription.id,
          plan_code: subscription.plan_code,
          status: subscription.status,
          source: subscription.source,
          institution_id: subscription.institution_id,
          institution_name: subscription.institution_name,
          institution_slug: subscription.institution_slug,
          started_at: subscription.started_at,
          current_period_end: subscription.current_period_end,
        }
      : null,
    features,
    usage,
  };
}

function upgradeMessage(feature, plan, requiredPlan) {
  const label = FEATURE_LABELS[feature] || 'This feature';
  return `${label} is available on ${requiredPlan.name}. You are currently on ${plan.name}.`;
}

function assertFeatureFromEntitlements(entitlements, feature) {
  const definition = FEATURES[feature];
  if (!definition) return entitlements;

  const current = entitlements.features[feature];
  if (!current) return entitlements;

  const requiredPlan = getPlanByRank(definition.min_rank);

  if (!current.allowed) {
    throw new ApiError(403, upgradeMessage(feature, entitlements.plan, requiredPlan), {
      code: 'PLAN_UPGRADE_REQUIRED',
      details: {
        feature,
        label: current.label,
        current_plan: entitlements.plan.code,
        required_plan: requiredPlan.code,
        upgrade_to: nextPlan(entitlements.plan.code)?.code || requiredPlan.code,
      },
    });
  }

  if (current.limit !== null && current.remaining <= 0) {
    const upgrade = nextPlan(entitlements.plan.code);
    throw new ApiError(
      403,
      `You have reached your ${current.label.toLowerCase()} limit for this ${
        feature === 'roadmaps' ? 'plan' : 'month'
      }.${upgrade ? ` Upgrade to ${upgrade.name} for a higher limit.` : ''}`,
      {
        code: 'PLAN_LIMIT_REACHED',
        details: {
          feature,
          label: current.label,
          limit: current.limit,
          used: current.used,
          current_plan: entitlements.plan.code,
          upgrade_to: upgrade?.code || null,
          scope: feature === 'roadmaps' ? 'active' : 'monthly',
        },
      }
    );
  }

  return entitlements;
}

async function assertFeature(userId, feature) {
  const entitlements = await getEntitlements(userId);
  return assertFeatureFromEntitlements(entitlements, feature);
}

async function assertAnyFeature(userId, features) {
  const entitlements = await getEntitlements(userId);
  const allowed = features.filter(
    (feature) => entitlements.features[feature]?.allowed
  );
  if (!allowed.length) {
    const first = features[0];
    assertFeatureFromEntitlements(entitlements, first);
  }
  return entitlements;
}

async function assignPlan(
  userId,
  planCode,
  { status = 'active', source = 'admin', institutionId = null, periodEnd = null } = {}
) {
  const plan = getPlan(planCode);
  if (!PLANS[planCode]) {
    throw ApiError.badRequest(`Unknown plan "${planCode}"`);
  }

  const { rows } = await pool.query(
    `INSERT INTO subscriptions
       (user_id, plan_code, status, source, institution_id, current_period_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       plan_code = EXCLUDED.plan_code,
       status = EXCLUDED.status,
       source = EXCLUDED.source,
       institution_id = EXCLUDED.institution_id,
       current_period_end = EXCLUDED.current_period_end,
       canceled_at = CASE WHEN EXCLUDED.status = 'canceled' THEN CURRENT_TIMESTAMP ELSE NULL END,
       started_at = CASE
         WHEN subscriptions.plan_code <> EXCLUDED.plan_code THEN CURRENT_TIMESTAMP
         ELSE subscriptions.started_at
       END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, user_id, plan_code, status, source, institution_id,
       started_at, current_period_end, canceled_at, created_at, updated_at`,
    [userId, planCode, status, source, institutionId, periodEnd]
  );

  return { ...rows[0], plan: publicPlan(plan) };
}

async function resetToFree(userId) {
  return assignPlan(userId, 'free', { source: 'system' });
}

async function listSubscriptions({ plan, status, page, limit }) {
  const conditions = [];
  const values = [];

  if (plan) {
    values.push(plan);
    conditions.push(`s.plan_code = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`s.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.plan_code, s.status, s.source, s.institution_id,
       s.started_at, s.current_period_end, s.created_at,
       u.name, u.email, p.name AS plan_name
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     JOIN subscription_plans p ON p.code = s.plan_code
     ${where}
     ORDER BY s.updated_at DESC, s.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM subscriptions s ${where}`,
    countValues
  );

  return {
    subscriptions: rows,
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function createPlanRequest(userId, { plan_code: planCode, note }) {
  if (!PLANS[planCode] || planCode === 'free' || planCode === 'institution') {
    throw ApiError.badRequest('Choose SkillBridge Plus or SkillBridge Premium.');
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM plan_requests
     WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
    [userId]
  );
  if (existing.length) {
    throw ApiError.conflict('You already have a pending upgrade request.');
  }

  const { rows } = await pool.query(
    `INSERT INTO plan_requests (user_id, plan_code, note)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, plan_code, note, status, reviewed_by, reviewed_at, created_at`,
    [userId, planCode, note || null]
  );

  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin'"
  );
  await notificationsService.notifyMany(
    admins.map((admin) => admin.id),
    {
      type: 'announcement',
      title: 'New plan upgrade request',
      body: `A user requested ${getPlan(planCode).name}. Review it in the admin area.`,
      link: '/admin',
    }
  );

  return rows[0];
}

async function listPlanRequestsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.plan_code, r.note, r.status, r.reviewed_at, r.created_at,
       p.name AS plan_name
     FROM plan_requests r
     JOIN subscription_plans p ON p.code = r.plan_code
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
}

async function listPlanRequests({ status = 'pending', page = 1, limit = 20 }) {
  const conditions = [];
  const values = [];

  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`r.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT r.id, r.user_id, r.plan_code, r.note, r.status, r.reviewed_at,
       r.created_at, u.name, u.email, p.name AS plan_name
     FROM plan_requests r
     JOIN users u ON u.id = r.user_id
     JOIN subscription_plans p ON p.code = r.plan_code
     ${where}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM plan_requests r ${where}`,
    countValues
  );

  return {
    requests: rows,
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function reviewPlanRequest(adminId, requestId, status) {
  const { rows } = await pool.query(
    `SELECT id, user_id, plan_code, status FROM plan_requests WHERE id = $1`,
    [requestId]
  );
  const request = rows[0];
  if (!request) return null;
  if (request.status !== 'pending') {
    throw ApiError.badRequest('That request has already been reviewed.');
  }

  const { rows: updated } = await pool.query(
    `UPDATE plan_requests SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING id, user_id, plan_code, note, status, reviewed_by, reviewed_at, created_at`,
    [status, adminId, requestId]
  );

  const plan = getPlan(request.plan_code);

  if (status === 'approved') {
    await assignPlan(request.user_id, request.plan_code, {
      source: 'admin',
      status: 'active',
    });
    await notificationsService.notify(request.user_id, {
      type: 'announcement',
      title: `Your ${plan.name} plan is active`,
      body: 'Your upgrade request was approved. All included features are now unlocked.',
      link: '/billing',
    });
  } else {
    await notificationsService.notify(request.user_id, {
      type: 'announcement',
      title: 'Upgrade request reviewed',
      body: `Your request for ${plan.name} was not approved. You can contact support or try again later.`,
      link: '/billing',
    });
  }

  return updated[0];
}

async function adminStats() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE plan_code = 'free') AS free,
       COUNT(*) FILTER (WHERE plan_code = 'plus') AS plus,
       COUNT(*) FILTER (WHERE plan_code = 'premium') AS premium,
       COUNT(*) FILTER (WHERE plan_code = 'institution') AS institution,
       COUNT(*) FILTER (WHERE status = 'active') AS active
     FROM subscriptions`
  );

  const { rows: requestRows } = await pool.query(
    `SELECT COUNT(*) AS pending FROM plan_requests WHERE status = 'pending'`
  );

  return {
    ...Object.fromEntries(
      Object.entries(rows[0]).map(([key, value]) => [key, Number(value || 0)])
    ),
    pending_requests: Number(requestRows[0].pending || 0),
  };
}

module.exports = {
  getPlans,
  getSubscription,
  getEffectivePlan,
  getEntitlements,
  getUsage,
  assertFeature,
  assertAnyFeature,
  assignPlan,
  resetToFree,
  listSubscriptions,
  createPlanRequest,
  listPlanRequestsForUser,
  listPlanRequests,
  reviewPlanRequest,
  adminStats,
  planForRank,
};
