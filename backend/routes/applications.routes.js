// Application tracking endpoints.
const express = require('express');
const controller = require('../controllers/applications.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  listApplicationsQuery,
  applicationIdParams,
  createApplicationBody,
  updateApplicationBody,
} = require('../validators/applications.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listApplicationsQuery }), asyncHandler(controller.list));
router.get('/summary', asyncHandler(controller.summary));
router.post('/', validate({ body: createApplicationBody }), asyncHandler(controller.create));
router.get('/:applicationId', validate({ params: applicationIdParams }), asyncHandler(controller.getOne));
router.patch('/:applicationId', validate({ params: applicationIdParams, body: updateApplicationBody }), asyncHandler(controller.update));
router.delete('/:applicationId', validate({ params: applicationIdParams }), asyncHandler(controller.remove));

module.exports = router;
