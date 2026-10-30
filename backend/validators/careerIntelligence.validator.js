// Validation for AI Career Intelligence endpoints.
const { z } = require('zod');
const { idParam, optionalText } = require('./common.validator');

const answerField = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500),
  answer: z.string().trim().min(1, 'Answer is required').max(2000),
});

const assessmentBody = z
  .object({
    answers: z.array(answerField).min(1, 'Answer at least one question').max(30),
  })
  .strict();

const recommendationsBody = z
  .object({
    career_goal_id: idParam.optional(),
    interests: optionalText(500),
    limit: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict();

const compareBody = z
  .object({
    path_a: z.string().trim().min(2, 'Path A is required').max(150),
    path_b: z.string().trim().min(2, 'Path B is required').max(150),
    focus: optionalText(300),
  })
  .strict()
  .refine((body) => body.path_a.toLowerCase() !== body.path_b.toLowerCase(), {
    message: 'Choose two different career paths to compare',
  });

const requirementsBody = z
  .object({
    role: z.string().trim().min(2, 'Role is required').max(150),
  })
  .strict();

module.exports = {
  assessmentBody,
  recommendationsBody,
  compareBody,
  requirementsBody,
};
