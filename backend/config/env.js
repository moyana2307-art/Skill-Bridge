// One place that reads process.env, so the rest of the app never has to.
// `dotenv` loads backend/.env into process.env when this file is required.
require('dotenv').config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openaiApiKey: process.env.OPENAI_API_KEY || '',
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

module.exports = { env, assertDatabaseConfigured, assertAuthConfigured };
