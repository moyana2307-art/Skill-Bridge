// Validation rules that are shared by several endpoints.
const { z } = require('zod');

// Path parameter: /skills/12 -> 12
const idParam = z.coerce
  .number({ invalid_type_error: 'The id must be a number' })
  .int('The id must be a whole number')
  .positive('The id must be a positive number');

// Query string booleans arrive as text ("true"), so they are converted by
// hand. `z.coerce.boolean()` would turn "false" into true, which is wrong.
// With no defaultValue the filter is left out entirely, meaning "match all".
const booleanFromQuery = (defaultValue) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (value === true || value === 'true' || value === '1') return true;
      if (value === false || value === 'false' || value === '0') return false;
      return value;
    },
    defaultValue === undefined
      ? z.boolean({ invalid_type_error: 'Expected true or false' }).optional()
      : z.boolean({ invalid_type_error: 'Expected true or false' }).default(defaultValue)
  );

// An optional text field where an empty string counts as "not provided".
const optionalText = (max = 255) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).max(max).optional()
  );

// Like optionalText, but an empty string becomes null so a PATCH can clear a
// field. Omitting the field still means "leave it unchanged".
const nullableText = (max = 255) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(1).max(max).nullable()
  ).optional();

// ?page=2&limit=20
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// A URL that must parse and use http/https. Rejecting other schemes (for
// example javascript:) stops unsafe links from being stored and rendered.
const urlField = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Must be a valid http:// or https:// URL' }
    );

// A date in YYYY-MM-DD form that is also a real calendar date.
// Date.parse() silently rolls invalid days over (31 February becomes March),
// so we rebuild the date and compare every part.
const dateField = () =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, 'That date does not exist');

module.exports = {
  idParam,
  booleanFromQuery,
  optionalText,
  nullableText,
  paginationQuery,
  urlField,
  dateField,
};
