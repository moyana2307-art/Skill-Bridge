// Validation for admin control-centre endpoints.
const { z } = require('zod');
const { USER_ROLES } = require('../config/constants');
const {
  idParam,
  optionalText,
  paginationQuery,
  dateField,
  booleanFromQuery,
} = require('./common.validator');

const roleField = z.enum(USER_ROLES, {
  errorMap: () => ({ message: `Role must be one of: ${USER_ROLES.join(', ')}` }),
});

const statusField = z.enum(['active', 'suspended']);
const planField = z.enum(['free', 'plus', 'premium', 'institution']);
const paymentStatusField = z.enum([
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'disputed',
]);
const subscriptionStatusField = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'expired',
]);
const rangeField = z.enum(['today', '7d', '30d', '90d', 'year', 'custom']);
const activityCategoryField = z.enum([
  'all',
  'registrations',
  'auth',
  'ai',
  'learning',
  'payments',
  'subscriptions',
  'admin',
]);

const listUsersQuery = paginationQuery.extend({
  search: optionalText(100),
  role: roleField.optional(),
  status: statusField.optional(),
  plan: planField.optional(),
  from: dateField().optional(),
  to: dateField().optional(),
});

const listActivityQuery = paginationQuery.extend({
  event_type: optionalText(80),
  category: activityCategoryField.optional(),
  search: optionalText(100),
  user_id: z.coerce.number().int().positive().optional(),
  from: dateField().optional(),
  to: dateField().optional(),
});

const userIdParams = z.object({ userId: idParam });

const updateUserBody = z
  .object({
    name: optionalText(100),
    role: roleField.optional(),
    plan_code: planField.optional(),
    plan_reason: optionalText(300),
  })
  .strict()
  .refine((body) => body.name !== undefined || body.role !== undefined || body.plan_code !== undefined, {
    message: 'Send at least one field to update',
  });

const suspendUserBody = z
  .object({
    reason: optionalText(500),
  })
  .strict()
  .default({});

const transactionIdParams = z.object({ transactionId: idParam });
const subscriptionIdParams = z.object({ subscriptionId: idParam });

const listTransactionsQuery = paginationQuery.extend({
  search: optionalText(120),
  status: paymentStatusField.optional(),
  plan: planField.optional(),
  provider: optionalText(50),
  from: dateField().optional(),
  to: dateField().optional(),
});

const listSubscriptionsQuery = paginationQuery.extend({
  plan: planField.optional(),
  status: subscriptionStatusField.optional(),
  search: optionalText(120),
  expiring: booleanFromQuery(),
  from: dateField().optional(),
  to: dateField().optional(),
});

const analyticsQuery = z.object({
  range: rangeField.default('30d'),
  from: dateField().optional(),
  to: dateField().optional(),
});

const listAuditLogsQuery = paginationQuery.extend({
  action: optionalText(80),
  search: optionalText(120),
  admin_id: z.coerce.number().int().positive().optional(),
  from: dateField().optional(),
  to: dateField().optional(),
});

module.exports = {
  listUsersQuery,
  listActivityQuery,
  userIdParams,
  updateUserBody,
  suspendUserBody,
  transactionIdParams,
  subscriptionIdParams,
  listTransactionsQuery,
  listSubscriptionsQuery,
  analyticsQuery,
  listAuditLogsQuery,
};
