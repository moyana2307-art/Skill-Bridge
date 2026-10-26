// Validation for the AI endpoints.
const { z } = require('zod');
const { idParam, optionalText } = require('./common.validator');

const skillsGapBody = z
  .object({
    career_goal_id: idParam.optional(),
    target_role: optionalText(150),
  })
  .strict()
  .refine((body) => body.career_goal_id !== undefined || body.target_role, {
    message: 'Provide a career_goal_id or a target_role',
  });

const generateRoadmapBody = z
  .object({
    career_goal_id: idParam,
    timeframe_weeks: z.coerce
      .number()
      .int('Timeframe must be a whole number of weeks')
      .min(4, 'Use at least 4 weeks')
      .max(52, 'Use at most 52 weeks')
      .default(12),
    hours_per_week: z.coerce
      .number()
      .int('Hours must be a whole number')
      .min(1, 'Use at least 1 hour per week')
      .max(40, 'Use at most 40 hours per week')
      .default(8),
    focus: optionalText(300),
  })
  .strict();

const opportunityInsightBody = z
  .object({
    opportunity_id: idParam,
  })
  .strict();

module.exports = {
  skillsGapBody,
  generateRoadmapBody,
  opportunityInsightBody,
};
