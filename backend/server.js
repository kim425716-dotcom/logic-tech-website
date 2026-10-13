/**
 * Logic Tech Backend — Express Server Entry Point
 * 
 * Modular Express.js server with:
 *  - SQLite database (node:sqlite native)
 *  - Session-based authentication (scrypt + HttpOnly cookies)
 *  - CORS support for frontend development
 *  - Rate limiting, centralized error handling
 *  - Modular route files
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { seedFaqs, cleanupExpired, db } = require('./config/database');
const { hashPassword } = require('./utils/crypto');
const { validEmail } = require('./utils/validation');
const { smtpConfigured } = require('./utils/mailer');
const { loadUser } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiries');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/projects');
const faqRoutes = require('./routes/faqs');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const chatRoutes = require('./routes/chat');

const app = express();
const port = Number(process.env.PORT || 8080);

// ── Global Middleware ───────────────────────────────────────────────

// CORS — allow frontend origin with credentials (cookies)
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://logictech.co.ke',
  'http://logictech.co.ke',
  'https://www.logictech.co.ke',
  'http://www.logictech.co.ke',
  process.env.FRONTEND_URL,
  process.env.PUBLIC_URL,
  process.env.APP_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);

    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'logictech.co.ke' ||
        host.endsWith('.logictech.co.ke')
      ) {
        return callback(null, true);
      }
    } catch (_e) {
      // ignore URL parsing error
    }

    const normalized = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      return normalized === allowed.replace(/\/$/, '');
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // Allow rather than throwing a 500 error on valid requests
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Parse JSON request bodies (limit 1 MB)
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Load user from session cookie on every request
app.use(loadUser);

// ── API Routes ──────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/project-requests', projectRoutes);
app.use('/api/projects', messageRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// ── Static File Serving ─────────────────────────────────────────────
// Serve frontend static files from the parent directory
const frontendRoot = path.join(__dirname, '..');

// Whitelist allowed extensions for static files
const allowedExtensions = new Set([
  '.html', '.css', '.js', '.json',
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff2', '.woff', '.ttf'
]);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  // Block access to backend files and sensitive directories
  const safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
  const relative = path.relative(frontendRoot, path.resolve(frontendRoot, `.${safePath}`));

  if (
    relative.startsWith('backend') ||
    relative.startsWith('storage') ||
    relative.startsWith('node_modules') ||
    relative.startsWith('.git') ||
    relative === 'package.json' ||
    relative === 'package-lock.json' ||
    relative.startsWith('.')
  ) {
    return res.status(404).json({ error: 'Not found.' });
  }
  next();
});

app.use(express.static(frontendRoot, {
  extensions: ['html'],
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
}));

// Fallback for root or clean URLs (e.g. /login -> login.html)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found.' });
  }
  const potentialFile = path.join(frontendRoot, req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  const indexFile = path.join(frontendRoot, 'index.html');
  res.sendFile(potentialFile, (err) => {
    if (err) {
      res.sendFile(indexFile, () => next());
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// ── Centralized Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ── Initialize & Start ──────────────────────────────────────────────
async function initialize() {
  // Seed FAQs from data/faqs.json if the table is empty
  seedFaqs();

  // Create admin account from environment variables
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = validEmail(process.env.ADMIN_EMAIL);
    if (process.env.ADMIN_PASSWORD.length < 16) {
      throw new Error('ADMIN_PASSWORD must be at least 16 characters.');
    }
    const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'
    `).run(process.env.ADMIN_NAME || 'Logic Tech Admin', email, passwordHash);
  }

  // Clean up expired sessions and password resets
  cleanupExpired();
}

initialize().then(() => {
  app.listen(port, () => {
    console.log(`\n  ✦ Logic Tech Backend`);
    console.log(`  ├─ Server:    http://localhost:${port}`);
    console.log(`  ├─ API:       http://localhost:${port}/api/health`);
    console.log(`  ├─ Frontend:  ${process.env.FRONTEND_URL || 'http://localhost:5500'}`);
    console.log(`  ├─ Mode:      ${process.env.NODE_ENV || 'development'}`);

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn('  ├─ ⚠ Admin:   Not configured (set ADMIN_EMAIL + ADMIN_PASSWORD)');
    } else {
      console.log(`  ├─ Admin:     ${process.env.ADMIN_EMAIL}`);
    }

    if (!smtpConfigured) {
      console.warn('  └─ ⚠ SMTP:    Not configured (password reset unavailable)');
    } else {
      console.log('  └─ SMTP:      Configured ✓');
    }
    console.log('');
  });
}).catch(err => {
  console.error('Server initialization failed:', err);
  process.exitCode = 1;
});
