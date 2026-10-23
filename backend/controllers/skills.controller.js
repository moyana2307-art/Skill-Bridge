// Skills catalogue endpoints.
const skillsService = require('../services/skills.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/skills
async function list(req, res) {
  const { search, category, page, limit } = req.validated.query;
  const result = await skillsService.listSkills({ search, category, page, limit });

  return sendSuccess(res, {
    data: result.rows,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

// GET /api/skills/:id
async function getOne(req, res) {
  const { id } = req.validated.params;
  const skill = await skillsService.getSkillById(id);

  if (!skill) throw ApiError.notFound(`Skill ${id} was not found`);

  return sendSuccess(res, { data: skill });
}

// POST /api/skills
async function create(req, res) {
  const skill = await skillsService.createSkill(req.validated.body);

  return sendSuccess(res, {
    statusCode: 201,
    data: skill,
    message: 'Skill created',
  });
}

// PATCH /api/skills/:id
async function update(req, res) {
  const { id } = req.validated.params;
  const skill = await skillsService.updateSkill(id, req.validated.body);

  if (!skill) throw ApiError.notFound(`Skill ${id} was not found`);

  return sendSuccess(res, { data: skill, message: 'Skill updated' });
}

// DELETE /api/skills/:id
async function remove(req, res) {
  const { id } = req.validated.params;
  const deleted = await skillsService.deleteSkill(id);

  if (!deleted) throw ApiError.notFound(`Skill ${id} was not found`);

  return sendSuccess(res, { data: { id: Number(id) }, message: 'Skill deleted' });
}

module.exports = { list, getOne, create, update, remove };
