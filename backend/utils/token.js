// Creates, verifies, and clears the login token.
// The token is stored in an httpOnly cookie so JavaScript in the browser
// cannot read it. API clients such as Thunder Client may also send it as
// "Authorization: Bearer <token>".
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AUTH_COOKIE_NAME } = require('../config/constants');

// Convert values such as "7d" or "12h" into milliseconds for the cookie.
function durationToMs(value) {
  const match = /^(\d+)\s*([smhd])$/.exec(String(value).trim());

  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * multipliers[match[2]];
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  };
}

function signToken(user) {
  if (!env.jwt.secret) {
    throw new Error('JWT_SECRET is not configured. Add it to backend/.env.');
  }

  return jwt.sign({ role: user.role }, env.jwt.secret, {
    subject: String(user.id),
    expiresIn: env.jwt.expiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: durationToMs(env.jwt.expiresIn),
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
}

function getToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();

  return null;
}

module.exports = {
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getToken,
};
