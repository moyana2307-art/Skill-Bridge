// Builds the Express app. Keeping this separate from server.js means the
// app can be imported by tests without starting a listening socket.
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Do not advertise the framework.
app.disable('x-powered-by');

// Behind a hosting proxy, trust its forwarded protocol so secure cookies work.
if (env.nodeEnv === 'production') app.set('trust proxy', 1);

// CORS: allow the React dev server (port 3000) to call this API.
// Without this, the browser would block the requests for security.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Parse incoming request bodies so we can read req.body.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Parse cookies so the auth middleware can read the httpOnly login token.
app.use(cookieParser());

// One log line per request.
app.use(requestLogger);

// A small landing page so hitting the root URL in a browser is useful.
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'SkillBridge AI API',
      version: '1.0.0',
      environment: env.nodeEnv,
      documentation: 'See README.md for the full endpoint list.',
      endpoints: [
        'GET    /api/health',
        'GET    /api/meta',
        'POST   /api/auth/register',
        'POST   /api/auth/login',
        'POST   /api/auth/logout',
        'GET    /api/auth/me',
        'GET    /api/profile',
        'PATCH  /api/profile',
        'GET    /api/profile/skills',
        'POST   /api/profile/skills',
        'PATCH  /api/profile/skills/:skillId',
        'DELETE /api/profile/skills/:skillId',
        'GET    /api/career-goals',
        'POST   /api/career-goals',
        'GET    /api/career-goals/:goalId',
        'PATCH  /api/career-goals/:goalId',
        'DELETE /api/career-goals/:goalId',
        'GET    /api/roadmaps',
        'POST   /api/roadmaps',
        'GET    /api/roadmaps/:roadmapId',
        'PATCH  /api/roadmaps/:roadmapId',
        'DELETE /api/roadmaps/:roadmapId',
        'POST   /api/roadmaps/:roadmapId/tasks',
        'PATCH  /api/roadmaps/:roadmapId/tasks/:taskId',
        'DELETE /api/roadmaps/:roadmapId/tasks/:taskId',
        'GET    /api/skills',
        'GET    /api/skills/:id',
        'POST   /api/skills (admin)',
        'PATCH  /api/skills/:id (admin)',
        'DELETE /api/skills/:id (admin)',
        'GET    /api/opportunities',
        'GET    /api/opportunities/matches',
        'GET    /api/opportunities/saved',
        'POST   /api/opportunities/:id/save',
        'DELETE /api/opportunities/:id/save',
        'GET    /api/opportunities/:id',
        'POST   /api/opportunities (admin)',
        'PATCH  /api/opportunities/:id (admin)',
        'DELETE /api/opportunities/:id (admin)',
        ...(env.nodeEnv !== 'production'
          ? ['GET    /api/test', 'POST   /api/test/echo']
          : []),
      ],
    },
  });
});

// All API routes.
app.use('/api', routes);

// Nothing matched: turn it into a clean 404.
app.use(notFound);

// Last: convert any error into a safe JSON response.
app.use(errorHandler);

module.exports = app;
