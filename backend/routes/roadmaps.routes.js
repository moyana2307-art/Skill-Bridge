// Learning roadmap endpoints. All routes require a login and are scoped to
// the current user.
//
//   GET    /api/roadmaps
//   POST   /api/roadmaps
//   GET    /api/roadmaps/:roadmapId
//   PATCH  /api/roadmaps/:roadmapId
//   DELETE /api/roadmaps/:roadmapId
//   POST   /api/roadmaps/:roadmapId/tasks
//   PATCH  /api/roadmaps/:roadmapId/tasks/:taskId
//   DELETE /api/roadmaps/:roadmapId/tasks/:taskId
const express = require('express');
const roadmapsController = require('../controllers/roadmaps.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  createRoadmapBody,
  updateRoadmapBody,
  listRoadmapsQuery,
  roadmapIdParams,
  roadmapTaskParams,
  createRoadmapTaskBody,
  updateRoadmapTaskBody,
} = require('../validators/roadmaps.validator');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  validate({ query: listRoadmapsQuery }),
  asyncHandler(roadmapsController.list)
);
router.post(
  '/',
  validate({ body: createRoadmapBody }),
  asyncHandler(roadmapsController.create)
);
router.get(
  '/:roadmapId',
  validate({ params: roadmapIdParams }),
  asyncHandler(roadmapsController.getOne)
);
router.patch(
  '/:roadmapId',
  validate({ params: roadmapIdParams, body: updateRoadmapBody }),
  asyncHandler(roadmapsController.update)
);
router.delete(
  '/:roadmapId',
  validate({ params: roadmapIdParams }),
  asyncHandler(roadmapsController.remove)
);

router.post(
  '/:roadmapId/tasks',
  validate({
    params: roadmapIdParams,
    body: createRoadmapTaskBody,
  }),
  asyncHandler(roadmapsController.createTask)
);
router.patch(
  '/:roadmapId/tasks/:taskId',
  validate({
    params: roadmapTaskParams,
    body: updateRoadmapTaskBody,
  }),
  asyncHandler(roadmapsController.updateTask)
);
router.delete(
  '/:roadmapId/tasks/:taskId',
  validate({ params: roadmapTaskParams }),
  asyncHandler(roadmapsController.removeTask)
);

module.exports = router;
