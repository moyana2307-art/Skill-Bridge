// Projects and portfolio endpoints.
const projectsService = require('../services/projects.service');
const portfolioService = require('../services/portfolio.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const projects = await projectsService.listProjects(
    req.user.id,
    req.validated.query
  );
  return sendSuccess(res, { data: { projects } });
}

async function getOne(req, res) {
  const { projectId } = req.validated.params;
  const project = await projectsService.getProject(req.user.id, projectId);
  if (!project) throw ApiError.notFound(`Project ${projectId} was not found`);
  return sendSuccess(res, { data: { project } });
}

async function create(req, res) {
  const project = await projectsService.createProject(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    data: { project },
    message: 'Project created',
  });
}

async function update(req, res) {
  const { projectId } = req.validated.params;
  const project = await projectsService.updateProject(
    req.user.id,
    projectId,
    req.validated.body
  );
  if (!project) throw ApiError.notFound(`Project ${projectId} was not found`);
  return sendSuccess(res, { data: { project }, message: 'Project updated' });
}

async function remove(req, res) {
  const { projectId } = req.validated.params;
  const deleted = await projectsService.deleteProject(req.user.id, projectId);
  if (!deleted) throw ApiError.notFound(`Project ${projectId} was not found`);
  return sendSuccess(res, {
    data: { project_id: projectId },
    message: 'Project deleted',
  });
}

async function submit(req, res) {
  const { projectId } = req.validated.params;
  const project = await projectsService.submitProject(req.user.id, projectId);
  if (!project) throw ApiError.notFound(`Project ${projectId} was not found`);
  return sendSuccess(res, { data: { project }, message: 'Project submitted' });
}

async function evaluate(req, res) {
  const { projectId } = req.validated.params;
  const result = await projectsService.evaluateProject(req.user.id, projectId);
  if (!result) throw ApiError.notFound(`Project ${projectId} was not found`);
  return sendSuccess(res, { data: result, message: 'Project evaluated' });
}

async function recommendations(req, res) {
  const result = await projectsService.recommendations(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, { data: result, message: 'Project ideas ready' });
}

async function getPortfolioSettings(req, res) {
  const settings = await portfolioService.getSettings(req.user.id);
  if (!settings) throw ApiError.notFound('Profile not found');
  return sendSuccess(res, { data: { settings } });
}

async function updatePortfolioSettings(req, res) {
  const settings = await portfolioService.updateSettings(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    data: { settings },
    message: 'Portfolio settings saved',
  });
}

async function publicPortfolio(req, res) {
  const { slug } = req.validated.params;
  const portfolio = await portfolioService.getPublicPortfolio(slug);
  if (!portfolio) throw ApiError.notFound('That portfolio is not available');
  return sendSuccess(res, { data: { portfolio } });
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  submit,
  evaluate,
  recommendations,
  getPortfolioSettings,
  updatePortfolioSettings,
  publicPortfolio,
};
