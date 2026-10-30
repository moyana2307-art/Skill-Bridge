// Subscription, entitlement, and plan-request endpoints.
const subscriptionsService = require('../services/subscriptions.service');
const { INSTITUTION_PACKAGES } = require('../config/plans');
const { sendSuccess } = require('../utils/response');

async function plans(req, res) {
  return sendSuccess(res, {
    data: {
      plans: subscriptionsService.getPlans(),
      institution_packages: Object.values(INSTITUTION_PACKAGES),
    },
  });
}

async function me(req, res) {
  const entitlements = await subscriptionsService.getEntitlements(req.user.id);
  return sendSuccess(res, { data: { entitlements } });
}

async function requestUpgrade(req, res) {
  const request = await subscriptionsService.createPlanRequest(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    data: { request },
    message: 'Upgrade request sent',
  });
}

async function myRequests(req, res) {
  const requests = await subscriptionsService.listPlanRequestsForUser(req.user.id);
  return sendSuccess(res, { data: { requests } });
}

module.exports = { plans, me, requestUpgrade, myRequests };
