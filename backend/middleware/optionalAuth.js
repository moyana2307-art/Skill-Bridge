// Attaches req.user when a valid login token is present, but never rejects.
// Public endpoints use this so signed-in users still get attributed activity
// without making the endpoint private.
const authService = require('../services/auth.service');
const { getToken, verifyToken } = require('../utils/token');

async function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) return next();

    const user = await authService.findUserById(userId);
    if (user && user.status !== 'suspended') req.user = user;
  } catch (err) {
    // A bad token simply means "anonymous" for a public endpoint.
  }

  return next();
}

module.exports = optionalAuth;
