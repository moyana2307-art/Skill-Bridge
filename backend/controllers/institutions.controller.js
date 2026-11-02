// Institution management endpoints.
const institutionsService = require('../services/institutions.service');
const activityService = require('../services/activity.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const institutions = await institutionsService.listForUser(req.user.id);
  return sendSuccess(res, { data: { institutions } });
}

async function create(req, res) {
  const institution = await institutionsService.createInstitution(
    req.user.id,
    req.validated.body
  );

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'institution.created',
    entityType: 'institution',
    entityId: institution.id,
    title: `Created institution: ${institution.name || 'Untitled'}`,
    metadata: { status: institution.status },
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: { institution },
    message: 'Institution created and sent for platform approval',
  });
}

async function dashboard(req, res) {
  const { institutionId } = req.validated.params;
  const result = await institutionsService.dashboard(req.user.id, institutionId);
  if (!result) throw ApiError.notFound(`Institution ${institutionId} was not found`);
  return sendSuccess(res, { data: result });
}

async function update(req, res) {
  const { institutionId } = req.validated.params;
  const institution = await institutionsService.updateInstitution(
    req.user.id,
    institutionId,
    req.validated.body
  );
  if (!institution) throw ApiError.notFound(`Institution ${institutionId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'institution.updated',
    entityType: 'institution',
    entityId: institutionId,
    title: `Updated institution: ${institution.name || 'Untitled'}`,
    metadata: { fields: Object.keys(req.validated.body) },
    req,
  });

  return sendSuccess(res, { data: { institution }, message: 'Institution updated' });
}

async function addMember(req, res) {
  const { institutionId } = req.validated.params;
  const result = await institutionsService.addMember(
    req.user.id,
    institutionId,
    req.validated.body
  );

  if (result.status === 'institution_not_found') {
    throw ApiError.notFound(`Institution ${institutionId} was not found`);
  }
  if (result.status === 'user_not_found') {
    throw ApiError.notFound(
      `No SkillBridge AI account uses ${result.email}. Ask the student to register first.`
    );
  }
  if (result.status === 'already_member') {
    throw ApiError.conflict('That person is already a member of this institution.');
  }

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'institution.member_added',
    entityType: 'institution',
    entityId: institutionId,
    title: 'Added an institution member',
    metadata: { member_user_id: result.member?.user_id || null },
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: { member: result.member, plan_assigned: result.plan_assigned },
    message: 'Member added',
  });
}

async function bulkAddMembers(req, res) {
  const { institutionId } = req.validated.params;
  const result = await institutionsService.bulkAddMembers(
    req.user.id,
    institutionId,
    req.validated.body
  );

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'institution.members_bulk_added',
    entityType: 'institution',
    entityId: institutionId,
    title: `Added ${result.added} institution member${
      result.added === 1 ? '' : 's'
    }`,
    metadata: { added: result.added, skipped: result.skipped ?? null },
    req,
  });

  return sendSuccess(res, {
    data: result,
    message: `${result.added} member${result.added === 1 ? '' : 's'} added`,
  });
}

async function removeMember(req, res) {
  const { institutionId, userId } = req.validated.params;
  const removed = await institutionsService.removeMember(
    req.user.id,
    institutionId,
    userId
  );
  if (!removed) throw ApiError.notFound('That member was not found.');

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'institution.member_removed',
    entityType: 'institution',
    entityId: institutionId,
    title: 'Removed an institution member',
    metadata: { member_user_id: userId },
    req,
  });

  return sendSuccess(res, { data: { user_id: userId }, message: 'Member removed' });
}

async function updateMember(req, res) {
  const { institutionId, userId } = req.validated.params;
  const member = await institutionsService.updateMemberRole(
    req.user.id,
    institutionId,
    userId,
    req.validated.body
  );
  if (!member) throw ApiError.notFound('That member was not found.');
  return sendSuccess(res, { data: { member }, message: 'Member updated' });
}

module.exports = {
  list,
  create,
  dashboard,
  update,
  addMember,
  bulkAddMembers,
  removeMember,
  updateMember,
};
