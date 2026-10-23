// Validation rules for the logged-in user's skill list.
const { z } = require('zod');
const { PROFICIENCY_LEVELS } = require('../config/constants');
const { idParam } = require('./common.validator');

const proficiencyField = z.enum(PROFICIENCY_LEVELS, {
  errorMap: () => ({
    message: `Proficiency must be one of: ${PROFICIENCY_LEVELS.join(', ')}`,
  }),
});

// POST /api/profile/skills
// skill_id must point at an existing catalogue skill. New skills are added
// to the shared catalogue by an admin, not by normal users.
const addUserSkillBody = z
  .object({
    skill_id: idParam,
    proficiency: proficiencyField.default('beginner'),
  })
  .strict();

// PATCH /api/profile/skills/:skillId
const updateUserSkillBody = z
  .object({
    proficiency: proficiencyField,
  })
  .strict();

// /api/profile/skills/:skillId
const userSkillParams = z.object({ skillId: idParam });

module.exports = { addUserSkillBody, updateUserSkillBody, userSkillParams };
