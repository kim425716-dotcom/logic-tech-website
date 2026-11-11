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
const { mailer, smtpConfigured, sendBrandedEmail } = require('../utils/mailer');
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

function seedClientStarterProjects(userId) {
  try {
    const existing = db.prepare('SELECT COUNT(*) AS count FROM projects WHERE user_id = ?').get(userId);
    if (existing && existing.count > 0) return;

    const demoProjects = [
      {
        name: 'Enterprise M-Pesa & Core Banking Rails Gateway',
        description: '[Scope Tier: Enterprise Custom Architecture]\n\nHigh-throughput financial switch integrating Safaricom Daraja 3.0 B2C/C2B APIs with core banking ledger. Features automated HMAC-SHA256 signature verification, idempotency key deduplication, and dead-letter Kafka queuing.',
        status: 'In Progress',
        progress: 65,
        startDate: '2026-09-15',
        dueDate: '2026-11-30'
      },
      {
        name: 'AWS Multi-Region Kubernetes & Infrastructure as Code',
        description: '[Scope Tier: High-Availability Cloud Native]\n\nTerraform IaC deployment across af-south-1 (Cape Town) and eu-west-1 (Ireland). Provisioning auto-scaling Amazon EKS clusters, Istio service mesh, and Aurora PostgreSQL multi-region replication with sub-30ms failover.',
        status: 'Review',
        progress: 90,
        startDate: '2026-09-28',
        dueDate: '2026-10-31'
      },
      {
        name: 'Zero-Trust Security & KDPA 2019 Compliance Audit',
        description: '[Scope Tier: Security & Compliance Audit]\n\nEnd-to-end vulnerability assessment and penetration testing across all public API gateways. Automated KDPA 2019 data subject access request (DSAR) workflows and SOC2 compliance controls.',
        status: 'Completed',
        progress: 100,
        startDate: '2026-08-01',
        dueDate: '2026-09-15'
      }
    ];

    const insertProj = db.prepare(`
      INSERT INTO projects (user_id, name, description, status, progress, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMsg = db.prepare(`
      INSERT INTO messages (project_id, sender_id, content, is_internal)
      VALUES (?, ?, ?, 0)
    `);

    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    const adminId = adminUser ? adminUser.id : userId;

    for (const p of demoProjects) {
      const res = insertProj.run(userId, p.name, p.description, p.status, p.progress, p.startDate, p.dueDate);
      const projId = Number(res.lastInsertRowid);
      insertMsg.run(
        projId,
        adminId,
        `Welcome to the ${p.name} engagement workspace! Our solutions squad has scaffolded the milestone pipeline and architecture blueprint. Feel free to leave questions or milestone feedback directly in this thread.`
      );
    }
  } catch (err) {
    console.error('Error seeding starter deliverables for client:', err);
  }
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
      seedClientStarterProjects(user.id);
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
        seedClientStarterProjects(user.id);
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

// ── PUT/POST /api/auth/profile (Update Username) ───────────────────
async function handleUpdateProfile(req, res, next) {
  try {
    const name = stringField(req.body.name, 'Username / Name', 120);
    if (name.length < 2) {
      throw fail(400, 'Username must be at least 2 characters long.');
    }

    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
    const updated = statements.userById.get(req.user.id);
    res.json({
      message: 'Username updated successfully.',
      user: publicUser(updated)
    });
  } catch (err) {
    next(err);
  }
}
router.put('/profile', requireUser, handleUpdateProfile);
router.post('/profile', requireUser, handleUpdateProfile);

// ── POST/PUT /api/auth/change-password ──────────────────────────────
async function handleChangePassword(req, res, next) {
  try {
    const currentPassword = stringField(req.body.currentPassword, 'Current password', 200);
    const newPassword = stringField(req.body.newPassword, 'New password', 200);

    if (req.body.confirmPassword !== undefined && req.body.confirmPassword !== null && req.body.confirmPassword !== '') {
      const confirmPassword = stringField(req.body.confirmPassword, 'Confirm password', 200);
      if (newPassword !== confirmPassword) {
        throw fail(400, 'New passwords do not match.');
      }
    }

    if (newPassword.length < 10) {
      throw fail(400, 'New password must be at least 10 characters long.');
    }

    const user = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) throw fail(404, 'User account not found.');

    const isMatch = await passwordMatches(currentPassword, user.password_hash);
    if (!isMatch) {
      throw fail(400, 'Current password is incorrect.');
    }

    if (await passwordMatches(newPassword, user.password_hash)) {
      throw fail(400, 'New password cannot be the same as your current password.');
    }

    const newHash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    // Invalidate other sessions for security while keeping current session active
    const cookies = parseCookies(req.headers.cookie);
    const currentToken = cookies[COOKIE_NAME];
    if (currentToken) {
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(req.user.id, tokenHash(currentToken));
    }

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}
router.post('/change-password', requireUser, rateLimit('change-password', 6, 15 * 60 * 1000), handleChangePassword);
router.put('/change-password', requireUser, rateLimit('change-password', 6, 15 * 60 * 1000), handleChangePassword);

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
          await sendBrandedEmail({
            to: user.email,
            subject: 'Reset your Logic Tech password',
            headline: 'Password Reset Request',
            contentHtml: `
              <p>Hello <strong>${user.name || 'Valued Client'}</strong>,</p>
              <p>We received a request to reset your password for your Logic Tech portal account.</p>
              <p>Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>.</p>
              <div style="text-align:center; margin:24px 0;">
                <a href="${resetUrl}" class="btn">Reset My Password</a>
              </div>
              <p style="font-size:13px; color:#94a3b8;">If you did not request a password reset, you can safely ignore this email. Your account remains completely secure.</p>
              <div class="meta-box" style="font-size:12px; color:#64748b; word-break:break-all;">
                Or copy and paste this link in your browser:<br>
                <a href="${resetUrl}" style="color:#c9a45c;">${resetUrl}</a>
              </div>
            `,
            textFallback: `Use this link to reset your Logic Tech password within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
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
