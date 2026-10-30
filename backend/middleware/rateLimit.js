// Small in-memory rate limiter. It keeps the API usable without adding a
// dependency, and each route group can choose its own window and limit.
//
// Requests are counted per logged-in user when available, otherwise per IP.
// In a multi-instance deployment each instance keeps its own counters; for a
// shared store swap the Map for Redis behind the same interface.
const { env } = require('../config/env');

const buckets = new Map();

// Drop expired buckets periodically so memory cannot grow forever.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000);
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

function clientKey(req) {
  if (req.user?.id) return `user:${req.user.id}`;
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

function rateLimit({ windowMs = 60 * 1000, max = 120, name = 'default' } = {}) {
  return (req, res, next) => {
    // Health checks and preflight requests should never be throttled.
    if (req.method === 'OPTIONS' || req.path === '/health') return next();

    const key = `${name}:${clientKey(req)}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(retryAfter));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests. Please slow down and try again shortly.',
          code: 'RATE_LIMITED',
        },
      });
    }

    return next();
  };
}

// Auth endpoints are the most attractive target for guessing attacks.
const authLimiter = rateLimit({ name: 'auth', windowMs: 15 * 60 * 1000, max: 30 });
// AI calls are expensive; keep a per-user cap.
const aiLimiter = rateLimit({ name: 'ai', windowMs: 60 * 1000, max: 20 });
const writeLimiter = rateLimit({ name: 'write', windowMs: 60 * 1000, max: 60 });
const apiLimiter = rateLimit({
  name: 'api',
  windowMs: 60 * 1000,
  max: env.nodeEnv === 'production' ? 240 : 600,
});

module.exports = { rateLimit, apiLimiter, authLimiter, aiLimiter, writeLimiter };
