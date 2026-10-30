// Application tracking endpoints.
const applicationsService = require('../services/applications.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const applications = await applicationsService.listApplications(
    req.user.id,
    req.validated.query
  );
  return sendSuccess(res, { data: { applications } });
}

async function summary(req, res) {
  const result = await applicationsService.summary(req.user.id);
  return sendSuccess(res, { data: result });
}

async function getOne(req, res) {
  const { applicationId } = req.validated.params;
  const application = await applicationsService.getApplication(
    req.user.id,
    applicationId
  );

  if (!application) throw ApiError.notFound(`Application ${applicationId} was not found`);
  return sendSuccess(res, { data: { application } });
}

async function create(req, res) {
  const result = await applicationsService.createApplication(
    req.user.id,
    req.validated.body
  );

  if (result.status === 'opportunity_not_found') {
    throw ApiError.notFound('That opportunity was not found');
  }
  if (result.status === 'title_required') {
    throw ApiError.badRequest('Provide an opportunity or a title');
  }

  return sendSuccess(res, {
    statusCode: 201,
    data: { application: result.application },
    message: 'Application added',
  });
}

async function update(req, res) {
  const { applicationId } = req.validated.params;
  const result = await applicationsService.updateApplication(
    req.user.id,
    applicationId,
    req.validated.body
  );

  if (result.status === 'not_found') {
    throw ApiError.notFound(`Application ${applicationId} was not found`);
  }
  if (result.status === 'opportunity_not_found') {
    throw ApiError.notFound('That opportunity was not found');
  }

  return sendSuccess(res, {
    data: { application: result.application },
    message: 'Application updated',
  });
}

async function remove(req, res) {
  const { applicationId } = req.validated.params;
  const deleted = await applicationsService.deleteApplication(
    req.user.id,
    applicationId
  );

  if (!deleted) throw ApiError.notFound(`Application ${applicationId} was not found`);
  return sendSuccess(res, {
    data: { application_id: applicationId },
    message: 'Application deleted',
  });
}

module.exports = { list, summary, getOne, create, update, remove };
