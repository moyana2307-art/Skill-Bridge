// AI career endpoints. All of them use the logged-in user's own profile,
// skills, and goals, and persist the result so it can be revisited.
const aiCareerService = require('../services/aiCareer.service');
const aiAnalysesService = require('../services/aiAnalyses.service');
const { env } = require('../config/env');
const { sendSuccess } = require('../utils/response');

// POST /api/ai/skills-gap
async function skillsGap(req, res) {
  const result = await aiCareerService.skillsGap(
    req.user.id,
    req.validated.body
  );

  const saved = await aiAnalysesService.saveAnalysis(req.user.id, {
    type: 'skills_gap',
    careerGoalId: result.career_goal_id,
    model: env.openai.model,
    payload: result.analysis,
  });

  return sendSuccess(res, {
    data: {
      analysis: result.analysis,
      career_goal_id: result.career_goal_id,
      generated_at: saved?.created_at || null,
    },
    message: 'Skills gap analysis ready',
  });
}

// GET /api/ai/skills-gap/latest
async function latestSkillsGap(req, res) {
  const latest = await aiAnalysesService.getLatestAnalysis(
    req.user.id,
    'skills_gap'
  );

  return sendSuccess(res, {
    data: {
      analysis: latest?.payload || null,
      career_goal_id: latest?.career_goal_id || null,
      generated_at: latest?.created_at || null,
    },
  });
}

// POST /api/ai/roadmaps
async function generateRoadmap(req, res) {
  const result = await aiCareerService.generateRoadmap(
    req.user.id,
    req.validated.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    data: {
      roadmap: result.roadmap,
      generated_tasks: result.generated_tasks,
      timeframe_weeks: result.timeframe_weeks,
      hours_per_week: result.hours_per_week,
    },
    message: 'AI roadmap created',
  });
}

// POST /api/ai/opportunity-insight
async function opportunityInsight(req, res) {
  const result = await aiCareerService.opportunityInsight(
    req.user.id,
    req.validated.body
  );

  const saved = await aiAnalysesService.saveAnalysis(req.user.id, {
    type: 'opportunity_insight',
    opportunityId: result.opportunity.id,
    model: env.openai.model,
    payload: result.insight,
  });

  return sendSuccess(res, {
    data: {
      ...result,
      generated_at: saved?.created_at || null,
    },
    message: 'Opportunity insight ready',
  });
}

// POST /api/ai/profile-review
async function profileReview(req, res) {
  const result = await aiCareerService.profileReview(req.user.id);

  const saved = await aiAnalysesService.saveAnalysis(req.user.id, {
    type: 'profile_review',
    model: result.model,
    payload: result.review,
  });

  return sendSuccess(res, {
    data: {
      review: result.review,
      generated_at: saved?.created_at || null,
    },
    message: 'Profile review ready',
  });
}

// GET /api/ai/profile-review/latest
async function latestProfileReview(req, res) {
  const latest = await aiAnalysesService.getLatestAnalysis(
    req.user.id,
    'profile_review'
  );

  return sendSuccess(res, {
    data: {
      review: latest?.payload || null,
      generated_at: latest?.created_at || null,
    },
  });
}

module.exports = {
  skillsGap,
  latestSkillsGap,
  generateRoadmap,
  opportunityInsight,
  profileReview,
  latestProfileReview,
};
