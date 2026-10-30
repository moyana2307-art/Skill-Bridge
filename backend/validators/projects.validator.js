// Validation for projects and portfolio content.
const { z } = require('zod');
const { PROJECT_STATUSES } = require('../config/constants');
const { idParam, optionalText, urlField } = require('./common.validator');

const statusField = z.enum(PROJECT_STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${PROJECT_STATUSES.join(', ')}` }),
});

const listProjectsQuery = z.object({
  status: statusField.optional(),
});

const projectIdParams = z.object({ projectId: idParam });

const projectFields = {
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: optionalText(5000),
  skills: optionalText(500),
  status: statusField.optional(),
  repo_url: urlField(500).optional(),
  live_url: urlField(500).optional(),
  evidence: optionalText(5000),
};

const createProjectBody = z
  .object({
    ...projectFields,
    status: statusField.default('planned'),
  })
  .strict();

const updateProjectBody = z
  .object(projectFields)
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

const recommendationsBody = z
  .object({
    career_goal_id: idParam.optional(),
    limit: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict();

module.exports = {
  listProjectsQuery,
  projectIdParams,
  createProjectBody,
  updateProjectBody,
  recommendationsBody,
};
