// CV, cover letter, and mock interview endpoints.
const express = require('express');
const controller = require('../controllers/careerStudio.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const requireFeature = require('../middleware/requireFeature');
const {
  cvIdParams,
  coverLetterIdParams,
  interviewIdParams,
  generateCvBody,
  updateCvBody,
  analyzeCvBody,
  coverLetterBody,
  startInterviewBody,
  answerBody,
} = require('../validators/careerStudio.validator');

const router = express.Router();

router.use(requireAuth);

router.post('/cvs', aiLimiter, requireFeature('cv_builder'), validate({ body: generateCvBody }), asyncHandler(controller.generateCv));
router.get('/cvs', asyncHandler(controller.listCvs));
router.get('/cvs/:cvId', validate({ params: cvIdParams }), asyncHandler(controller.getCv));
router.patch('/cvs/:cvId', validate({ params: cvIdParams, body: updateCvBody }), asyncHandler(controller.updateCv));
router.delete('/cvs/:cvId', validate({ params: cvIdParams }), asyncHandler(controller.removeCv));
router.post('/cvs/:cvId/analyze', aiLimiter, requireFeature('cv_analysis'), validate({ params: cvIdParams, body: analyzeCvBody }), asyncHandler(controller.analyzeCv));

router.post('/cover-letters', aiLimiter, requireFeature('cover_letters'), validate({ body: coverLetterBody }), asyncHandler(controller.createCoverLetter));
router.get('/cover-letters', asyncHandler(controller.listCoverLetters));
router.delete('/cover-letters/:coverLetterId', validate({ params: coverLetterIdParams }), asyncHandler(controller.removeCoverLetter));

router.post('/interviews', aiLimiter, requireFeature('mock_interviews'), validate({ body: startInterviewBody }), asyncHandler(controller.startInterview));
router.get('/interviews', asyncHandler(controller.listInterviews));
router.get('/interviews/:interviewId', validate({ params: interviewIdParams }), asyncHandler(controller.getInterview));
router.post('/interviews/:interviewId/answers', aiLimiter, validate({ params: interviewIdParams, body: answerBody }), asyncHandler(controller.answerQuestion));
router.post('/interviews/:interviewId/complete', validate({ params: interviewIdParams }), asyncHandler(controller.completeInterview));
router.delete('/interviews/:interviewId', validate({ params: interviewIdParams }), asyncHandler(controller.removeInterview));

module.exports = router;
