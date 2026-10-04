/**
 * Dashboard Routes
 * GET /api/dashboard — Returns authenticated user's projects and stats
 */
const express = require('express');
const router = express.Router();

const { statements } = require('../config/database');
const { publicUser, projectStats } = require('../utils/validation');
const { requireUser } = require('../middleware/auth');

router.get('/', requireUser, (req, res) => {
  const projects = statements.projectList.all(req.user.id);
  res.json({
    user: publicUser(req.user),
    projects,
    stats: projectStats(projects)
  });
});

module.exports = router;
