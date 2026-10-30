// Validation for application tracking.
const { z } = require('zod');
const { APPLICATION_STATUSES } = require('../config/constants');
const {
  idParam,
  optionalText,
  dateField,
} = require('./common.validator');

const statusField = z.enum(APPLICATION_STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` }),
});

const listApplicationsQuery = z.object({
  status: statusField.optional(),
});

const applicationIdParams = z.object({ applicationId: idParam });

const applicationFields = {
  opportunity_id: idParam.optional(),
  title: optionalText(200),
  organisation: optionalText(150),
  status: statusField.optional(),
  applied_at: dateField().optional(),
  deadline: dateField().optional(),
  notes: optionalText(2000),
};

const createApplicationBody = z
  .object({
    ...applicationFields,
    status: statusField.default('saved'),
  })
  .strict()
  .refine((body) => body.title || body.opportunity_id, {
    message: 'Provide an opportunity or a title',
  });

const updateApplicationBody = z
  .object(applicationFields)
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = {
  listApplicationsQuery,
  applicationIdParams,
  createApplicationBody,
  updateApplicationBody,
};
