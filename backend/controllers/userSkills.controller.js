// The logged-in user's skills. The user id always comes from the token.
const userSkillsService = require('../services/userSkills.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/profile/skills
async function list(req, res) {
  const skills = await userSkillsService.listUserSkills(req.user.id);

  return sendSuccess(res, { data: { skills } });
}

// POST /api/profile/skills
async function add(req, res) {
  const { skill_id: skillId, proficiency } = req.validated.body;
  const result = await userSkillsService.addUserSkill(
    req.user.id,
    skillId,
    proficiency
  );

  if (result.status === 'skill_not_found') {
    throw ApiError.notFound(`Skill ${skillId} was not found`);
  }

  if (result.status === 'already_added') {
    throw ApiError.conflict('That skill is already in your profile');
  }

  return sendSuccess(res, {
    statusCode: 201,
    data: { skill: result.skill },
    message: 'Skill added to your profile',
  });
}

// PATCH /api/profile/skills/:skillId
async function update(req, res) {
  const { skillId } = req.validated.params;
  const { proficiency } = req.validated.body;
  const skill = await userSkillsService.updateUserSkill(
    req.user.id,
    skillId,
    proficiency
  );

  if (!skill) {
    throw ApiError.notFound('That skill is not in your profile');
  }

  return sendSuccess(res, {
    data: { skill },
    message: 'Skill proficiency updated',
  });
}

// DELETE /api/profile/skills/:skillId
async function remove(req, res) {
  const { skillId } = req.validated.params;
  const deleted = await userSkillsService.removeUserSkill(req.user.id, skillId);

  if (!deleted) {
    throw ApiError.notFound('That skill is not in your profile');
  }

  return sendSuccess(res, {
    data: { skill_id: skillId },
    message: 'Skill removed from your profile',
  });
}

module.exports = { list, add, update, remove };
