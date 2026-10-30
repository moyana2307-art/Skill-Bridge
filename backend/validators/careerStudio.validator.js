// Validation for CVs, cover letters, and mock interviews.
const { z } = require('zod');
const { INTERVIEW_TYPES } = require('../config/constants');
const { idParam, optionalText } = require('./common.validator');

const cvIdParams = z.object({ cvId: idParam });
const coverLetterIdParams = z.object({ coverLetterId: idParam });
const interviewIdParams = z.object({ interviewId: idParam });

const generateCvBody = z
  .object({
    title: optionalText(200),
    target_role: optionalText(150),
    opportunity_id: idParam.optional(),
  })
  .strict();

const updateCvBody = z
  .object({
    title: optionalText(200),
    content: z.object({}).passthrough().optional(),
    is_primary: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

const analyzeCvBody = z
  .object({
    target_role: optionalText(150),
  })
  .strict();

const coverLetterBody = z
  .object({
    opportunity_id: idParam.optional(),
    role: optionalText(150),
    tone: optionalText(60),
  })
  .strict();

const startInterviewBody = z
  .object({
    role: z.string().trim().min(2, 'Role is required').max(150),
    interview_type: z.enum(INTERVIEW_TYPES, {
      errorMap: () => ({ message: `Interview type must be one of: ${INTERVIEW_TYPES.join(', ')}` }),
    }).default('general'),
  })
  .strict();

const answerBody = z
  .object({
    question_index: z.coerce.number().int().min(0).max(50),
    answer: z.string().trim().min(1, 'Write an answer first').max(4000),
  })
  .strict();

module.exports = {
  cvIdParams,
  coverLetterIdParams,
  interviewIdParams,
  generateCvBody,
  updateCvBody,
  analyzeCvBody,
  coverLetterBody,
  startInterviewBody,
  answerBody,
};
