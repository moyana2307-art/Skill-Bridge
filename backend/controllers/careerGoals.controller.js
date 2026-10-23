// Career goal endpoints. The user id always comes from the token.
const careerGoalsService = require('../services/careerGoals.service');
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

  return sendSuccess(res, { data: { goal }, message: 'Career goal updated' });
}

// DELETE /api/career-goals/:goalId
async function remove(req, res) {
  const { goalId } = req.validated.params;
  const deleted = await careerGoalsService.deleteGoal(req.user.id, goalId);

  if (!deleted) throw ApiError.notFound(`Career goal ${goalId} was not found`);

  return sendSuccess(res, {
    data: { goal_id: goalId },
    message: 'Career goal deleted',
  });
}

module.exports = { list, getOne, create, update, remove };
