// Paynow payment provider integration (Zimbabwe)
// Docs: https://developers.paynow.co.zw/
// Note: Zimbabwean businesses can use Paynow for EcoCash/OneMoney/Zimswitch/cards.
// Stripe not directly available to Zimbabwean businesses.
const crypto = require('crypto');
const ApiError = require('../../utils/ApiError');
const paymentsService = require('../payments');
const subscriptionsService = require('../subscriptions.service');
const notificationsService = require('../notifications.service');

const PAYNOW_CHECKOUT_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const PAYNOW_PAID_STATUSES = ['paid', 'awaiting delivery', 'delivered'];
const PAYNOW_PENDING_STATUSES = ['created', 'sent', 'pending'];

function getConfig() {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  const resultUrl = process.env.PAYNOW_RESULT_URL;
  const returnUrl = process.env.PAYNOW_RETURN_URL;
  if (!integrationId || !integrationKey) {
    throw ApiError.internal(
      'Paynow is not configured. Set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY.'
    );
  }
  return { integrationId, integrationKey, resultUrl, returnUrl };
}

function assertHttpUrl(name, value) {
  if (!value) {
    throw ApiError.internal(`Paynow is not configured. Set ${name}.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw ApiError.internal(`${name} must be a valid absolute URL.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw ApiError.internal(`${name} must use http or https.`);
  }
  return value;
}

function getCheckoutConfig() {
  const config = getConfig();
  assertHttpUrl('PAYNOW_RESULT_URL', config.resultUrl);
  assertHttpUrl('PAYNOW_RETURN_URL', config.returnUrl);
  return config;
}

// Paynow hashes the raw values only, in message order, then appends the
// integration key. Do not use key=value pairs or URL-encoded values here.
function generateHash(data, key) {
  const message = Object.keys(data)
    .filter((name) => String(name).toLowerCase() !== 'hash')
    .map((name) => String(data[name] ?? ''))
    .join('');
  return crypto
    .createHash('sha512')
    .update(message + key, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function parsePayload(rawBody) {
  const params = new URLSearchParams(String(rawBody || ''));
  const data = {};
  const entries = [];
  for (const [name, value] of params.entries()) {
    data[name] = value;
    if (name.toLowerCase() !== 'hash') entries.push([name, value]);
  }
  return { data, entries };
}

function hashesMatch(expected, actual) {
  const left = Buffer.from(String(expected || '').toUpperCase(), 'utf8');
  const right = Buffer.from(String(actual || '').toUpperCase(), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyHash(data, key) {
  if (!data || !data.hash) return false;
  return hashesMatch(generateHash(data, key), data.hash);
}

function verifyRawHash(rawBody, key) {
  const { data, entries } = parsePayload(rawBody);
  if (!data.hash) return false;
  const message = entries.map(([, value]) => value).join('');
  const calculated = crypto
    .createHash('sha512')
    .update(message + key, 'utf8')
    .digest('hex')
    .toUpperCase();
  return hashesMatch(calculated, data.hash);
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (PAYNOW_PAID_STATUSES.includes(value)) return 'paid';
  if (PAYNOW_PENDING_STATUSES.includes(value)) return 'pending';
  if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
  if (value === 'refunded') return 'refunded';
  if (value === 'disputed') return 'disputed';
  if (value === 'failed') return 'failed';
  return null;
}

function amountToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

async function activatePaidPlan(record) {
  if (!record.user_id || !record.plan_code) return;
  if (['free', 'institution'].includes(record.plan_code)) return;

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await subscriptionsService.assignPlan(record.user_id, record.plan_code, {
    source: 'payment',
    status: 'active',
    periodEnd,
  });
  await notificationsService.notify(record.user_id, {
    type: 'announcement',
    title: 'Payment received',
    body: `Your ${record.plan_code} plan is now active. Thank you for supporting SkillBridge AI.`,
    link: '/billing',
  });
}

async function revokePaidPlan(record) {
  if (!record.user_id || !record.plan_code) return;
  const subscription = await subscriptionsService.getSubscription(record.user_id);
  if (
    !subscription ||
    subscription.source !== 'payment' ||
    subscription.plan_code !== record.plan_code
  ) {
    return;
  }

  await subscriptionsService.resetToFree(record.user_id);
  await notificationsService.notify(record.user_id, {
    type: 'announcement',
    title: 'Plan access ended',
    body: 'Your payment was reversed, so your account has returned to the Free plan.',
    link: '/billing',
  });
}

async function createCheckout({ userId, planCode, amountCents, email, reference }) {
  const { integrationId, integrationKey, resultUrl, returnUrl } = getCheckoutConfig();
  if (!Number.isFinite(Number(amountCents)) || Number(amountCents) <= 0) {
    throw ApiError.badRequest('A positive payment amount is required.');
  }

  const amount = (Number(amountCents) / 100).toFixed(2);
  const paymentRecord = await paymentsService.createPaymentRecord({
    userId,
    planCode,
    amountCents,
    currency: 'USD',
    provider: 'paynow',
    providerReference: reference,
    status: 'pending',
    metadata: { email: email || null },
  });

  // Field order matters: Paynow concatenates these values to validate the hash.
  const data = {
    id: integrationId,
    reference,
    amount,
    additionalinfo: `SkillBridge AI - ${planCode} subscription`,
    returnurl: returnUrl,
    resulturl: resultUrl,
    authemail: email || '',
    status: 'Message',
  };
  data.hash = generateHash(data, integrationKey);

  return {
    provider: 'paynow',
    paymentRecordId: paymentRecord.id,
    checkoutUrl: PAYNOW_CHECKOUT_URL,
    method: 'POST',
    fields: data,
    instructions:
      'Submit this form to Paynow to complete payment. Payment status is confirmed by the Paynow result URL.',
  };
}

async function verifyTransaction({ reference }) {
  const record = await paymentsService.getPaymentRecordByReference('paynow', reference);
  if (!record) throw ApiError.notFound('Payment record not found');
  const pollUrl = record.metadata?.pollurl;
  if (!pollUrl) {
    throw ApiError.badRequest('Paynow has not provided a status URL for this payment yet.');
  }

  const response = await fetch(pollUrl, { method: 'GET' });
  if (!response.ok) {
    throw ApiError.internal('Could not reach Paynow to verify this payment.');
  }
  const raw = await response.text();
  const { integrationKey } = getConfig();
  if (!verifyRawHash(raw, integrationKey)) {
    throw ApiError.badRequest('Paynow returned an invalid status hash.');
  }

  const { data } = parsePayload(raw);
  return handleWebhook(data, raw);
}

async function handleWebhook(payload, rawBody = null) {
  const { integrationKey } = getConfig();
  const verified = rawBody
    ? verifyRawHash(rawBody, integrationKey)
    : verifyHash(payload, integrationKey);
  if (!verified) {
    throw ApiError.badRequest('Invalid Paynow webhook signature');
  }

  const reference = payload.reference;
  const paynowReference = payload.paynowreference || null;
  const status = normalizeStatus(payload.status);
  if (!reference) throw ApiError.badRequest('Paynow webhook is missing a reference');
  if (!status) {
    return { received: true, status: payload.status || null, ignored: true };
  }

  const result = await paymentsService.settlePayment({
    provider: 'paynow',
    reference,
    status,
    providerTransactionId: paynowReference,
    amountCents: status === 'paid' ? amountToCents(payload.amount) : null,
    metadata: {
      paynow_status: payload.status || null,
      pollurl: payload.pollurl || null,
      webhook: payload,
    },
  });

  if (result.status === 'not_found') {
    throw ApiError.notFound('Payment record not found');
  }

  if (result.status === 'updated') {
    if (result.record.status === 'paid') {
      await activatePaidPlan(result.record);
    } else if (['cancelled', 'refunded'].includes(result.record.status)) {
      await revokePaidPlan(result.record);
    }
  }

  return { received: true, status: result.record?.status || status, ignored: result.status === 'ignored' };
}

module.exports = {
  name: 'paynow',
  createCheckout,
  verifyTransaction,
  handleWebhook,
  generateHash,
  verifyHash,
  verifyRawHash,
  normalizeStatus,
};
