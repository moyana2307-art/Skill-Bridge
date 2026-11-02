// Admin-only management and analytics endpoints.
const adminService = require('../services/admin.service');
const adminDashboardService = require('../services/adminDashboard.service');
const adminControlCentre = require('../services/adminControlCentre.service');
const notificationsService = require('../services/notifications.service');
const activityService = require('../services/activity.service');
const adminAudit = require('../services/adminAudit.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { toCsv, sendCsv } = require('../utils/csv');

function paginationMeta(result) {
  return {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 0,
  };
}

async function overview(req, res) {
  const data = await adminService.overview();
  return sendSuccess(res, { data: { overview: data } });
}

async function dashboard(req, res) {
  const data = await adminDashboardService.dashboard();
  return sendSuccess(res, { data: { dashboard: data } });
}

async function listActivity(req, res) {
  const result = await activityService.listActivity(req.validated.query);
  return sendSuccess(res, {
    data: {
      activity: result.activity,
      event_types: result.event_types,
    },
    meta: paginationMeta(result),
  });
}

async function listUsers(req, res) {
  const result = await adminControlCentre.listUsers(req.validated.query);
  return sendSuccess(res, {
    data: { users: result.users },
    meta: paginationMeta(result),
  });
}

async function getUser(req, res) {
  const { userId } = req.validated.params;
  const detail = await adminControlCentre.getUserDetail(userId);
  if (!detail) throw ApiError.notFound(`User ${userId} was not found`);
  return sendSuccess(res, { data: detail });
}

async function getUserActivity(req, res) {
  const { userId } = req.validated.params;
  const detail = await adminControlCentre.getUserDetail(userId);
  if (!detail) throw ApiError.notFound(`User ${userId} was not found`);

  const result = await adminControlCentre.getUserActivities(
    userId,
    req.validated.query
  );
  return sendSuccess(res, {
    data: { activities: result.activities },
    meta: paginationMeta(result),
  });
}

async function suspendUser(req, res) {
  const { userId } = req.validated.params;
  const { reason } = req.validated.body;
  const result = await adminControlCentre.suspendUser(req.user.id, userId, reason || null);
  if (!result) throw ApiError.notFound(`User ${userId} was not found`);

  const { user, before } = result;
  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'user.suspended',
    targetType: 'user',
    targetId: userId,
    targetLabel: user.email,
    before,
    after: user,
    metadata: { reason: reason || null },
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.user_suspended',
    entityType: 'user',
    entityId: userId,
    title: `Suspended ${user.email}`,
    metadata: { target_name: user.name, reason: reason || null },
    req,
  });
  await notificationsService.notify(userId, {
    type: 'account',
    title: 'Your account has been suspended',
    body: reason
      ? `Reason: ${reason}. Contact SkillBridge AI support if you believe this is a mistake.`
      : 'Contact SkillBridge AI support if you believe this is a mistake.',
  });

  return sendSuccess(res, { data: { user }, message: 'User suspended' });
}

async function reactivateUser(req, res) {
  const { userId } = req.validated.params;
  const result = await adminControlCentre.reactivateUser(req.user.id, userId);
  if (!result) throw ApiError.notFound(`User ${userId} was not found`);

  const { user, before } = result;
  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'user.reactivated',
    targetType: 'user',
    targetId: userId,
    targetLabel: user.email,
    before,
    after: user,
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.user_reactivated',
    entityType: 'user',
    entityId: userId,
    title: `Reactivated ${user.email}`,
    metadata: { target_name: user.name },
    req,
  });
  await notificationsService.notify(userId, {
    type: 'account',
    title: 'Your account has been reactivated',
    body: 'You can sign in and use SkillBridge AI again.',
  });

  return sendSuccess(res, { data: { user }, message: 'User reactivated' });
}

async function updateUser(req, res) {
  const { userId } = req.validated.params;
  const result = await adminService.updateUser(
    req.user.id,
    userId,
    req.validated.body
  );
  if (!result) throw ApiError.notFound(`User ${userId} was not found`);

  const { user, before } = result;
  const fields = Object.keys(req.validated.body).filter(
    (field) => field !== 'plan_reason'
  );
  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'user.updated',
    targetType: 'user',
    targetId: userId,
    targetLabel: user.email,
    before,
    after: user,
    metadata: { fields, plan_reason: req.validated.body.plan_reason || null },
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.user_updated',
    entityType: 'user',
    entityId: userId,
    title: `Updated ${user.email}`,
    metadata: {
      fields,
      target_name: user.name,
    },
    req,
  });

  return sendSuccess(res, { data: { user }, message: 'User updated' });
}

