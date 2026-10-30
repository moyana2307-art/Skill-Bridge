// Learning resource catalogue.
const express = require('express');
const controller = require('../controllers/learningResources.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  listResourcesQuery,
  resourceIdParams,
  createResourceBody,
  updateResourceBody,
} = require('../validators/learningResources.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listResourcesQuery }), asyncHandler(controller.list));
router.get('/:resourceId', validate({ params: resourceIdParams }), asyncHandler(controller.getOne));

router.post('/', requireRole('admin'), validate({ body: createResourceBody }), asyncHandler(controller.create));
router.patch('/:resourceId', requireRole('admin'), validate({ params: resourceIdParams, body: updateResourceBody }), asyncHandler(controller.update));
router.delete('/:resourceId', requireRole('admin'), validate({ params: resourceIdParams }), asyncHandler(controller.remove));

module.exports = router;
