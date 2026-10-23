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
const testRoutes = require('./test.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/meta', metaRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/career-goals', careerGoalsRoutes);
router.use('/roadmaps', roadmapsRoutes);
router.use('/skills', skillsRoutes);
router.use('/opportunities', opportunitiesRoutes);

// Test endpoints must never be exposed in production.
if (env.nodeEnv !== 'production') {
  router.use('/test', testRoutes);
}

module.exports = router;
