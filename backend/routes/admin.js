/**
 * Admin Routes
 * Full backoffice management endpoints for Logic Tech.
 *
 * GET    /api/admin/stats         — System overview metrics
 * GET    /api/admin/inquiries     — List all client inquiries
 * DELETE /api/admin/inquiries/:id — Delete inquiry
 * GET    /api/admin/projects      — List all client projects with client metadata
 * POST   /api/admin/projects      — Create project for any client
 * PUT    /api/admin/projects/:id  — Update project progress, status, details
 * DELETE /api/admin/projects/:id  — Delete project
 * GET    /api/admin/users         — List all registered users with activity summary
 * GET    /api/admin/faqs          — List all FAQs (published & unpublished)
 * POST   /api/admin/faqs          — Create FAQ
 * PUT    /api/admin/faqs/:id      — Update FAQ
 * DELETE /api/admin/faqs/:id      — Delete FAQ
 */
const express = require('express');
const router = express.Router();

const { db } = require('../config/database');
const { fail, stringField, validateFaq } = require('../utils/validation');
const { requireAdmin } = require('../middleware/auth');
const { mailer, smtpConfigured } = require('../utils/mailer');

// All admin routes require authenticated admin
router.use(requireAdmin);

// ── GET /api/admin/stats ────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const totalInquiries = db.prepare('SELECT COUNT(*) AS count FROM inquiries').get().count;
  const totalUsers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'client'").get().count;
  const totalProjects = db.prepare('SELECT COUNT(*) AS count FROM projects').get().count;
  const activeProjects = db.prepare(
    "SELECT COUNT(*) AS count FROM projects WHERE status NOT IN ('Completed', 'Cancelled')"
  ).get().count;
  const totalFaqs = db.prepare('SELECT COUNT(*) AS count FROM faqs').get().count;
  const publishedFaqs = db.prepare('SELECT COUNT(*) AS count FROM faqs WHERE published = 1').get().count;

  res.json({
    stats: {
      totalInquiries,
      totalUsers,
      totalProjects,
      activeProjects,
      totalFaqs,
      publishedFaqs
    }
  });
});

// ── Inquiries ───────────────────────────────────────────────────────
router.get('/inquiries', (_req, res) => {
  const inquiries = db.prepare(`
    SELECT i.id, i.name, i.email, i.company, i.phone, i.subject, i.budget,
           i.message, i.nda_requested AS ndaRequested, i.created_at AS createdAt,
           u.name AS accountName, u.email AS accountEmail
    FROM inquiries i
    LEFT JOIN users u ON u.id = i.user_id
    ORDER BY i.created_at DESC
  `).all();

  res.json({ inquiries });
});

router.delete('/inquiries/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM inquiries WHERE id = ?').run(Number(req.params.id));
    if (Number(result.changes) === 0) throw fail(404, 'Inquiry not found.');
    res.json({ message: 'Inquiry deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/inquiries/:id/reply', async (req, res, next) => {
  try {
    const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(Number(req.params.id));
    if (!inquiry) throw fail(404, 'Inquiry not found.');

    const subject = stringField(req.body.subject, 'Subject', 200);
    const message = stringField(req.body.message, 'Message', 10000);

    if (mailer) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'info@logictech.co.ke',
        to: inquiry.email,
        subject,
        text: message
      });
      return res.json({ message: 'Email sent successfully via SMTP.' });
    } else {
      return res.status(400).json({ error: 'SMTP is not configured on the server. Please use Gmail or your desktop email client.' });
    }
  } catch (err) {
    next(err);
  }
});

