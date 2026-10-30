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
const { apiLimiter } = require('./middleware/rateLimit');
const ApiError = require('./utils/ApiError');

const app = express();

// Do not advertise the framework.
app.disable('x-powered-by');

// Basic security headers. These are safe defaults for a JSON API and do not
// require an extra dependency.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// Behind a hosting proxy, trust its forwarded protocol so secure cookies work.
if (env.nodeEnv === 'production') app.set('trust proxy', 1);

// CORS: allow the configured frontend origin(s) to call this API.
// CLIENT_URL may contain several comma-separated origins, which is useful for
// production plus Vercel preview deployments. Requests with no Origin header
// (curl, health checks) are allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/$/, '');
      if (env.clientUrls.includes(normalized) || normalized.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(ApiError.forbidden('That origin is not allowed to call this API'));
    },
    credentials: true,
  })
);

// Parse incoming request bodies so we can read req.body.
app.use(express.json({ limit: '1mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
    verify(req, res, buffer) {
      if (req.originalUrl && req.originalUrl.startsWith('/api/payments/webhook/')) {
        req.rawBody = buffer.toString('utf8');
      }
    },
  })
);

// Parse cookies so the auth middleware can read the httpOnly login token.
app.use(cookieParser());

// One log line per request.
app.use(requestLogger);

// A broad safety net in front of every API route. Individual route groups add
// stricter limits for authentication and AI calls.
app.use('/api', apiLimiter);

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
        'POST   /api/profile/avatar',
        'DELETE /api/profile/avatar',
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
        'POST   /api/opportunities/sync (admin)',
        'POST   /api/ai/skills-gap',
        'GET    /api/ai/skills-gap/latest',
        'POST   /api/ai/roadmaps',
        'POST   /api/ai/opportunity-insight',
        'POST   /api/ai/profile-review',
        'GET    /api/ai/profile-review/latest',
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
