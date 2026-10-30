// Validation for subscription and plan-request endpoints.
const { z } = require('zod');
const { idParam, optionalText, paginationQuery } = require('./common.validator');

const requestablePlans = ['plus', 'premium'];
const requestStatuses = ['pending', 'approved', 'rejected'];
const subscriptionStatuses = ['active', 'trialing', 'past_due', 'canceled'];

const planCodeField = z.enum(requestablePlans, {
  errorMap: () => ({ message: `Plan must be one of: ${requestablePlans.join(', ')}` }),
});

const requestUpgradeBody = z
  .object({
    plan_code: planCodeField,
    note: optionalText(1000),
  })
  .strict();

const requestIdParams = z.object({ requestId: idParam });

const reviewRequestBody = z
  .object({
    status: z.enum(['approved', 'rejected'], {
      errorMap: () => ({ message: 'Status must be approved or rejected' }),
    }),
  })
  .strict();

const listRequestsQuery = paginationQuery.extend({
  status: z.enum(['all', ...requestStatuses]).default('pending'),
});

const listSubscriptionsQuery = paginationQuery.extend({
  plan: z.enum(['free', 'plus', 'premium', 'institution']).optional(),
  status: z.enum(subscriptionStatuses).optional(),
});

module.exports = {
  requestUpgradeBody,
  requestIdParams,
  reviewRequestBody,
  listRequestsQuery,
  listSubscriptionsQuery,
};
