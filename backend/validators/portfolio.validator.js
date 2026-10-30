// Validation for public portfolio settings.
const { z } = require('zod');
const { nullableText } = require('./common.validator');

const updatePortfolioBody = z
  .object({
    portfolio_slug: nullableText(80),
    portfolio_headline: nullableText(200),
    portfolio_about: nullableText(5000),
    portfolio_public: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

const slugParams = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Invalid portfolio link'),
});

module.exports = { updatePortfolioBody, slugParams };
