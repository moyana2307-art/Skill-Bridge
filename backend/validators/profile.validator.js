// Validation rules for the logged-in user's profile.
const { z } = require('zod');

// An empty string clears the field; omitting the field leaves it unchanged.
const nullableText = (max) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional()
  );

const updateProfileBody = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long')
      .optional(),
    education_level: nullableText(100),
    work_experience: nullableText(2000),
    career_interests: nullableText(500),
    location: nullableText(100),
    learning_preferences: nullableText(500),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = { updateProfileBody };
