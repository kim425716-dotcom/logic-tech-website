/**
 * Rate Limiting Middleware
 * Simple in-memory sliding window rate limiter per IP address.
 */
const { fail } = require('../utils/validation');

const buckets = new Map();

/**
 * Create a rate limiter middleware.
 * @param {string} key     Namespace key (e.g. 'login', 'register')
 * @param {number} limit   Max requests allowed within the window
 * @param {number} windowMs Duration of the window in milliseconds
 * @returns {Function} Express middleware
 */
function rateLimit(key, limit, windowMs) {
  return (req, _res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const address = (typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress) || 'unknown';

    const now = Date.now();
    const bucketKey = `${key}:${address}`;
    const bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
      if (bucket.count > limit) {
        return next(fail(429, 'Too many attempts. Please try again later.'));
      }
    }
    next();
  };
}

module.exports = rateLimit;
