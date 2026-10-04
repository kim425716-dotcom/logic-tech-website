/**
 * Project Messages & Live Discussion Routes
 * 
 * GET  /api/projects/:projectId/messages — List messages for a project
 * POST /api/projects/:projectId/messages — Send a new message / milestone update
 */
const express = require('express');
const router = express.Router({ mergeParams: true });

const { db } = require('../config/database');
const { fail, stringField } = require('../utils/validation');
const { requireUser } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// All message routes require an authenticated user (client or admin)
router.use(requireUser);

// ── GET /api/projects/:projectId/messages ───────────────────────────
router.get('/:projectId/messages', (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) throw fail(400, 'Invalid project ID.');

    const project = db.prepare(`
      SELECT p.id, p.user_id AS userId, p.name, p.status, p.progress, p.due_date AS dueDate,
             u.name AS clientName, u.email AS clientEmail
      FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
    `).get(projectId);

    if (!project) throw fail(404, 'Project not found.');

    // Check permissions: Must be project owner OR admin
    if (req.user.role !== 'admin' && req.user.id !== project.userId) {
      throw fail(403, 'You do not have permission to view messages for this project.');
    }

    // Clients cannot see internal team notes
    const query = req.user.role === 'admin'
      ? `
        SELECT m.id, m.project_id AS projectId, m.sender_id AS senderId,
               m.content, m.is_internal AS isInternal, m.created_at AS createdAt,
               u.name AS senderName, u.email AS senderEmail, u.role AS senderRole
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.project_id = ?
        ORDER BY m.created_at ASC, m.id ASC
      `
      : `
        SELECT m.id, m.project_id AS projectId, m.sender_id AS senderId,
               m.content, m.is_internal AS isInternal, m.created_at AS createdAt,
               u.name AS senderName, u.email AS senderEmail, u.role AS senderRole
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.project_id = ? AND m.is_internal = 0
        ORDER BY m.created_at ASC, m.id ASC
      `;

    const messages = db.prepare(query).all(projectId);

    res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress,
        dueDate: project.dueDate,
        clientName: project.clientName,
        clientEmail: project.clientEmail
      },
      messages
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/projects/:projectId/messages ──────────────────────────
router.post(
  '/:projectId/messages',
  rateLimit('project-message', 60, 60 * 1000), // Up to 60 messages / min
  (req, res, next) => {
    try {
      const projectId = Number(req.params.projectId);
      if (!projectId) throw fail(400, 'Invalid project ID.');

      const project = db.prepare('SELECT id, user_id AS userId, name FROM projects WHERE id = ?').get(projectId);
      if (!project) throw fail(404, 'Project not found.');

      // Check permissions: Must be project owner OR admin
      if (req.user.role !== 'admin' && req.user.id !== project.userId) {
        throw fail(403, 'You do not have permission to post messages to this project.');
      }

      const content = stringField(req.body.content, 'Message content', 5000);
      const isInternal = req.user.role === 'admin' && Boolean(req.body.isInternal) ? 1 : 0;

      const result = db.prepare(`
        INSERT INTO messages (project_id, sender_id, content, is_internal)
        VALUES (?, ?, ?, ?)
      `).run(projectId, req.user.id, content, isInternal);

      const inserted = db.prepare(`
        SELECT m.id, m.project_id AS projectId, m.sender_id AS senderId,
               m.content, m.is_internal AS isInternal, m.created_at AS createdAt,
               u.name AS senderName, u.email AS senderEmail, u.role AS senderRole
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.id = ?
      `).get(Number(result.lastInsertRowid));

      res.status(201).json({
        message: 'Message sent.',
        entry: inserted
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
