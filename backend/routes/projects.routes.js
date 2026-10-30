// Projects and portfolio endpoints.
const express = require('express');
const controller = require('../controllers/projects.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const requireFeature = require('../middleware/requireFeature');
const {
  listProjectsQuery,
  projectIdParams,
  createProjectBody,
  updateProjectBody,
  recommendationsBody,
} = require('../validators/projects.validator');

const router = express.Router();

router.use(requireAuth);

router.post('/recommendations', aiLimiter, requireFeature('project_ideas'), validate({ body: recommendationsBody }), asyncHandler(controller.recommendations));

router.get('/', validate({ query: listProjectsQuery }), asyncHandler(controller.list));
router.post('/', validate({ body: createProjectBody }), asyncHandler(controller.create));
router.get('/:projectId', validate({ params: projectIdParams }), asyncHandler(controller.getOne));
router.patch('/:projectId', validate({ params: projectIdParams, body: updateProjectBody }), asyncHandler(controller.update));
router.delete('/:projectId', validate({ params: projectIdParams }), asyncHandler(controller.remove));
router.post('/:projectId/submit', validate({ params: projectIdParams }), asyncHandler(controller.submit));
router.post('/:projectId/evaluate', aiLimiter, requireFeature('project_evaluations'), validate({ params: projectIdParams }), asyncHandler(controller.evaluate));

module.exports = router;
