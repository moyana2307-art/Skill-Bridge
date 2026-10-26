// Validation rules for the /api/opportunities endpoints.
const { z } = require('zod');
const { OPPORTUNITY_TYPES } = require('../config/constants');
const {
  idParam,
  booleanFromQuery,
  optionalText,
  paginationQuery,
  urlField,
  dateField,
} = require('./common.validator');

const SORT_OPTIONS = ['newest', 'deadline', 'title'];

// GET /api/opportunities
const listOpportunitiesQuery = paginationQuery.extend({
  search: optionalText(100),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  location: optionalText(150),
  is_remote: booleanFromQuery(),
  is_active: booleanFromQuery(true),
  sort: z.enum(SORT_OPTIONS).default('newest'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/opportunities/:id
const opportunityIdParams = z.object({ id: idParam });

// Fields shared by the create and update endpoints.
// The flags are optional (no default) so that a PATCH only changes the
// fields the client actually sent. Missing flags fall back to the database
// defaults when a new record is inserted.
const opportunityFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  organisation: optionalText(150),
  description: optionalText(5000),
  opportunity_type: z.enum(OPPORTUNITY_TYPES, {
    errorMap: () => ({ message: `Type must be one of: ${OPPORTUNITY_TYPES.join(', ')}` }),
  }),
  required_skills: optionalText(500),
  location: optionalText(150),
  is_remote: z.boolean().optional(),
  eligibility: optionalText(2000),
  application_deadline: dateField().optional(),
  application_url: urlField(500).optional(),
  source_name: optionalText(150),
  external_id: optionalText(200),
  is_active: z.boolean().optional(),
};

// POST /api/opportunities
const createOpportunityBody = z.object(opportunityFields).strict();

// PATCH /api/opportunities/:id
const updateOpportunityBody = z
  .object(opportunityFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

module.exports = {
  OPPORTUNITY_TYPES,
  listOpportunitiesQuery,
  opportunityIdParams,
  createOpportunityBody,
  updateOpportunityBody,
};
