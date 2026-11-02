// Subscription history. The subscriptions table holds only the current state;
// this ledger keeps every plan/status transition for admin reporting.
const { pool } = require('../config/db');

async function recordSubscriptionEvent({
  subscriptionId = null,
  userId = null,
  eventType,
  fromPlanCode = null,
  toPlanCode = null,
  fromStatus = null,
  toStatus = null,
  source = null,
  amountCents = null,
  currency = null,
  actorUserId = null,
  metadata = null,
}) {
  if (!eventType) return null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO subscription_events
         (subscription_id, user_id, event_type, from_plan_code, to_plan_code,
          from_status, to_status, source, amount_cents, currency, actor_user_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING id, created_at`,
      [
        subscriptionId || null,
        userId || null,
        eventType,
        fromPlanCode || null,
        toPlanCode || null,
        fromStatus || null,
        toStatus || null,
        source || null,
        amountCents === null || amountCents === undefined ? null : Number(amountCents),
        currency || null,
        actorUserId || null,
        JSON.stringify(metadata || {}),
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[subscription-events] could not record event:', err.message);
    return null;
  }
}

module.exports = { recordSubscriptionEvent };
