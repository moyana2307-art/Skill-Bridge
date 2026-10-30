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
  userIdParams,
  updateUserBody,
} = require('../validators/admin.validator');
const {
  requestIdParams,
  reviewRequestBody,
  listRequestsQuery,
  listSubscriptionsQuery,
} = require('../validators/subscriptions.validator');
const {
  institutionIdParams,
  adminUpdateInstitutionBody,
  listInstitutionsQuery,
} = require('../validators/institutions.validator');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', asyncHandler(controller.overview));
router.get('/users', validate({ query: listUsersQuery }), asyncHandler(controller.listUsers));
router.patch('/users/:userId', validate({ params: userIdParams, body: updateUserBody }), asyncHandler(controller.updateUser));
router.delete('/users/:userId', validate({ params: userIdParams }), asyncHandler(controller.removeUser));
router.post('/announcements', validate({ body: broadcastBody }), asyncHandler(controller.announce));

router.get('/subscriptions', validate({ query: listSubscriptionsQuery }), asyncHandler(controller.listSubscriptions));
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
