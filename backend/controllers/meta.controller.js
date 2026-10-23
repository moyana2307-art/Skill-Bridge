// Reference data the frontend needs for dropdowns and filters.
const { listCategories } = require('../services/skills.service');
const {
  OPPORTUNITY_TYPES,
  PROFICIENCY_LEVELS,
  USER_ROLES,
  ROADMAP_TASK_STATUSES,
  GOAL_STATUSES,
} = require('../config/constants');
const { sendSuccess } = require('../utils/response');

async function getMeta(req, res) {
  const skillCategories = await listCategories();

  return sendSuccess(res, {
    data: {
      opportunity_types: OPPORTUNITY_TYPES,
      proficiency_levels: PROFICIENCY_LEVELS,
      user_roles: USER_ROLES,
      roadmap_task_statuses: ROADMAP_TASK_STATUSES,
      goal_statuses: GOAL_STATUSES,
      skill_categories: skillCategories,
    },
  });
}

module.exports = { getMeta };
