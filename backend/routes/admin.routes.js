// Admin-only management and analytics endpoints.
const express = require('express');
const controller = require('../controllers/admin.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { broadcastBody } = require('../validators/notifications.validator');
const {
  listUsersQuery,
  listActivityQuery,
  userIdParams,
  updateUserBody,
  suspendUserBody,
  transactionIdParams,
  subscriptionIdParams,
  listTransactionsQuery,
  listSubscriptionsQuery,
  analyticsQuery,
  listAuditLogsQuery,
} = require('../validators/admin.validator');
const {
  requestIdParams,
  reviewRequestBody,
  listRequestsQuery,
} = require('../validators/subscriptions.validator');
const {
  institutionIdParams,
  adminUpdateInstitutionBody,
  listInstitutionsQuery,
} = require('../validators/institutions.validator');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', asyncHandler(controller.overview));
router.get('/dashboard', asyncHandler(controller.dashboard));
router.get('/activity', validate({ query: listActivityQuery }), asyncHandler(controller.listActivity));

// Literal export routes must be declared before parameterised ones.
router.get('/users/export', validate({ query: listUsersQuery }), asyncHandler(controller.exportUsers));
router.get('/users', validate({ query: listUsersQuery }), asyncHandler(controller.listUsers));
router.get('/users/:userId/activity', validate({ params: userIdParams, query: listActivityQuery }), asyncHandler(controller.getUserActivity));
router.get('/users/:userId', validate({ params: userIdParams }), asyncHandler(controller.getUser));
router.patch('/users/:userId', validate({ params: userIdParams, body: updateUserBody }), asyncHandler(controller.updateUser));
router.post('/users/:userId/suspend', validate({ params: userIdParams, body: suspendUserBody }), asyncHandler(controller.suspendUser));
router.post('/users/:userId/reactivate', validate({ params: userIdParams }), asyncHandler(controller.reactivateUser));
router.delete('/users/:userId', validate({ params: userIdParams }), asyncHandler(controller.removeUser));

router.get('/financial-overview', validate({ query: analyticsQuery }), asyncHandler(controller.financialOverview));

router.get('/transactions/export', validate({ query: listTransactionsQuery }), asyncHandler(controller.exportTransactions));
router.get('/transactions', validate({ query: listTransactionsQuery }), asyncHandler(controller.listTransactions));
router.get('/transactions/:transactionId', validate({ params: transactionIdParams }), asyncHandler(controller.getTransaction));

router.get('/subscriptions/export', validate({ query: listSubscriptionsQuery }), asyncHandler(controller.exportSubscriptions));
router.get('/subscriptions', validate({ query: listSubscriptionsQuery }), asyncHandler(controller.listSubscriptions));
router.get('/subscriptions/:subscriptionId', validate({ params: subscriptionIdParams }), asyncHandler(controller.getSubscription));

router.get('/analytics', validate({ query: analyticsQuery }), asyncHandler(controller.analytics));
router.get('/audit-logs', validate({ query: listAuditLogsQuery }), asyncHandler(controller.listAuditLogs));

router.post('/announcements', validate({ body: broadcastBody }), asyncHandler(controller.announce));

router.get('/plan-requests', validate({ query: listRequestsQuery }), asyncHandler(controller.listPlanRequests));
router.patch(
  '/plan-requests/:requestId',
  validate({ params: requestIdParams, body: reviewRequestBody }),
  asyncHandler(controller.reviewPlanRequest)
);
router.get('/institutions', validate({ query: listInstitutionsQuery }), asyncHandler(controller.listInstitutions));
router.patch(
  '/institutions/:institutionId',
  validate({ params: institutionIdParams, body: adminUpdateInstitutionBody }),
  asyncHandler(controller.updateInstitution)
);

module.exports = router;
