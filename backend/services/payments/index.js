// Payment provider abstraction for SkillBridge AI.
// Supports multiple providers (Paynow, EcoPay, Stripe etc.) with a unified interface.
// Never trust payment success from frontend alone - always verify via provider/webhooks.

const ApiError = require('../../utils/ApiError');
const { pool } = require('../../config/db');

const PROVIDERS = {};

function registerProvider(name, provider) {
  PROVIDERS[name] = provider;
}

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw ApiError.badRequest(`Payment provider "${name}" is not configured`);
  }
  return provider;
}

function getDefaultProvider() {
  const name = process.env.PAYMENT_PROVIDER || 'paynow';
  return getProvider(name);
}

async function createPaymentRecord({
  userId = null,
  institutionId = null,
  planCode = null,
  amountCents = 0,
  currency = 'USD',
  provider = null,
  providerReference = null,
  status = 'pending',
  metadata = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO payment_records
       (user_id, institution_id, plan_code, amount_cents, currency, provider, provider_reference, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING id, user_id, institution_id, plan_code, amount_cents, currency, provider,
       provider_reference, provider_transaction_id, status, metadata, created_at, updated_at`,
    [
      userId,
      institutionId,
      planCode,
      amountCents,
      currency,
      provider,
      providerReference,
      status,
      metadata ? JSON.stringify(metadata) : JSON.stringify({}),
    ]
  );
  return rows[0];
}

async function updatePaymentRecord(
  id,
  { status, providerReference = null, providerTransactionId = null, metadata = null } = {}
) {
  const sets = [];
  const values = [];
  if (status) {
    values.push(status);
    sets.push(`status = $${values.length}`);
  }
  if (providerReference) {
    values.push(providerReference);
    sets.push(`provider_reference = $${values.length}`);
  }
  if (providerTransactionId) {
    values.push(providerTransactionId);
    sets.push(`provider_transaction_id = $${values.length}`);
  }
  if (metadata) {
    values.push(JSON.stringify(metadata));
    sets.push(`metadata = $${values.length}::jsonb`);
  }
  if (!sets.length) return null;
  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE payment_records SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

// Applies a provider status update under a row lock so duplicate webhooks
// cannot double-activate a subscription. `providerReference` is the merchant
// reference we created; the Paynow reference is stored separately.
async function settlePayment({
  provider,
  reference,
  status,
  providerTransactionId = null,
  amountCents = null,
  metadata = null,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM payment_records
       WHERE provider = $1 AND provider_reference = $2
       FOR UPDATE`,
      [provider, reference]
    );
    const record = rows[0];
    if (!record) {
      await client.query('ROLLBACK');
      return { status: 'not_found', record: null };
    }

    if (amountCents !== null && Number(record.amount_cents) !== Number(amountCents)) {
      throw ApiError.badRequest('Payment amount does not match the expected amount.');
    }

    if (record.status === 'paid' && status === 'paid') {
      await client.query('COMMIT');
      return { status: 'already_paid', record };
    }

    // Never resurrect a cancelled/refunded payment from a late pending or paid
    // update. A refunded payment can still move to disputed/refunded, and a
    // disputed payment can move back to paid if the dispute is resolved.
    if (
      ['cancelled', 'refunded'].includes(record.status) &&
      ['pending', 'paid'].includes(status)
    ) {
      await client.query('COMMIT');
      return { status: 'ignored', record };
    }

    if (record.status === 'paid' && status === 'pending') {
      await client.query('COMMIT');
      return { status: 'ignored', record };
    }

    const mergedMetadata = metadata
      ? { ...(record.metadata || {}), ...metadata }
      : record.metadata || {};

    const { rows: updatedRows } = await client.query(
      `UPDATE payment_records
       SET status = $1,
           provider_transaction_id = COALESCE($2, provider_transaction_id),
           metadata = $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        status,
        providerTransactionId,
        JSON.stringify(mergedMetadata),
        record.id,
      ]
    );

    await client.query('COMMIT');
    return { status: 'updated', record: updatedRows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPaymentRecord(id) {
  const { rows } = await pool.query('SELECT * FROM payment_records WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getPaymentRecordByReference(provider, reference) {
  const { rows } = await pool.query(
    'SELECT * FROM payment_records WHERE provider = $1 AND provider_reference = $2',
    [provider, reference]
  );
  return rows[0] || null;
}

module.exports = {
  registerProvider,
  getProvider,
  getDefaultProvider,
  createPaymentRecord,
  updatePaymentRecord,
  settlePayment,
  getPaymentRecord,
  getPaymentRecordByReference,
  PROVIDERS,
};
