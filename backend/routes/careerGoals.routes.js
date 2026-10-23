// Career goal endpoints. All routes require a login and are scoped to the
// current user.
//
//   GET    /api/career-goals
//   GET    /api/career-goals/:goalId
//   POST   /api/career-goals
//   PATCH  /api/career-goals/:goalId
//   DELETE /api/career-goals/:goalId
const express = require('express');
const careerGoalsController = require('../controllers/careerGoals.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  createCareerGoalBody,
  updateCareerGoalBody,
  listCareerGoalsQuery,
  careerGoalIdParams,
} = require('../validators/careerGoals.validator');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  validate({ query: listCareerGoalsQuery }),
  asyncHandler(careerGoalsController.list)
);
router.post(
  '/',
  validate({ body: createCareerGoalBody }),
  asyncHandler(careerGoalsController.create)
);
router.get(
  '/:goalId',
  validate({ params: careerGoalIdParams }),
  asyncHandler(careerGoalsController.getOne)
);
router.patch(
  '/:goalId',
  validate({ params: careerGoalIdParams, body: updateCareerGoalBody }),
  asyncHandler(careerGoalsController.update)
);
router.delete(
  '/:goalId',
  validate({ params: careerGoalIdParams }),
  asyncHandler(careerGoalsController.remove)
);

module.exports = router;
