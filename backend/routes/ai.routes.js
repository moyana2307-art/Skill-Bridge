// AI career endpoints. All routes require a login because they read the
// current user's profile, skills, goals, and saved data.
//
//   POST /api/ai/skills-gap
//   GET  /api/ai/skills-gap/latest
//   POST /api/ai/roadmaps
//   POST /api/ai/opportunity-insight
//   POST /api/ai/profile-review
//   GET  /api/ai/profile-review/latest
const express = require('express');
const aiController = require('../controllers/ai.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const {
  skillsGapBody,
  generateRoadmapBody,
  opportunityInsightBody,
} = require('../validators/ai.validator');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/skills-gap',
  validate({ body: skillsGapBody }),
  asyncHandler(aiController.skillsGap)
);
router.get('/skills-gap/latest', asyncHandler(aiController.latestSkillsGap));

router.post(
  '/roadmaps',
  validate({ body: generateRoadmapBody }),
  asyncHandler(aiController.generateRoadmap)
);

router.post(
  '/opportunity-insight',
  validate({ body: opportunityInsightBody }),
  asyncHandler(aiController.opportunityInsight)
);

router.post('/profile-review', asyncHandler(aiController.profileReview));
router.get('/profile-review/latest', asyncHandler(aiController.latestProfileReview));

module.exports = router;
