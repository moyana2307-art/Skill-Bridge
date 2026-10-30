const paymentsService = require('../services/payments');
const paynowService = require('../services/payments/paynow.service');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { getPlan } = require('../config/plans');
const crypto = require('crypto');

paymentsService.registerProvider('paynow', paynowService);

async function getProviders(req, res) {
  return sendSuccess(res, {
    data: {
      providers: [
        {
          name: 'paynow',
          label: 'Paynow (EcoCash, OneMoney, Zimswitch, Cards)',
          available: Boolean(process.env.PAYNOW_INTEGRATION_ID && process.env.PAYNOW_INTEGRATION_KEY),
          currencies: ['USD'],
          countries: ['ZW'],
        },
      ],
    },
  });
}

async function createCheckout(req, res) {
  const { plan_code: planCode, provider = 'paynow' } = req.validated.body;
  const plan = getPlan(planCode);

  if (!plan || planCode === 'free' || planCode === 'institution') {
    throw ApiError.badRequest('Invalid plan for payment checkout');
  }

  const paymentProvider = paymentsService.getProvider(provider);
  const reference = `SB-${req.user.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  
  const result = await paymentProvider.createCheckout({
    userId: req.user.id,
    planCode,
    amountCents: plan.price_cents,
    email: req.user.email,
    reference,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: result,
    message: 'Checkout created',
  });
}

async function webhook(req, res) {
  const { provider = 'paynow' } = req.params;
  const paymentProvider = paymentsService.getProvider(provider);

  // The provider verifies the signature, settles the payment, and activates or
  // revokes the plan exactly once. Raw body keeps Paynow's field order intact.
  await paymentProvider.handleWebhook(req.body, req.rawBody || null);

  return res.status(200).send('OK');
}

async function checkStatus(req, res) {
  const { reference } = req.params;
  const paymentRecord = await paymentsService.getPaymentRecordByReference(
    req.query.provider || 'paynow',
    reference
  );
  if (!paymentRecord) throw ApiError.notFound('Payment not found');
  if (paymentRecord.user_id && Number(paymentRecord.user_id) !== Number(req.user.id)) {
    throw ApiError.forbidden('Not authorized to view this payment');
  }
  return sendSuccess(res, { data: { payment: paymentRecord } });
}

module.exports = { getProviders, createCheckout, webhook, checkStatus };
