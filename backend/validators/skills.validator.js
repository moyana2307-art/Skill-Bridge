// Validation rules for the /api/skills endpoints.
const { z } = require('zod');
const { idParam, optionalText, paginationQuery } = require('./common.validator');

// GET /api/skills
const listSkillsQuery = paginationQuery.extend({
  search: optionalText(100),
  category: optionalText(100),
});

// GET /api/skills/:id
const skillIdParams = z.object({ id: idParam });

// POST /api/skills
const createSkillBody = z
  .object({
    name: z.string().trim().min(1, 'Skill name is required').max(100, 'Skill name is too long'),
    category: optionalText(100),
  })
  .strict();

// PATCH /api/skills/:id
const updateSkillBody = createSkillBody
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

module.exports = { listSkillsQuery, skillIdParams, createSkillBody, updateSkillBody };
