// Rejects requests without a valid login token.
// On success, req.user contains the current user loaded from the database.
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');
const authService = require('../services/auth.service');
const { getToken, verifyToken } = require('../utils/token');

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    throw ApiError.unauthorized('Please log in to continue');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Your session has expired. Please log in again.');
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId < 1) {
    throw ApiError.unauthorized('Invalid session');
  }

  // Loading the user again means deleted accounts and role changes take
  // effect immediately, instead of waiting for the token to expire.
  const user = await authService.findUserById(userId);
  if (!user) {
    throw ApiError.unauthorized('Your account no longer exists');
  }

  req.user = user;
  return next();
});

module.exports = requireAuth;
