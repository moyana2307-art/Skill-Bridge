// Learning resource catalogue endpoints.
const learningResourcesService = require('../services/learningResources.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const result = await learningResourcesService.listResources(req.validated.query);
  return sendSuccess(res, {
    data: { resources: result.resources },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

async function getOne(req, res) {
  const { resourceId } = req.validated.params;
  const resource = await learningResourcesService.getResource(resourceId);
  if (!resource) throw ApiError.notFound(`Resource ${resourceId} was not found`);
  return sendSuccess(res, { data: { resource } });
}

async function create(req, res) {
  const resource = await learningResourcesService.createResource(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    data: { resource },
    message: 'Learning resource created',
  });
}

async function update(req, res) {
  const { resourceId } = req.validated.params;
  const resource = await learningResourcesService.updateResource(
    resourceId,
    req.validated.body
  );
  if (!resource) throw ApiError.notFound(`Resource ${resourceId} was not found`);
  return sendSuccess(res, { data: { resource }, message: 'Learning resource updated' });
}

async function remove(req, res) {
  const { resourceId } = req.validated.params;
  const deleted = await learningResourcesService.deleteResource(resourceId);
  if (!deleted) throw ApiError.notFound(`Resource ${resourceId} was not found`);
  return sendSuccess(res, {
    data: { resource_id: resourceId },
    message: 'Learning resource deleted',
  });
}

module.exports = { list, getOne, create, update, remove };
