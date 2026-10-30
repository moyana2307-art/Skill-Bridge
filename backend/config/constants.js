// Shared constants that match the ENUM values used in the database schema.
// Keeping them in one file means the database and the API cannot drift apart.
const OPPORTUNITY_TYPES = ['job', 'internship', 'scholarship', 'training', 'course'];
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const USER_ROLES = ['user', 'admin'];
const ROADMAP_TASK_STATUSES = ['not_started', 'in_progress', 'completed'];
const GOAL_STATUSES = ['active', 'completed', 'archived'];
const APPLICATION_STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];
const PROJECT_STATUSES = ['planned', 'in_progress', 'completed'];
const INTERVIEW_TYPES = ['general', 'behavioural', 'technical', 'case'];
const RESOURCE_TYPES = ['course', 'article', 'video', 'book', 'tool', 'community'];
const NOTIFICATION_TYPES = [
  'opportunity',
  'milestone',
  'deadline',
  'roadmap',
  'announcement',
  'application',
  'project',
  'interview',
];

// Name of the httpOnly cookie that carries the login token.
const AUTH_COOKIE_NAME = 'skillbridge_token';

module.exports = {
  OPPORTUNITY_TYPES,
  PROFICIENCY_LEVELS,
  USER_ROLES,
  ROADMAP_TASK_STATUSES,
  GOAL_STATUSES,
  APPLICATION_STATUSES,
  PROJECT_STATUSES,
  INTERVIEW_TYPES,
  RESOURCE_TYPES,
  NOTIFICATION_TYPES,
  AUTH_COOKIE_NAME,
};
