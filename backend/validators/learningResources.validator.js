// Validation for the learning resource catalogue.
const { z } = require('zod');
const { RESOURCE_TYPES } = require('../config/constants');
const {
  idParam,
  optionalText,
  paginationQuery,
  booleanFromQuery,
  urlField,
} = require('./common.validator');

const typeField = z.enum(RESOURCE_TYPES, {
  errorMap: () => ({ message: `Type must be one of: ${RESOURCE_TYPES.join(', ')}` }),
});

const listResourcesQuery = paginationQuery.extend({
  search: optionalText(100),
  type: typeField.optional(),
  skill: optionalText(100),
  is_active: booleanFromQuery(),
});

const resourceIdParams = z.object({ resourceId: idParam });

const resourceFields = {
  title: z.string().trim().min(2, 'Title is required').max(200),
  provider: optionalText(150),
  url: urlField(500).optional(),
  description: optionalText(5000),
  resource_type: typeField.optional(),
  skill_tags: optionalText(500),
  is_free: z.boolean().optional(),
  is_active: z.boolean().optional(),
};

const createResourceBody = z
  .object({
    ...resourceFields,
    resource_type: typeField.default('course'),
  })
  .strict();

const updateResourceBody = z
  .object(resourceFields)
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = {
  listResourcesQuery,
  resourceIdParams,
  createResourceBody,
  updateResourceBody,
};
