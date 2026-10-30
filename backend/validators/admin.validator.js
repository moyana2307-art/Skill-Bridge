// Validation for admin endpoints.
const { z } = require('zod');
const { USER_ROLES } = require('../config/constants');
const {
  idParam,
  optionalText,
  paginationQuery,
} = require('./common.validator');

const roleField = z.enum(USER_ROLES, {
  errorMap: () => ({ message: `Role must be one of: ${USER_ROLES.join(', ')}` }),
});

const listUsersQuery = paginationQuery.extend({
  search: optionalText(100),
  role: roleField.optional(),
});

const userIdParams = z.object({ userId: idParam });

const updateUserBody = z
  .object({
    name: optionalText(100),
    role: roleField.optional(),
    plan_code: z.enum(['free', 'plus', 'premium', 'institution']).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = { listUsersQuery, userIdParams, updateUserBody };
