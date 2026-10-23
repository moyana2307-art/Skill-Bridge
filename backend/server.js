// SkillBridge AI - Backend server
//
// This file only starts the server. The app itself is built in app.js so it
// can be reused (and tested) without opening a port.
const app = require('./app');
const { env, assertDatabaseConfigured, assertAuthConfigured } = require('./config/env');
const { pool } = require('./config/db');

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
});

// Close the database pool and stop the server when the process is stopped,
// so nothing is left half-open.
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

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
