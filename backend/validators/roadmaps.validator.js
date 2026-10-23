// Validation rules for learning roadmaps and their tasks.
const { z } = require('zod');
const {
  GOAL_STATUSES,
  ROADMAP_TASK_STATUSES,
} = require('../config/constants');
const {
  idParam,
  nullableText,
  optionalText,
} = require('./common.validator');

const roadmapStatusField = z.enum(GOAL_STATUSES, {
  errorMap: () => ({
    message: `Status must be one of: ${GOAL_STATUSES.join(', ')}`,
  }),
});

const taskStatusField = z.enum(ROADMAP_TASK_STATUSES, {
  errorMap: () => ({
    message: `Status must be one of: ${ROADMAP_TASK_STATUSES.join(', ')}`,
  }),
});

const titleField = z
  .string()
  .trim()
  .min(2, 'Title must be at least 2 characters')
  .max(200, 'Title is too long');

const sortOrderField = z.coerce
  .number()
  .int('Sort order must be a whole number')
  .min(0, 'Sort order cannot be negative')
  .max(10000, 'Sort order is too large');

const taskFields = {
  title: titleField,
  description: nullableText(5000),
  skills_to_develop: nullableText(500),
  learning_activities: nullableText(5000),
  practical_project: nullableText(5000),
  resources: nullableText(5000),
  estimated_duration: nullableText(100),
  sort_order: sortOrderField,
  status: taskStatusField,
};

// POST /api/roadmaps
const createRoadmapBody = z
  .object({
    title: titleField,
    summary: optionalText(5000),
    career_goal_id: idParam.nullable().optional(),
    status: roadmapStatusField.default('active'),
  })
  .strict();

// PATCH /api/roadmaps/:roadmapId
const updateRoadmapBody = z
  .object({
    title: titleField.optional(),
    summary: nullableText(5000),
    career_goal_id: idParam.nullable().optional(),
    status: roadmapStatusField.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

// GET /api/roadmaps
const listRoadmapsQuery = z.object({
  status: roadmapStatusField.optional(),
  career_goal_id: idParam.optional(),
});

const roadmapIdParams = z.object({ roadmapId: idParam });

const roadmapTaskParams = z.object({
  roadmapId: idParam,
  taskId: idParam,
});

// POST /api/roadmaps/:roadmapId/tasks
const createRoadmapTaskBody = z
  .object({
    ...taskFields,
    status: taskStatusField.default('not_started'),
    sort_order: sortOrderField.optional(),
  })
  .strict();

// PATCH /api/roadmaps/:roadmapId/tasks/:taskId
const updateRoadmapTaskBody = z
  .object(taskFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = {
  createRoadmapBody,
  updateRoadmapBody,
  listRoadmapsQuery,
  roadmapIdParams,
  roadmapTaskParams,
  createRoadmapTaskBody,
  updateRoadmapTaskBody,
};
