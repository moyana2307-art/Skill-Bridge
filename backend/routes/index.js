// Every API route is mounted here, under the /api prefix.
// Add a new resource by creating its routes file and mounting it below.
const express = require('express');
const { env } = require('../config/env');
const healthRoutes = require('./health.routes');
const metaRoutes = require('./meta.routes');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const careerGoalsRoutes = require('./careerGoals.routes');
const roadmapsRoutes = require('./roadmaps.routes');
const skillsRoutes = require('./skills.routes');
const opportunitiesRoutes = require('./opportunities.routes');
const aiRoutes = require('./ai.routes');
const testRoutes = require('./test.routes');
const dashboardRoutes = require('./dashboard.routes');
const careerIntelligenceRoutes = require('./careerIntelligence.routes');
const mentorRoutes = require('./mentor.routes');
const applicationsRoutes = require('./applications.routes');
const careerStudioRoutes = require('./careerStudio.routes');
const projectsRoutes = require('./projects.routes');
const portfolioRoutes = require('./portfolio.routes');
const analyticsRoutes = require('./analytics.routes');
const notificationsRoutes = require('./notifications.routes');
const adminRoutes = require('./admin.routes');
const learningResourcesRoutes = require('./learningResources.routes');
const subscriptionsRoutes = require('./subscriptions.routes');
const institutionsRoutes = require('./institutions.routes');
const paymentsRoutes = require('./payments.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/meta', metaRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/career-goals', careerGoalsRoutes);
router.use('/roadmaps', roadmapsRoutes);
router.use('/skills', skillsRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/ai', aiRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/career', careerIntelligenceRoutes);
router.use('/mentor', mentorRoutes);
router.use('/applications', applicationsRoutes);
router.use('/career-studio', careerStudioRoutes);
router.use('/projects', projectsRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin', adminRoutes);
router.use('/resources', learningResourcesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/institutions', institutionsRoutes);
router.use('/payments', paymentsRoutes);

// Test endpoints must never be exposed in production.
if (env.nodeEnv !== 'production') {
  router.use('/test', testRoutes);
}

module.exports = router;
