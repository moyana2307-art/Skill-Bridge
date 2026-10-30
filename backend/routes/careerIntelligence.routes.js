// AI Career Intelligence endpoints.
const express = require('express');
const controller = require('../controllers/careerIntelligence.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const requireFeature = require('../middleware/requireFeature');
const {
  assessmentBody,
  recommendationsBody,
  compareBody,
  requirementsBody,
} = require('../validators/careerIntelligence.validator');

const router = express.Router();

router.use(requireAuth);

router.post('/assessments', aiLimiter, requireFeature('career_assessment'), validate({ body: assessmentBody }), asyncHandler(controller.runAssessment));
router.get('/assessments/latest', asyncHandler(controller.latestAssessment));

router.post('/recommendations', aiLimiter, requireFeature('career_recommendations'), validate({ body: recommendationsBody }), asyncHandler(controller.recommendations));
router.get('/recommendations/latest', asyncHandler(controller.latestRecommendations));

router.post('/compare', aiLimiter, requireFeature('career_compare'), validate({ body: compareBody }), asyncHandler(controller.compare));
router.get('/compare/latest', asyncHandler(controller.latestComparison));

router.post('/requirements', aiLimiter, requireFeature('career_requirements'), validate({ body: requirementsBody }), asyncHandler(controller.requirements));
router.get('/requirements/latest', asyncHandler(controller.latestRequirements));

module.exports = router;
