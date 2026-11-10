/**
 * SQLite Database Configuration
 * Initializes the database connection, creates schema, and seeds data.
 */
const fs = require('node:fs');
const path = require('node:path');
let Database;
try {
  Database = require('better-sqlite3');
} catch (_e) {
  Database = null;
}

const storagePath = path.join(__dirname, '..', 'storage');
const databasePath = path.join(storagePath, 'logic-tech.sqlite');
const faqSeedPath = path.join(__dirname, '..', '..', 'data', 'faqs.json');

// Ensure storage directory exists
fs.mkdirSync(storagePath, { recursive: true });

let db;
if (Database) {
  try {
    db = new Database(databasePath);
  } catch (_e) {
    db = null;
  }
}

if (!db) {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(databasePath);
  db.pragma = (str) => db.exec(`PRAGMA ${str}`);
  db.transaction = (fn) => (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
  };
}

// ── Pragmas & Schema ────────────────────────────────────────────────
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`

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
    start_date TEXT,
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

// Migration for existing databases
try {
  const cols = db.prepare('PRAGMA table_info(projects)').all();
  if (!cols.some(c => c.name === 'start_date')) {
    db.exec('ALTER TABLE projects ADD COLUMN start_date TEXT');
  }
} catch (err) {
  console.error('Database migration note:', err);
}

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
    SELECT id, name, description, status, progress, start_date AS startDate, due_date AS dueDate
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
    const insertAll = db.transaction((rows) => {
      for (const faq of rows) {
        insertFaq.run(faq.category, faq.q, faq.a);
      }
    });
    insertAll(faqs);
  }
}

// ── Default Enterprise Projects Seed ────────────────────────────────
function seedProjects() {
  const clients = db.prepare("SELECT id FROM users WHERE role = 'client' ORDER BY id ASC").all();
  if (!clients.length) return;

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
  const adminId = adminUser ? adminUser.id : clients[0].id;

  for (const client of clients) {
    const existing = db.prepare('SELECT COUNT(*) AS count FROM projects WHERE user_id = ?').get(client.id);
    if (!existing || existing.count === 0) {
      for (const p of demoProjects) {
        const res = insertProj.run(client.id, p.name, p.description, p.status, p.progress, p.startDate, p.dueDate);
        const projId = Number(res.lastInsertRowid);
        insertMsg.run(
          projId,
          adminId,
          `Welcome to the ${p.name} engagement workspace! Our solutions squad has scaffolded the milestone pipeline and architecture blueprint. Feel free to leave questions or milestone feedback directly in this thread.`
        );
      }
    }
  }
}

// ── Cleanup expired sessions & resets ───────────────────────────────
function cleanupExpired() {
  const now = Math.floor(Date.now() / 1000);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(now);
}

module.exports = { db, statements, seedFaqs, seedProjects, cleanupExpired };
