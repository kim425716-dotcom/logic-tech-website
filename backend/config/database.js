/**
 * SQLite Database Configuration
 * Initializes the database connection, creates schema, and seeds data.
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const storagePath = path.join(__dirname, '..', 'storage');
const databasePath = path.join(storagePath, 'logic-tech.sqlite');
const faqSeedPath = path.join(__dirname, '..', '..', 'data', 'faqs.json');

// Ensure storage directory exists
fs.mkdirSync(storagePath, { recursive: true });

const db = new DatabaseSync(databasePath);

// ── Schema ──────────────────────────────────────────────────────────
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL,
    budget TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    nda_requested INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
  CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);
`);

// ── Prepared Statements ─────────────────────────────────────────────
const statements = {
  userByEmail: db.prepare(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?'
  ),
  userById: db.prepare(
    'SELECT id, name, email, role FROM users WHERE id = ?'
  ),
  sessionUser: db.prepare(`
    SELECT users.id, users.name, users.email, users.role
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `),
  projectList: db.prepare(`
    SELECT id, name, description, status, progress, due_date AS dueDate
    FROM projects WHERE user_id = ? ORDER BY created_at DESC, id DESC
  `),
  publicFaqs: db.prepare(`
    SELECT id, category, question AS q, answer AS a
    FROM faqs WHERE published = 1 ORDER BY id
  `)
};

// ── FAQ Seed ────────────────────────────────────────────────────────
function seedFaqs() {
  if (db.prepare('SELECT COUNT(*) AS count FROM faqs').get().count === 0) {
    const faqs = JSON.parse(fs.readFileSync(faqSeedPath, 'utf8'));
    const insertFaq = db.prepare(
      'INSERT INTO faqs (category, question, answer) VALUES (?, ?, ?)'
    );
    db.exec('BEGIN');
    try {
      for (const faq of faqs) {
        insertFaq.run(faq.category, faq.q, faq.a);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

// ── Cleanup expired sessions & resets ───────────────────────────────
function cleanupExpired() {
  const now = Math.floor(Date.now() / 1000);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(now);
}

module.exports = { db, statements, seedFaqs, cleanupExpired };
