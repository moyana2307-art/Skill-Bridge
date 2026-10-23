// Validation rules for the logged-in user's career goals.
const { z } = require('zod');
const { GOAL_STATUSES } = require('../config/constants');
const { idParam } = require('./common.validator');

const statusField = z.enum(GOAL_STATUSES, {
  errorMap: () => ({
    message: `Status must be one of: ${GOAL_STATUSES.join(', ')}`,
  }),
});

const careerTitleField = z
  .string()
  .trim()
  .min(2, 'Career title must be at least 2 characters')
  .max(150, 'Career title is too long');

// POST /api/career-goals
const createCareerGoalBody = z
  .object({
    career_title: careerTitleField,
    status: statusField.default('active'),
  })
  .strict();

// PATCH /api/career-goals/:goalId
const updateCareerGoalBody = z
  .object({
    career_title: careerTitleField.optional(),
    status: statusField.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

// GET /api/career-goals
const listCareerGoalsQuery = z.object({
  status: statusField.optional(),
});

const careerGoalIdParams = z.object({ goalId: idParam });

module.exports = {
  createCareerGoalBody,
  updateCareerGoalBody,
  listCareerGoalsQuery,
  careerGoalIdParams,
};
