// AI Career Intelligence endpoints.
const careerIntelligenceService = require('../services/careerIntelligence.service');
const { sendSuccess } = require('../utils/response');

async function runAssessment(req, res) {
  const assessment = await careerIntelligenceService.runAssessment(
    req.user.id,
    req.validated.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    data: { assessment },
    message: 'Career assessment ready',
  });
}

async function latestAssessment(req, res) {
  const assessment = await careerIntelligenceService.latestAssessment(req.user.id);
  return sendSuccess(res, { data: { assessment } });
}

async function recommendations(req, res) {
  const result = await careerIntelligenceService.recommendations(
    req.user.id,
    req.validated.body
  );

  return sendSuccess(res, {
    data: result,
    message: 'Career recommendations ready',
  });
}

async function latestRecommendations(req, res) {
  const result = await careerIntelligenceService.latestRecommendations(req.user.id);
  return sendSuccess(res, { data: result });
}

async function compare(req, res) {
  const result = await careerIntelligenceService.comparePaths(
    req.user.id,
    req.validated.body
  );

  return sendSuccess(res, { data: result, message: 'Career paths compared' });
}

async function latestComparison(req, res) {
  const result = await careerIntelligenceService.latestComparison(req.user.id);
  return sendSuccess(res, { data: result });
}

async function requirements(req, res) {
  const result = await careerIntelligenceService.requirements(
    req.user.id,
    req.validated.body
  );

  return sendSuccess(res, {
    data: result,
    message: 'Career requirements ready',
  });
}

async function latestRequirements(req, res) {
  const result = await careerIntelligenceService.latestRequirements(req.user.id);
  return sendSuccess(res, { data: result });
}

module.exports = {
  runAssessment,
  latestAssessment,
  recommendations,
  latestRecommendations,
  compare,
  latestComparison,
  requirements,
  latestRequirements,
};
