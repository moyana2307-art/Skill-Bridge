// Database connection pool for MySQL.
// A "pool" keeps several connections ready so queries start instantly.
// All credentials come from config/env.js (which reads the .env file) - they
// are never hard-coded here.
const mysql = require('mysql2/promise');
const { env } = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10, // maximum simultaneous connections
  queueLimit: 0, // no limit on queued requests
  charset: 'utf8mb4_unicode_ci',
  namedPlaceholders: true,
  // Managed MySQL providers usually require TLS. DB_SSL_REJECT_UNAUTHORIZED
  // can be set to false only if the provider's certificate is not trusted by
  // the host; prefer keeping it true.
  ssl: env.db.ssl
    ? { rejectUnauthorized: env.db.sslRejectUnauthorized }
    : undefined,
  // DATE columns are returned as 'YYYY-MM-DD' strings so a deadline never
  // shifts a day because of the machine's time zone.
  dateStrings: ['DATE'],
});

// Used by the health check: proves the database is reachable right now.
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
    return true;
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection };
