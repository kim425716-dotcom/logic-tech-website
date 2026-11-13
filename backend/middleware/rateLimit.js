/**
 * Rate Limiting Middleware
 * In-memory sliding window rate limiter per IP address.
 * Auto-purges expired buckets every 10 minutes to prevent memory leaks.
 */
const { fail } = require('../utils/validation');

const buckets = new Map();

// Purge expired buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref(); // .unref() so it doesn't block Node exit

/**
 * Create a rate limiter middleware.
 * @param {string} key      Namespace key (e.g. 'login', 'mpesa_stk')
 * @param {number} limit    Max requests allowed within the window
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
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        return next(fail(429, `Too many attempts. Please wait ${retryAfter}s and try again.`));
      }
    }
    next();
  };
}

module.exports = rateLimit;
