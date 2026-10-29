// PostgreSQL/Supabase connection pool using pg.
const { Pool } = require('pg');
const { env } = require('./env');

function sslConfig() {
  if (!env.db.ssl) return false;
  const ssl = { rejectUnauthorized: env.db.sslRejectUnauthorized };
  if (env.db.sslCa) ssl.ca = env.db.sslCa.replace(/\\n/g, '\n');
  return ssl;
}

const poolOptions = {
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: sslConfig(),
};

if (env.db.connectionString) {
  poolOptions.connectionString = env.db.connectionString;
} else {
  poolOptions.host = env.db.host;
  poolOptions.port = env.db.port;
  poolOptions.user = env.db.user;
  poolOptions.password = env.db.password;
  poolOptions.database = env.db.name;
}

const pool = new Pool(poolOptions);

async function testConnection() {
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}

module.exports = { pool, testConnection };
