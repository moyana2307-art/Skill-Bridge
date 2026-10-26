// One place that reads process.env, so the rest of the app never has to.
// `dotenv` loads backend/.env into process.env when this file is required.
require('dotenv').config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
}

function toList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const clientUrls = toList(process.env.CLIENT_URL || 'http://localhost:3000');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  clientUrl: clientUrls[0] || 'http://localhost:3000',
  clientUrls,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
    ssl: toBool(process.env.DB_SSL, false),
    sslRejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeoutMs: toInt(process.env.OPENAI_TIMEOUT_MS, 45000),
  },
  opportunitySync: {
    enabled: toBool(process.env.OPPORTUNITY_SYNC_ENABLED, true),
    intervalHours: toInt(process.env.OPPORTUNITY_SYNC_INTERVAL_HOURS, 6),
    reliefwebAppName: process.env.RELIEFWEB_APP_NAME || '',
  },
};

// The database settings are the only ones the server cannot start without.
function assertDatabaseConfigured() {
  const missing = ['DB_NAME', 'DB_USER'].filter((key) => !env.db[key.toLowerCase().replace('db_', '')]);

  if (missing.length) {
    throw new Error(
      `Missing database settings in backend/.env: ${missing.join(', ')}. ` +
        'Copy backend/.env.example to backend/.env and fill in the values.'
    );
  }
}

// Login tokens cannot be signed without a secret. It must be long and random.
function assertAuthConfigured() {
  if (!env.jwt.secret) {
    throw new Error(
      'Missing JWT_SECRET in backend/.env. Add a long random value before starting the server.'
    );
  }
}

// AI endpoints fail with a clear message instead of crashing the whole server
// when the key has not been configured yet.
function assertOpenAIConfigured() {
  if (!env.openai.apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY in backend/.env. Add your OpenAI key to enable AI features.'
    );
  }
}

module.exports = {
  env,
  assertDatabaseConfigured,
  assertAuthConfigured,
  assertOpenAIConfigured,
};
