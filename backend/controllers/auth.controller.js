// Registration, login, logout, and "who am I" endpoints.
const authService = require('../services/auth.service');
const subscriptionsService = require('../services/subscriptions.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');

async function entitlementsFor(userId) {
  try {
    return await subscriptionsService.getEntitlements(userId);
  } catch (err) {
    console.error('[subscriptions] could not load entitlements:', err.message);
    return null;
  }
}

// POST /api/auth/register
async function register(req, res) {
  const user = await authService.createUser(req.validated.body);

  setAuthCookie(res, signToken(user));

  return sendSuccess(res, {
    statusCode: 201,
    data: { user, entitlements: await entitlementsFor(user.id) },
    message: 'Account created',
  });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await authService.authenticate(email, password);

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  setAuthCookie(res, signToken(user));

  return sendSuccess(res, {
    data: { user, entitlements: await entitlementsFor(user.id) },
    message: 'Logged in',
  });
}

// POST /api/auth/logout
function logout(req, res) {
  clearAuthCookie(res);

  return sendSuccess(res, { data: null, message: 'Logged out' });
}

// GET /api/auth/me
async function me(req, res) {
  return sendSuccess(res, {
    data: {
      user: req.user,
      entitlements: await entitlementsFor(req.user.id),
    },
  });
}

module.exports = { register, login, logout, me };
