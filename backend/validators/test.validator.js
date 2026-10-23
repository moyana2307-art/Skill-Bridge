// Validation rules for the development-only test endpoints.
const { z } = require('zod');

// POST /api/test/echo
const echoBody = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(200, 'Message must be 200 characters or fewer'),
  })
  .strict();

module.exports = { echoBody };
