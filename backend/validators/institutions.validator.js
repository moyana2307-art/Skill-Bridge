// Validation for institution and institution-member endpoints.
const { z } = require('zod');
const {
  idParam,
  optionalText,
  paginationQuery,
} = require('./common.validator');

const packageField = z.enum(['small', 'growing', 'large'], {
  errorMap: () => ({ message: 'Package must be small, growing, or large' }),
});

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(255);

const institutionIdParams = z.object({ institutionId: idParam });
const memberParams = z.object({ institutionId: idParam, userId: idParam });

const createInstitutionBody = z
  .object({
    name: z.string().trim().min(2).max(200),
    contact_email: emailField.optional(),
    package_code: packageField.default('small'),
    seat_limit: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict();

const updateInstitutionBody = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    contact_email: emailField.optional(),
    package_code: packageField.optional(),
    seat_limit: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

// Only platform admins can approve, suspend, or reactivate an institution.
const adminUpdateInstitutionBody = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    contact_email: emailField.optional(),
    package_code: packageField.optional(),
    seat_limit: z.coerce.number().int().min(1).max(10000).optional(),
    status: z.enum(['pending', 'active', 'suspended']).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

const addMemberBody = z
  .object({
    email: emailField,
    role: z.enum(['admin', 'member']).default('member'),
  })
  .strict();

const bulkMembersBody = z
  .object({
    emails: z.array(emailField).min(1).max(200),
  })
  .strict();

const updateMemberBody = z
  .object({
    role: z.enum(['admin', 'member']),
  })
  .strict();

const listInstitutionsQuery = paginationQuery.extend({
  search: optionalText(100),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

module.exports = {
  institutionIdParams,
  memberParams,
  createInstitutionBody,
  updateInstitutionBody,
  adminUpdateInstitutionBody,
  addMemberBody,
  bulkMembersBody,
  updateMemberBody,
  listInstitutionsQuery,
};
