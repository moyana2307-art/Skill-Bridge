// SkillBridge AI - Backend server
//
// This file only starts the server. The app itself is built in app.js so it
// can be reused (and tested) without opening a port.
const app = require('./app');
const { env, assertDatabaseConfigured, assertAuthConfigured } = require('./config/env');
const { pool } = require('./config/db');
const { syncOpportunities } = require('./services/opportunitySync.service');

// In serverless environments (like Vercel), don't start a listener
if (process.env.VERCEL || process.env.SERVERLESS || process.env.NODE_ENV === 'production') {
  // Don't fail fast in serverless - just warn
  try {
    assertDatabaseConfigured();
    assertAuthConfigured();
  } catch (err) {
    console.error(`\n[serverless] Configuration issue: ${err.message}\n`);
  }
  module.exports = app;
} else {
  // Fail fast with a clear message if the database is not configured.
  try {
    assertDatabaseConfigured();
    assertAuthConfigured();
  } catch (err) {
    console.error(`\nCannot start the server: ${err.message}\n`);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`SkillBridge AI backend running on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`Health check: http://localhost:${env.port}/api/health`);

    if (env.opportunitySync.enabled) {
      startOpportunitySync();
    }
  });

// Refresh real listings shortly after boot and then on an interval. The first
// run waits a few seconds so the server can answer health checks immediately.
function startOpportunitySync() {
  const run = () => {
    syncOpportunities()
      .then((result) => {
        console.log(
          `[sync] ${result.total_saved} opportunities refreshed from ${result.sources
            .map((source) => source.name)
            .join(', ')}`
        );

        if (result.errors.length) {
          console.warn('[sync] partial failure:', result.errors);
        }
      })
      .catch((err) => {
        console.error('[sync] opportunity sync failed:', err.message);
      });
  };

  setTimeout(run, 5000).unref();
  setInterval(run, env.opportunitySync.intervalHours * 60 * 60 * 1000).unref();
}

// Close the database pool and stop the server when the process is stopped,
// so nothing is left half-open.
if (!process.env.VERCEL && !process.env.SERVERLESS && typeof server !== 'undefined') {
  function shutdown(signal) {
    console.log(`\n${signal} received, shutting down...`);

    server.close(async () => {
      try {
        await pool.end();
      } catch (err) {
        console.error('Error while closing the database pool:', err.message);
      }
      process.exit(0);
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 5000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