async function removeUser(req, res) {
  const { userId } = req.validated.params;
  const result = await adminService.deleteUser(req.user.id, userId);
  if (!result?.deleted) throw ApiError.notFound(`User ${userId} was not found`);

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'user.deleted',
    targetType: 'user',
    targetId: userId,
    targetLabel: result.before?.email || null,
    before: result.before,
    after: null,
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.user_deleted',
    entityType: 'user',
    entityId: userId,
    title: `Deleted ${result.before?.email || `user ${userId}`}`,
    metadata: { target_name: result.before?.name || null },
    req,
  });

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
  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'announcement.sent',
    targetType: 'announcement',
    targetLabel: title,
    after: { title, body, link: link || null, sent },
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.announcement_sent',
    entityType: 'announcement',
    title: `Sent announcement: ${title}`,
    metadata: { sent },
    req,
  });
  return sendSuccess(res, {
    statusCode: 201,
    data: { sent },
    message: 'Announcement sent',
  });
}

async function financialOverview(req, res) {
  const financial = await adminControlCentre.financialOverview(
    req.validated.query
  );
  return sendSuccess(res, { data: { financial } });
}

async function listTransactions(req, res) {
  const result = await adminControlCentre.listTransactions(
    req.validated.query
  );
  return sendSuccess(res, {
    data: { transactions: result.transactions },
    meta: paginationMeta(result),
  });
}

async function getTransaction(req, res) {
  const { transactionId } = req.validated.params;
  const transaction = await adminControlCentre.getTransaction(transactionId);
  if (!transaction) {
    throw ApiError.notFound(`Transaction ${transactionId} was not found`);
  }
  return sendSuccess(res, { data: { transaction } });
}

async function listSubscriptions(req, res) {
  const result = await adminControlCentre.listSubscriptions(
    req.validated.query
  );
  return sendSuccess(res, {
    data: { subscriptions: result.subscriptions },
    meta: paginationMeta(result),
  });
}

async function getSubscription(req, res) {
  const { subscriptionId } = req.validated.params;
  const detail = await adminControlCentre.getSubscription(subscriptionId);
  if (!detail) {
    throw ApiError.notFound(`Subscription ${subscriptionId} was not found`);
  }
  return sendSuccess(res, { data: detail });
}

async function analytics(req, res) {
  const data = await adminControlCentre.analytics(req.validated.query);
  return sendSuccess(res, { data: { analytics: data } });
}

async function listAuditLogs(req, res) {
  const result = await adminControlCentre.listAuditLogs(req.validated.query);
  return sendSuccess(res, {
    data: { logs: result.logs },
    meta: paginationMeta(result),
  });
}

async function exportUsers(req, res) {
  const rows = await adminControlCentre.exportUsers(req.validated.query);
  const csv = toCsv(rows, [
    { label: 'ID', value: (row) => row.id },
    { label: 'Name', value: (row) => row.name },
    { label: 'Email', value: (row) => row.email },
    { label: 'Role', value: (row) => row.role },
    { label: 'Status', value: (row) => row.status },
    { label: 'Plan', value: (row) => row.plan_code },
    { label: 'Plan name', value: (row) => row.plan_name },
    { label: 'Subscription status', value: (row) => row.subscription_status },
    { label: 'Last login', value: (row) => row.last_login_at },
    { label: 'Last active', value: (row) => row.last_active_at },
    { label: 'Registered', value: (row) => row.created_at },
    { label: 'Assessments', value: (row) => row.career_assessment_count },
    { label: 'Roadmaps', value: (row) => row.roadmap_count },
    { label: 'CVs', value: (row) => row.cv_count },
    { label: 'Projects completed', value: (row) => row.projects_completed },
    { label: 'Payments', value: (row) => row.payment_count },
    { label: 'Amount paid (cents)', value: (row) => row.amount_paid_cents },
    { label: 'AI interactions', value: (row) => row.ai_interaction_count },
  ]);

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'users.exported',
    targetType: 'export',
    targetLabel: 'users.csv',
    metadata: { rows: rows.length, filters: req.validated.query },
    req,
  });

  return sendCsv(res, `skillbridge-users-${Date.now()}.csv`, csv);
}

