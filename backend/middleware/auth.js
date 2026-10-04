/**
 * Authentication Middleware
 * Extracts user from session cookie and attaches to req.user.
 */
const { statements } = require('../config/database');
const { parseCookies, tokenHash, COOKIE_NAME } = require('../utils/crypto');

/**
 * Attempt to load the authenticated user from the session cookie.
 * Sets req.user to the user object or null.
 */
function loadUser(req, _res, next) {
  const cookie = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!cookie) {
    req.user = null;
    return next();
  }
  req.user = statements.sessionUser.get(
    tokenHash(cookie),
    Math.floor(Date.now() / 1000)
  ) || null;
  next();
}

/**
 * Require an authenticated user. Responds 401 if not signed in.
 */
function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  next();
}

/**
 * Require an admin user. Responds 403 if not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
}

module.exports = { loadUser, requireUser, requireAdmin };
