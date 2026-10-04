/**
 * Project Request Routes
 * POST /api/project-requests — Authenticated client submits a new project request
 */
const express = require('express');
const router = express.Router();

const { db } = require('../config/database');
const { stringField } = require('../utils/validation');
const { requireUser } = require('../middleware/auth');

router.post('/', requireUser, (req, res, next) => {
  try {
    const name = stringField(req.body.name, 'Project name', 160);
    const description = stringField(req.body.description, 'Project details', 5000);

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, description, status, progress)
      VALUES (?, ?, ?, 'Pending', 0)
    `).run(req.user.id, name, description);

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      message: 'Project request created.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
