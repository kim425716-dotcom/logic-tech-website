/**
 * Inquiry Routes
 * POST /api/inquiries — Submit a project inquiry (public, optionally authenticated)
 */
const express = require('express');
const router = express.Router();

const { db } = require('../config/database');
const { stringField, validEmail, fail } = require('../utils/validation');
const rateLimit = require('../middleware/rateLimit');

router.post(
  '/',
  rateLimit('inquiry', 10, 60 * 60 * 1000),
  async (req, res, next) => {
    try {
      const name = stringField(req.body.name, 'Name', 120);
      const email = validEmail(req.body.email);
      const company = stringField(req.body.company, 'Company', 180, false);
      const phone = stringField(req.body.phone, 'Phone', 50, false);
      const subject = stringField(req.body.subject, 'Service interest', 180);
      const budget = stringField(req.body.budget, 'Budget', 60, false);
      const message = stringField(req.body.message, 'Project details', 10000);

      const result = db.prepare(`
        INSERT INTO inquiries (user_id, name, email, company, phone, subject, budget, message, nda_requested)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user ? req.user.id : null,
        name, email, company, phone, subject, budget, message,
        (req.body.nda_requested || req.body.ndaRequested || req.body.nda) ? 1 : 0
      );

      res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Inquiry received.'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