async function exportTransactions(req, res) {
  const rows = await adminControlCentre.exportTransactions(
    req.validated.query
  );
  const csv = toCsv(rows, [
    { label: 'ID', value: (row) => row.id },
    { label: 'Created', value: (row) => row.created_at },
    { label: 'User', value: (row) => row.user_name },
    { label: 'Email', value: (row) => row.user_email },
    { label: 'Plan', value: (row) => row.plan_code },
    { label: 'Plan name', value: (row) => row.plan_name },
    { label: 'Amount (cents)', value: (row) => row.amount_cents },
    {
      label: 'Refunded (cents)',
      value: (row) => row.refunded_amount_cents,
    },
    { label: 'Currency', value: (row) => row.currency },
    { label: 'Provider', value: (row) => row.provider },
    { label: 'Reference', value: (row) => row.provider_reference },
    { label: 'Provider transaction', value: (row) => row.provider_transaction_id },
    { label: 'Status', value: (row) => row.status },
    { label: 'Paid at', value: (row) => row.paid_at },
    { label: 'Refunded at', value: (row) => row.refunded_at },
  ]);

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'transactions.exported',
    targetType: 'export',
    targetLabel: 'transactions.csv',
    metadata: { rows: rows.length, filters: req.validated.query },
    req,
  });

  return sendCsv(res, `skillbridge-transactions-${Date.now()}.csv`, csv);
}

async function exportSubscriptions(req, res) {
  const rows = await adminControlCentre.exportSubscriptions(
    req.validated.query
  );
  const csv = toCsv(rows, [
    { label: 'ID', value: (row) => row.id },
    { label: 'User', value: (row) => row.user_name },
    { label: 'Email', value: (row) => row.user_email },
    { label: 'Plan', value: (row) => row.plan_code },
    { label: 'Plan name', value: (row) => row.plan_name },
    { label: 'Status', value: (row) => row.status },
    { label: 'Source', value: (row) => row.source },
    { label: 'Amount (cents)', value: (row) => row.amount_cents },
    { label: 'Currency', value: (row) => row.currency },
    { label: 'Billing interval', value: (row) => row.billing_interval },
    { label: 'Started', value: (row) => row.started_at },
    { label: 'Period start', value: (row) => row.current_period_start },
    { label: 'Period end', value: (row) => row.current_period_end },
    { label: 'Cancelled at', value: (row) => row.canceled_at },
    { label: 'Cancel reason', value: (row) => row.cancel_reason },
  ]);

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'subscriptions.exported',
    targetType: 'export',
    targetLabel: 'subscriptions.csv',
    metadata: { rows: rows.length, filters: req.validated.query },
    req,
  });

  return sendCsv(res, `skillbridge-subscriptions-${Date.now()}.csv`, csv);
}

async function listPlanRequests(req, res) {
  const result = await adminService.listPlanRequests(req.validated.query);
  return sendSuccess(res, {
    data: { requests: result.requests },
    meta: paginationMeta(result),
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

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'plan_request.reviewed',
    targetType: 'plan_request',
    targetId: requestId,
    targetLabel: `Plan request ${requestId}`,
    after: request,
    metadata: {
      status: req.validated.body.status,
      user_id: request.user_id,
      plan_code: request.plan_code,
    },
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.plan_request_reviewed',
    entityType: 'plan_request',
    entityId: requestId,
    title: `Plan request ${req.validated.body.status}`,
    metadata: {
      target_user_id: request.user_id,
      plan_code: request.plan_code,
      status: req.validated.body.status,
    },
    req,
  });

  return sendSuccess(res, { data: { request }, message: 'Plan request reviewed' });
}

async function listInstitutions(req, res) {
  const result = await adminService.listInstitutions(req.validated.query);
  return sendSuccess(res, {
    data: { institutions: result.institutions },
    meta: paginationMeta(result),
  });
}

async function updateInstitution(req, res) {
  const { institutionId } = req.validated.params;
  const institution = await adminService.updateInstitution(
    institutionId,
    req.validated.body
  );
  if (!institution) throw ApiError.notFound(`Institution ${institutionId} was not found`);

  await adminAudit.recordAudit({
    adminId: req.user.id,
    adminName: req.user.name,
    action: 'institution.updated',
    targetType: 'institution',
    targetId: institutionId,
    targetLabel: institution.name,
    after: institution,
    metadata: { fields: Object.keys(req.validated.body) },
    req,
  });
  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'admin.institution_updated',
    entityType: 'institution',
    entityId: institutionId,
    title: `Updated institution ${institution.name}`,
    metadata: {
      fields: Object.keys(req.validated.body),
      status: institution.status,
    },
    req,
  });

  return sendSuccess(res, {
    data: { institution },
    message: 'Institution updated',
  });
}

module.exports = {
  overview,
  dashboard,
  listActivity,
  listUsers,
  getUser,
  getUserActivity,
  suspendUser,
  reactivateUser,
  updateUser,
  removeUser,
  announce,
  financialOverview,
  listTransactions,
  getTransaction,
  listSubscriptions,
  getSubscription,
  analytics,
  listAuditLogs,
  exportUsers,
  exportTransactions,
  exportSubscriptions,
  listPlanRequests,
  reviewPlanRequest,
  listInstitutions,
  updateInstitution,
};
