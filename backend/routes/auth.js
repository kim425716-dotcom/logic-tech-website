/**
 * Auth Routes
 * POST /api/auth/register, /api/auth/login, /api/auth/logout
 * GET  /api/auth/me
 * POST /api/auth/forgot-password, /api/auth/reset-password
 */
const express = require('express');
const router = express.Router();

const { db, statements } = require('../config/database');
const {
  hashPassword,
  passwordMatches,
  tokenHash,
  generateToken,
  cookieHeader,
  parseCookies,
  SESSION_LIFETIME,
  COOKIE_NAME
} = require('../utils/crypto');
const { fail, stringField, validEmail, publicUser } = require('../utils/validation');
const { mailer, smtpConfigured } = require('../utils/mailer');
const { requireUser } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// ── Helpers ─────────────────────────────────────────────────────────

function createSession(res, userId) {
  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash(token), userId, expiresAt);
  res.setHeader('Set-Cookie', cookieHeader(token, SESSION_LIFETIME));
}

function clearSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  }
  res.setHeader('Set-Cookie', cookieHeader('', 0));
}

// ── POST /api/auth/register ─────────────────────────────────────────
router.post(
  '/register',
  rateLimit('register', 8, 60 * 60 * 1000),
  async (req, res, next) => {
    try {
      const name = stringField(req.body.name, 'Name', 120);
      const email = validEmail(req.body.email);
      const password = stringField(req.body.password, 'Password', 200);

      if (password.length < 10) {
        throw fail(400, 'Password must be at least 10 characters long.');
      }

      const existing = statements.userByEmail.get(email);
      if (existing) {
        throw fail(409, 'An account with that email already exists.');
      }

      const hash = await hashPassword(password);
      const result = db.prepare(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
      ).run(name, email, hash);

      const user = statements.userById.get(Number(result.lastInsertRowid));
      createSession(res, user.id);
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ────────────────────────────────────────────
router.post(
  '/login',
  rateLimit('login', 10, 15 * 60 * 1000),
  async (req, res, next) => {
    try {
      const email = validEmail(req.body.email);
      const password = stringField(req.body.password, 'Password', 200);

      const user = statements.userByEmail.get(email);
      if (!user || !(await passwordMatches(password, user.password_hash))) {
        throw fail(401, 'Invalid email or password.');
      }

      createSession(res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/google ───────────────────────────────────────────
router.post(
  '/google',
  rateLimit('google-auth', 15, 60 * 1000),
  async (req, res, next) => {
    try {
      const email = validEmail(req.body.email);
      const name = req.body.name ? stringField(req.body.name, 'Name', 120) : email.split('@')[0];

      let user = statements.userByEmail.get(email);
      if (!user) {
        // Register new Google OAuth user with random high-entropy token
        const dummyPass = await hashPassword(generateToken() + 'OAuthGoogle2026!');
        const result = db.prepare(
          'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
        ).run(name, email, dummyPass);
        user = statements.userById.get(Number(result.lastInsertRowid));
      }

      createSession(res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/logout ───────────────────────────────────────────
router.post('/logout', (req, res) => {
  clearSession(req, res);
  res.json({ message: 'Signed out.' });
});

// ── GET /api/auth/me ────────────────────────────────────────────────
router.get('/me', requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ── POST /api/auth/forgot-password ──────────────────────────────────
router.post(
  '/forgot-password',
  rateLimit('forgot-password', 5, 60 * 60 * 1000),
  async (req, res, next) => {
    try {
      if (!mailer) {
        throw fail(503, 'Password reset email is not configured. Please contact the site administrator.');
      }

      const email = validEmail(req.body.email);
      const user = statements.userByEmail.get(email);

      if (user) {
        const token = generateToken();
        const digest = tokenHash(token);
        const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

        db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
        db.prepare(
          'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
        ).run(digest, user.id, expiresAt);

        const port = process.env.PORT || 8080;
        const appUrl = (process.env.APP_URL || `http://localhost:${port}`).replace(/\/+$/, '');
        const resetUrl = `${appUrl}/forgot-password.html?token=${encodeURIComponent(token)}`;

        try {
          await mailer.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: 'Reset your Logic Tech password',
            text: `Use this link to reset your password within 30 minutes:\n\n${resetUrl}`,
            html: `<p>Use this link to reset your password within 30 minutes:</p><p><a href="${resetUrl}">Reset password</a></p>`
          });
        } catch (emailErr) {
          db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(digest);
          console.error('Password reset email delivery failed:', emailErr.message);
          throw fail(502, 'The reset email could not be sent. Please try again later.');
        }
      }

      // Always return success to prevent user enumeration
      res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/reset-password ───────────────────────────────────
router.post(
  '/reset-password',
  rateLimit('reset-password', 10, 60 * 60 * 1000),
  async (req, res, next) => {
    try {
      const token = stringField(req.body.token, 'Reset token', 200);
      const password = stringField(req.body.password, 'Password', 200);

      if (password.length < 10) {
        throw fail(400, 'Password must be at least 10 characters long.');
      }

      const digest = tokenHash(token);
      const reset = db.prepare(
        'SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > ?'
      ).get(digest, Math.floor(Date.now() / 1000));

      if (!reset) {
        throw fail(400, 'This reset link is invalid or has expired. Request a new link.');
      }

      const hash = await hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, reset.user_id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(reset.user_id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(reset.user_id);

      res.json({ message: 'Password updated. You can now sign in.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
