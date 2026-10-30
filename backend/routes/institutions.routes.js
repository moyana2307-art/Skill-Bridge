// Institution management for universities, colleges, NGOs, and training
// providers. Any logged-in user can create one and becomes its administrator.
const express = require('express');
const controller = require('../controllers/institutions.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const {
  institutionIdParams,
  memberParams,
  createInstitutionBody,
  updateInstitutionBody,
  addMemberBody,
  bulkMembersBody,
  updateMemberBody,
} = require('../validators/institutions.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post(
  '/',
  writeLimiter,
  validate({ body: createInstitutionBody }),
  asyncHandler(controller.create)
);

router.get(
  '/:institutionId',
  validate({ params: institutionIdParams }),
  asyncHandler(controller.dashboard)
);
router.patch(
  '/:institutionId',
  validate({ params: institutionIdParams, body: updateInstitutionBody }),
  asyncHandler(controller.update)
);

router.post(
  '/:institutionId/members',
  writeLimiter,
  validate({ params: institutionIdParams, body: addMemberBody }),
  asyncHandler(controller.addMember)
);
router.post(
  '/:institutionId/members/bulk',
  writeLimiter,
  validate({ params: institutionIdParams, body: bulkMembersBody }),
  asyncHandler(controller.bulkAddMembers)
);
router.patch(
  '/:institutionId/members/:userId',
  validate({ params: memberParams, body: updateMemberBody }),
  asyncHandler(controller.updateMember)
);
router.delete(
  '/:institutionId/members/:userId',
  validate({ params: memberParams }),
  asyncHandler(controller.removeMember)
);

module.exports = router;
