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

// ── Projects ────────────────────────────────────────────────────────
router.get('/projects', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.id, p.name, p.description, p.status, p.progress,
           p.due_date AS dueDate, p.created_at AS createdAt,
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
    const dueDate = req.body.dueDate ? stringField(req.body.dueDate, 'Due date', 50, false) : null;

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, description, status, progress, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name, description, status, progress, dueDate);

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
    const dueDate = req.body.dueDate ? stringField(req.body.dueDate, 'Due date', 50, false) : null;

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, status = ?, progress = ?, due_date = ?
      WHERE id = ?
    `).run(name, description, status, progress, dueDate, projectId);

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
