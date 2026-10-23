// Health check: proves the server is running and the database answers.
const { testConnection } = require('../config/db');
const { sendSuccess } = require('../utils/response');

async function getHealth(req, res) {
  let database = 'disconnected';
  let databaseLatencyMs = null;

  try {
    const startedAt = Date.now();
    await testConnection();
    databaseLatencyMs = Date.now() - startedAt;
    database = 'connected';
  } catch (err) {
    console.error('Database health check failed:', err.message);
  }

  const healthy = database === 'connected';

  return sendSuccess(res, {
    // 503 tells the frontend (and any uptime monitor) that this service is
    // up but not ready to be used yet.
    statusCode: healthy ? 200 : 503,
    data: {
      status: healthy ? 'ok' : 'degraded',
      message: 'SkillBridge AI API is running',
      database,
      databaseLatencyMs,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = { getHealth };
