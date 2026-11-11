/**
 * Inquiry Routes
 * POST /api/inquiries — Submit a project inquiry (public, optionally authenticated)
 */
const express = require('express');
const router = express.Router();

const { db } = require('../config/database');
const { stringField, validEmail, fail } = require('../utils/validation');
const rateLimit = require('../middleware/rateLimit');
const { mailer, sendBrandedEmail } = require('../utils/mailer');

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
      const ndaRequested = (req.body.nda_requested || req.body.ndaRequested || req.body.nda) ? 1 : 0;

      const result = db.prepare(`
        INSERT INTO inquiries (user_id, name, email, company, phone, subject, budget, message, nda_requested)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user ? req.user.id : null,
        name, email, company, phone, subject, budget, message,
        ndaRequested
      );

      const inquiryId = Number(result.lastInsertRowid);

      // Async email alerts if SMTP is configured
      if (mailer) {
        Promise.resolve().then(async () => {
          try {
            const adminRecipient = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'info@logictech.co.ke';
            
            // 1. Alert to Admin
            await sendBrandedEmail({
              to: adminRecipient,
              subject: `[New Inquiry #${inquiryId}] ${subject} — ${name}`,
              headline: `New Project Inquiry #${inquiryId}`,
              contentHtml: `
                <p>A new client inquiry has been submitted via the website.</p>
                <div class="meta-box">
                  <div><strong>Client:</strong> ${name}</div>
                  <div><strong>Email:</strong> <a href="mailto:${email}" style="color:#c9a45c;">${email}</a></div>
                  ${phone ? `<div><strong>Phone/WhatsApp:</strong> ${phone}</div>` : ''}
                  ${company ? `<div><strong>Company:</strong> ${company}</div>` : ''}
                  <div><strong>Subject / Service:</strong> ${subject}</div>
                  ${budget ? `<div><strong>Budget:</strong> ${budget}</div>` : ''}
                  ${ndaRequested ? `<div><strong>NDA Requested:</strong> Yes</div>` : ''}
                </div>
                <div style="margin-top:16px;">
                  <strong>Message / Technical Scope:</strong>
                  <div style="margin-top:8px; padding:12px; background:rgba(0,0,0,0.3); border-radius:6px; white-space:pre-wrap; font-size:14px; color:#e2e8f0;">${message}</div>
                </div>
              `,
              textFallback: `New Inquiry from ${name} (${email}): ${subject}\n\n${message}`
            });

            // 2. Acknowledgment to Customer
            await sendBrandedEmail({
              to: email,
              subject: `Inquiry Confirmation — ${subject} | Logic Tech`,
              headline: `Thank You for Inquiring, ${name.split(' ')[0]}`,
              contentHtml: `
                <p>We have successfully received your inquiry regarding <strong>${subject}</strong>.</p>
                <p>Our solutions architecture and engineering team in Nairobi is reviewing your technical requirements. We will prepare preliminary scoping and reach back out within <strong>24 business hours</strong>.</p>
                <div class="meta-box">
                  <div><strong>Reference ID:</strong> #${inquiryId}</div>
                  <div><strong>Service Track:</strong> ${subject}</div>
                  ${ndaRequested ? `<div><strong>Status:</strong> Mutual NDA queued for execution</div>` : ''}
                </div>
                <p>If your project requires urgent architecture consultation or sprint kickoff, you can message our engineering lead directly on WhatsApp:</p>
                <a href="https://wa.me/254702588886?text=${encodeURIComponent(`Hi Logic Tech, I submitted Inquiry #${inquiryId} for ${subject}`)}" class="btn">
                  Chat on WhatsApp &rarr;
                </a>
              `,
              textFallback: `Thank you for your inquiry regarding ${subject}. We have received your request and our engineering team will get back to you within 24 hours.`
            });
          } catch (e) {
            console.error('Inquiry email alert delivery failed:', e.message);
          }
        });
      }

      res.status(201).json({
        id: inquiryId,
        message: 'Inquiry received.'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
