// Admin-only management and analytics endpoints.
const adminService = require('../services/admin.service');
const notificationsService = require('../services/notifications.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function overview(req, res) {
  const data = await adminService.overview();
  return sendSuccess(res, { data: { overview: data } });
}

async function listUsers(req, res) {
  const result = await adminService.listUsers(req.validated.query);
  return sendSuccess(res, {
    data: { users: result.users },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

async function updateUser(req, res) {
  const { userId } = req.validated.params;
  const user = await adminService.updateUser(
    req.user.id,
    userId,
    req.validated.body
  );
  if (!user) throw ApiError.notFound(`User ${userId} was not found`);
  return sendSuccess(res, { data: { user }, message: 'User updated' });
}

async function removeUser(req, res) {
  const { userId } = req.validated.params;
  const deleted = await adminService.deleteUser(req.user.id, userId);
  if (!deleted) throw ApiError.notFound(`User ${userId} was not found`);
  return sendSuccess(res, { data: { user_id: userId }, message: 'User deleted' });
}

async function announce(req, res) {
  const { title, body, link } = req.validated.body;
  const sent = await notificationsService.broadcast({
    type: 'announcement',
    title,
    body,
    link: link || null,
  });
  return sendSuccess(res, {
    statusCode: 201,
    data: { sent },
    message: 'Announcement sent',
  });
}

async function listSubscriptions(req, res) {
  const result = await adminService.listSubscriptions(req.validated.query);
  return sendSuccess(res, {
    data: { subscriptions: result.subscriptions },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

async function listPlanRequests(req, res) {
  const result = await adminService.listPlanRequests(req.validated.query);
  return sendSuccess(res, {
    data: { requests: result.requests },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

async function reviewPlanRequest(req, res) {
  const { requestId } = req.validated.params;
  const request = await adminService.reviewPlanRequest(
    req.user.id,
    requestId,
    req.validated.body.status
  );
  if (!request) throw ApiError.notFound(`Plan request ${requestId} was not found`);
  return sendSuccess(res, { data: { request }, message: 'Plan request reviewed' });
}

async function listInstitutions(req, res) {
  const result = await adminService.listInstitutions(req.validated.query);
  return sendSuccess(res, {
    data: { institutions: result.institutions },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

async function updateInstitution(req, res) {
  const { institutionId } = req.validated.params;
  const institution = await adminService.updateInstitution(
    institutionId,
    req.validated.body
  );
  if (!institution) throw ApiError.notFound(`Institution ${institutionId} was not found`);
  return sendSuccess(res, {
    data: { institution },
    message: 'Institution updated',
  });
}

module.exports = {
  overview,
  listUsers,
  updateUser,
  removeUser,
  announce,
  listSubscriptions,
  listPlanRequests,
  reviewPlanRequest,
  listInstitutions,
  updateInstitution,
};
