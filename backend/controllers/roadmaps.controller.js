// Learning roadmap and roadmap task endpoints.
const roadmapsService = require('../services/roadmaps.service');
const activityService = require('../services/activity.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/roadmaps
async function list(req, res) {
  const roadmaps = await roadmapsService.listRoadmaps(
    req.user.id,
    req.validated.query
  );

  return sendSuccess(res, { data: { roadmaps } });
}

// GET /api/roadmaps/:roadmapId
async function getOne(req, res) {
  const { roadmapId } = req.validated.params;
  const roadmap = await roadmapsService.getRoadmapById(
    req.user.id,
    roadmapId
  );

  if (!roadmap) throw ApiError.notFound(`Roadmap ${roadmapId} was not found`);

  return sendSuccess(res, { data: { roadmap } });
}

// POST /api/roadmaps
async function create(req, res) {
  const result = await roadmapsService.createRoadmap(
    req.user.id,
    req.validated.body
  );

  if (result.status === 'goal_not_found') {
    throw ApiError.notFound('That career goal was not found');
  }

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'roadmap.created',
    entityType: 'roadmap',
    entityId: result.roadmap.id,
    title: `Created roadmap: ${result.roadmap.title || 'Untitled'}`,
    metadata: { status: result.roadmap.status },
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: { roadmap: result.roadmap },
    message: 'Roadmap created',
  });
}

// PATCH /api/roadmaps/:roadmapId
async function update(req, res) {
  const { roadmapId } = req.validated.params;
  const result = await roadmapsService.updateRoadmap(
    req.user.id,
    roadmapId,
    req.validated.body
  );

  if (result.status === 'not_found') {
    throw ApiError.notFound(`Roadmap ${roadmapId} was not found`);
  }

  if (result.status === 'goal_not_found') {
    throw ApiError.notFound('That career goal was not found');
  }

  await activityService.logActivity({
    userId: req.user.id,
    eventType:
      req.validated.body.status === 'completed'
        ? 'roadmap.completed'
        : 'roadmap.updated',
    entityType: 'roadmap',
    entityId: result.roadmap.id,
    title:
      req.validated.body.status === 'completed'
        ? `Completed roadmap: ${result.roadmap.title || 'Untitled'}`
        : `Updated roadmap: ${result.roadmap.title || 'Untitled'}`,
    metadata: { status: result.roadmap.status },
    req,
  });

  return sendSuccess(res, {
    data: { roadmap: result.roadmap },
    message: 'Roadmap updated',
  });
}

// DELETE /api/roadmaps/:roadmapId
async function remove(req, res) {
  const { roadmapId } = req.validated.params;
  const deleted = await roadmapsService.deleteRoadmap(
    req.user.id,
    roadmapId
  );

  if (!deleted) throw ApiError.notFound(`Roadmap ${roadmapId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'roadmap.deleted',
    entityType: 'roadmap',
    entityId: roadmapId,
    title: 'Deleted a roadmap',
    req,
  });

  return sendSuccess(res, {
    data: { roadmap_id: roadmapId },
    message: 'Roadmap deleted',
  });
}

// POST /api/roadmaps/:roadmapId/tasks
async function createTask(req, res) {
  const { roadmapId } = req.validated.params;
  const result = await roadmapsService.createTask(
    req.user.id,
    roadmapId,
    req.validated.body
  );

  if (result.status === 'roadmap_not_found') {
    throw ApiError.notFound(`Roadmap ${roadmapId} was not found`);
  }

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'roadmap.task_created',
    entityType: 'roadmap_task',
    entityId: result.task.id,
    title: `Added roadmap task: ${result.task.title || 'Untitled'}`,
    metadata: { roadmap_id: roadmapId },
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    data: { task: result.task },
    message: 'Roadmap task created',
  });
}

// PATCH /api/roadmaps/:roadmapId/tasks/:taskId
async function updateTask(req, res) {
  const { roadmapId, taskId } = req.validated.params;
  const task = await roadmapsService.updateTask(
    req.user.id,
    roadmapId,
    taskId,
    req.validated.body
  );

  if (!task) throw ApiError.notFound(`Task ${taskId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType:
      req.validated.body.status === 'completed'
        ? 'roadmap.task_completed'
        : 'roadmap.task_updated',
    entityType: 'roadmap_task',
    entityId: task.id,
    title:
      req.validated.body.status === 'completed'
        ? `Completed roadmap task: ${task.title || 'Untitled'}`
        : `Updated roadmap task: ${task.title || 'Untitled'}`,
    metadata: { roadmap_id: roadmapId, status: task.status },
    req,
  });

  return sendSuccess(res, { data: { task }, message: 'Roadmap task updated' });
}

// DELETE /api/roadmaps/:roadmapId/tasks/:taskId
async function removeTask(req, res) {
  const { roadmapId, taskId } = req.validated.params;
  const deleted = await roadmapsService.deleteTask(
    req.user.id,
    roadmapId,
    taskId
  );

  if (!deleted) throw ApiError.notFound(`Task ${taskId} was not found`);

  await activityService.logActivity({
    userId: req.user.id,
    eventType: 'roadmap.task_deleted',
    entityType: 'roadmap_task',
    entityId: taskId,
    title: 'Deleted a roadmap task',
    metadata: { roadmap_id: roadmapId },
    req,
  });

  return sendSuccess(res, {
    data: { task_id: taskId },
    message: 'Roadmap task deleted',
  });
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  createTask,
  updateTask,
  removeTask,
};
