// The advanced user dashboard: one request that gathers everything the home
// workspace needs, scoped to the logged-in user.
const { pool } = require('../config/db');
const analyticsService = require('./analytics.service');
const opportunitiesService = require('./opportunities.service');
const notificationsService = require('./notifications.service');
const aiAnalysesService = require('./aiAnalyses.service');

async function getUpcomingMilestones(userId, limit = 6) {
  const { rows } = await pool.query(
    `SELECT t.id, t.title, t.status, t.estimated_duration, t.sort_order,
       r.id AS roadmap_id, r.title AS roadmap_title
     FROM roadmap_tasks t
     JOIN learning_roadmaps r ON r.id = t.roadmap_id
     WHERE r.user_id = $1 AND r.status = 'active' AND t.status <> 'completed'
     ORDER BY r.updated_at DESC, t.sort_order ASC, t.id ASC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getRecentActivities(userId, limit = 8) {
  const [progressResult, applicationsResult, projectsResult, interviewsResult] = await Promise.all([
    pool.query(
      `SELECT p.changed_at AS happened_at, 'roadmap' AS kind,
         t.title AS title, p.new_status AS detail
       FROM user_progress p JOIN roadmap_tasks t ON t.id = p.roadmap_task_id
       WHERE p.user_id = $1 ORDER BY p.changed_at DESC LIMIT $2`,
      [userId, limit]
    ),
    pool.query(
      `SELECT updated_at AS happened_at, 'application' AS kind,
         title, status AS detail FROM applications
       WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2`,
      [userId, limit]
    ),
    pool.query(
      `SELECT updated_at AS happened_at, 'project' AS kind,
         title, status AS detail FROM projects
       WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2`,
      [userId, limit]
    ),
    pool.query(
      `SELECT COALESCE(completed_at, created_at) AS happened_at, 'interview' AS kind,
         role AS title, status AS detail FROM mock_interviews
       WHERE user_id = $1 ORDER BY COALESCE(completed_at, created_at) DESC LIMIT $2`,
      [userId, limit]
    ),
  ]);

  return [...progressResult.rows, ...applicationsResult.rows, ...projectsResult.rows, ...interviewsResult.rows]
    .sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at))
    .slice(0, limit);
}

async function getDashboard(userId) {
  const [employability, milestones, activities, opportunities, notifications, latestNotifications, recommendations, projectIdeas, activeGoal] =
    await Promise.all([
      analyticsService.getEmployability(userId),
      getUpcomingMilestones(userId),
      getRecentActivities(userId),
      opportunitiesService.listMatchingOpportunities(userId, {
        page: 1,
        limit: 4,
        sort: 'deadline',
        order: 'asc',
        is_active: true,
      }),
      notificationsService.unreadCount(userId),
      notificationsService.listNotifications(userId, { page: 1, limit: 5 }),
      aiAnalysesService.getLatestAnalysis(userId, 'career_recommendations'),
      aiAnalysesService.getLatestAnalysis(userId, 'project_recommendations'),
      pool
        .query(
          `SELECT id, career_title, status FROM career_goals WHERE user_id = $1
           ORDER BY CASE status WHEN 'active' THEN 1 ELSE 2 END, updated_at DESC LIMIT 1`,
          [userId]
        )
        .then((result) => result.rows[0] || null),
    ]);

  return {
    active_goal: activeGoal,
    employability,
    upcoming_milestones: milestones,
    recent_activities: activities,
    recommended_opportunities: opportunities.rows,
    notifications: {
      unread_count: notifications,
      latest: latestNotifications.notifications,
    },
    career_recommendations: recommendations?.payload || null,
    project_recommendations: projectIdeas?.payload || null,
  };
}

module.exports = { getDashboard };