// ── Projects ────────────────────────────────────────────────────────
router.get('/projects', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.id, p.name, p.description, p.status, p.progress,
           p.start_date AS startDate, p.due_date AS dueDate, p.created_at AS createdAt,
           u.id AS userId, u.name AS clientName, u.email AS clientEmail
    FROM projects p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC, p.id DESC
  `).all();

  res.json({ projects });
});

router.post('/projects', (req, res, next) => {
  try {
    const userId = Number(req.body.userId);
    if (!userId) throw fail(400, 'Client user ID is required.');

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) throw fail(404, 'Client not found.');

    const name = stringField(req.body.name, 'Project name', 160);
    const description = stringField(req.body.description, 'Project description', 5000);
    const status = stringField(req.body.status || 'Pending', 'Status', 40);
    const progress = Math.min(100, Math.max(0, Number(req.body.progress || 0)));
    const startDate = req.body.startDate ? stringField(req.body.startDate, 'Start date', 50, false) : new Date().toISOString().slice(0, 10);
    const dueDate = req.body.dueDate ? stringField(req.body.dueDate, 'Due date', 50, false) : null;

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, description, status, progress, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, description, status, progress, startDate, dueDate);

    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Project created.' });
  } catch (err) {
    next(err);
  }
});

router.put('/projects/:id', (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!existing) throw fail(404, 'Project not found.');

    const name = stringField(req.body.name, 'Project name', 160);
    const description = stringField(req.body.description, 'Project description', 5000);
    const status = stringField(req.body.status || 'Pending', 'Status', 40);
    const progress = Math.min(100, Math.max(0, Number(req.body.progress || 0)));
    const startDate = req.body.startDate ? stringField(req.body.startDate, 'Start date', 50, false) : null;
    const dueDate = req.body.dueDate ? stringField(req.body.dueDate, 'Due date', 50, false) : null;

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, status = ?, progress = ?, start_date = ?, due_date = ?
      WHERE id = ?
    `).run(name, description, status, progress, startDate, dueDate, projectId);

    res.json({ message: 'Project updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/projects/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(Number(req.params.id));
    if (Number(result.changes) === 0) throw fail(404, 'Project not found.');
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── Users / Clients ─────────────────────────────────────────────────
router.get('/users', (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at AS createdAt,
           (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS projectCount,
           (SELECT COUNT(*) FROM inquiries i WHERE i.user_id = u.id) AS inquiryCount
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  res.json({ users });
});

router.delete('/users/:id', (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!targetId || isNaN(targetId)) throw fail(400, 'Invalid user ID.');

    if (req.user && req.user.id === targetId) {
      throw fail(400, 'You cannot delete your own active administrator account.');
    }

    const targetUser = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(targetId);
    if (!targetUser) throw fail(404, 'User account not found.');

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
    if (Number(result.changes) === 0) throw fail(404, 'User account not found.');

    res.json({ message: 'User account and associated records deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── Bulk Delete ─────────────────────────────────────────────────────
router.post('/bulk-delete', (req, res, next) => {
  try {
    const { type, ids } = req.body;
    if (!type || !Array.isArray(ids) || ids.length === 0) {
      throw fail(400, 'Invalid bulk delete request. Specify type and array of IDs.');
    }

    const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (numericIds.length === 0) throw fail(400, 'No valid record IDs provided.');

    let table = '';
    if (type === 'inquiries') table = 'inquiries';
    else if (type === 'projects') table = 'projects';
    else if (type === 'faqs') table = 'faqs';
    else if (type === 'users') {
      table = 'users';
      const safeIds = numericIds.filter(id => !(req.user && req.user.id === id));
      if (safeIds.length === 0) throw fail(400, 'Cannot delete your own active admin account.');
      const placeholders = safeIds.map(() => '?').join(',');
      const result = db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...safeIds);
      return res.json({ message: `Successfully deleted ${result.changes} user(s).`, deletedCount: result.changes });
    } else {
      throw fail(400, 'Invalid entity type for bulk deletion.');
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(...numericIds);
    res.json({ message: `Successfully deleted ${result.changes} record(s).`, deletedCount: result.changes });
  } catch (err) {
    next(err);
  }
});

// ── FAQs ────────────────────────────────────────────────────────────
router.get('/faqs', (_req, res) => {
  const faqs = db.prepare(`
    SELECT id, category, question AS q, answer AS a, published, created_at AS createdAt
    FROM faqs ORDER BY category ASC, id ASC
  `).all();

  res.json({ faqs });
});

router.post('/faqs', (req, res, next) => {
  try {
    const faq = validateFaq(req.body);
    const result = db.prepare(
      'INSERT INTO faqs (category, question, answer, published) VALUES (?, ?, ?, ?)'
    ).run(faq.category, faq.question, faq.answer, faq.published);

    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'FAQ created.' });
  } catch (err) {
    next(err);
  }
});

router.put('/faqs/:id', (req, res, next) => {
  try {
    const faq = validateFaq(req.body);
    const result = db.prepare(
      'UPDATE faqs SET category = ?, question = ?, answer = ?, published = ? WHERE id = ?'
    ).run(faq.category, faq.question, faq.answer, faq.published, Number(req.params.id));

    if (Number(result.changes) === 0) throw fail(404, 'FAQ not found.');
    res.json({ message: 'FAQ updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/faqs/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM faqs WHERE id = ?').run(Number(req.params.id));
    if (Number(result.changes) === 0) throw fail(404, 'FAQ not found.');
    res.json({ message: 'FAQ deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
