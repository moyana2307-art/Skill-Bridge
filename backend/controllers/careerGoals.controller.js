// Career goal endpoints. The user id always comes from the token.
const careerGoalsService = require('../services/careerGoals.service');
const activityService = require('../services/activity.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/career-goals
async function list(req, res) {
  const { status } = req.validated.query;
  const goals = await careerGoalsService.listGoals(req.user.id, status);

  return sendSuccess(res, { data: { goals } });
}

// GET /api/career-goals/:goalId
async function getOne(req, res) {
  const { goalId } = req.validated.params;
  const goal = await careerGoalsService.getGoalById(req.user.id, goalId);

  if (!goal) throw ApiError.notFound(`Career goal ${goalId} was not found`);

  return sendSuccess(res, { data: { goal } });
}

// POST /api/career-goals
async function create(req, res) {
  const goal = await careerGoalsService.createGoal(
    req.user.id,
    req.validated.body
  );

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'career_goal.created',
    entityType: 'career_goal',
    entityId: goal.id,
    title: `Created career goal: ${goal.title || 'Untitled'}`,
    metadata: { status: goal.status },
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: { goal },
    message: 'Career goal created',
  });
}

// PATCH /api/career-goals/:goalId
async function update(req, res) {
  const { goalId } = req.validated.params;
  const goal = await careerGoalsService.updateGoal(
    req.user.id,
    goalId,
    req.validated.body
  );

  if (!goal) throw ApiError.notFound(`Career goal ${goalId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType:
      req.validated.body.status === 'completed'
        ? 'career_goal.completed'
        : 'career_goal.updated',
    entityType: 'career_goal',
    entityId: goal.id,
    title:
      req.validated.body.status === 'completed'
        ? `Completed career goal: ${goal.title || 'Untitled'}`
        : `Updated career goal: ${goal.title || 'Untitled'}`,
    metadata: { status: goal.status },
    req,
  });

  return sendSuccess(res, { data: { goal }, message: 'Career goal updated' });
}

// DELETE /api/career-goals/:goalId
async function remove(req, res) {
  const { goalId } = req.validated.params;
  const deleted = await careerGoalsService.deleteGoal(req.user.id, goalId);

  if (!deleted) throw ApiError.notFound(`Career goal ${goalId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'career_goal.deleted',
    entityType: 'career_goal',
    entityId: goalId,
    title: 'Deleted a career goal',
    req,
  });

  return sendSuccess(res, {
    data: { goal_id: goalId },
    message: 'Career goal deleted',
  });
}

module.exports = { list, getOne, create, update, remove };
