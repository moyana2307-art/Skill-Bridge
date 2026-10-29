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

function toBaseUrl(value, fallback) {
  return String(value || fallback).trim().replace(/\/+$/, '');
}

const clientUrls = toList(process.env.CLIENT_URL || 'http://localhost:3000');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  clientUrl: clientUrls[0] || 'http://localhost:3000',
  clientUrls,
  db: {
    connectionString: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'postgres',
    ssl: toBool(process.env.DB_SSL, process.env.DATABASE_URL ? true : false),
    sslRejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
    sslCa: process.env.DB_SSL_CA || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  ai: {
    // Local Ollama is the free default. Set AI_PROVIDER=openai to use OpenAI.
    provider: String(process.env.AI_PROVIDER || 'ollama').trim().toLowerCase(),
  },
  ollama: {
    baseUrl: toBaseUrl(process.env.OLLAMA_BASE_URL, 'http://127.0.0.1:11434'),
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    timeoutMs: toInt(process.env.OLLAMA_TIMEOUT_MS, 120000),
    numCtx: toInt(process.env.OLLAMA_NUM_CTX, 4096),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeoutMs: toInt(process.env.OPENAI_TIMEOUT_MS, 45000),
  },
  opportunitySync: {
    enabled: toBool(process.env.OPPORTUNITY_SYNC_ENABLED, true),
    intervalHours: toInt(process.env.OPPORTUNITY_SYNC_INTERVAL_HOURS, 6),
    reliefwebAppName:
      process.env.RELIEFWEB_APP_NAME || process.env.RELIEFWEB_APPNAME || '',
  },
};

// The database settings are the only ones the server cannot start without.
function assertDatabaseConfigured() {
  if (env.db.connectionString) return true;

  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((key) => {
    const field = key === 'DB_NAME' ? 'name' : key.toLowerCase().replace('db_', '');
    return !env.db[field];
  });

  if (missing.length) {
    throw new Error(
      `Missing PostgreSQL settings in backend/.env: ${missing.join(', ')}. ` +
        'Copy backend/.env.example to backend/.env and set DATABASE_URL or the DB_* fallback values.'
    );
  }
  return true;
}

// Login tokens cannot be signed without a secret. It must be long and random.
function assertAuthConfigured() {
  if (!env.jwt.secret) {
    throw new Error(
      'Missing JWT_SECRET in backend/.env. Add a long random value before starting the server.'
    );
  }
}

module.exports = {
  env,
  assertDatabaseConfigured,
  assertAuthConfigured,
};
