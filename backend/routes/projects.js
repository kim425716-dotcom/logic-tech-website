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
    const startDate = req.body.startDate ? stringField(req.body.startDate, 'Start date', 50, false) : new Date().toISOString().slice(0, 10);

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, description, status, progress, start_date)
      VALUES (?, ?, ?, 'Pending', 0, ?)
    `).run(req.user.id, name, description, startDate);

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      message: 'Project request created.'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/seed-demo', requireUser, (req, res, next) => {
  try {
    const existing = db.prepare('SELECT COUNT(*) AS count FROM projects WHERE user_id = ?').get(req.user.id);
    if (existing && existing.count > 0 && !req.body.force) {
      return res.json({ message: 'User already has deliverables in workspace.', count: existing.count });
    }

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
    const adminId = adminUser ? adminUser.id : req.user.id;

    for (const p of demoProjects) {
      const resProj = insertProj.run(req.user.id, p.name, p.description, p.status, p.progress, p.startDate, p.dueDate);
      const projId = Number(resProj.lastInsertRowid);

      insertMsg.run(
        projId,
        adminId,
        `Welcome to the ${p.name} engagement workspace! Our solutions squad has scaffolded the milestone pipeline and architecture blueprint. Feel free to leave questions or milestone feedback directly in this thread.`
      );
    }

    res.status(201).json({
      message: 'Sandbox deliverables generated successfully.',
      count: demoProjects.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
