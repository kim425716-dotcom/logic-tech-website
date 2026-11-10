/**
 * Dashboard Routes
 * GET /api/dashboard — Returns authenticated user's projects and stats
 */
const express = require('express');
const router = express.Router();

const { db, statements } = require('../config/database');
const { publicUser, projectStats } = require('../utils/validation');
const { requireUser } = require('../middleware/auth');

router.get('/', requireUser, (req, res) => {
  let projects = statements.projectList.all(req.user.id);

  // If an administrator visits the client portal and has no personal deliverables,
  // return all active projects across the firm so the admin can inspect the portal view
  if (req.user.role === 'admin' && projects.length === 0) {
    projects = db.prepare(`
      SELECT id, name, description, status, progress, start_date AS startDate, due_date AS dueDate
      FROM projects ORDER BY created_at DESC, id DESC
    `).all();
  }

  res.json({
    user: publicUser(req.user),
    projects,
    stats: projectStats(projects)
  });
});

module.exports = router;
