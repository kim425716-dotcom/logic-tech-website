/**
 * Email Transport (Nodemailer)
 * Configured for cPanel Webmail / SMTP (mail.logictech.co.ke)
 */
const nodemailer = require('nodemailer');

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
);

const defaultFrom = process.env.SMTP_FROM || `Logic Tech <${process.env.SMTP_USER || 'info@logictech.co.ke'}>`;

const mailer = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.logictech.co.ke',
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        // Handle common cPanel shared certificate hostnames
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true'
      }
    })
  : null;

/**
 * Verify SMTP connection
 */
async function verifySmtp() {
  if (!mailer) {
    return { ok: false, error: 'SMTP is not configured in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASSWORD required).' };
  }
  try {
    await mailer.verify();
    return { ok: true, message: `Connected to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465} as ${process.env.SMTP_USER}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send an email with standard Logic Tech branded luxury HTML wrapper
 */
async function sendBrandedEmail({ to, subject, preheader, headline, contentHtml, textFallback }) {
  if (!mailer) return null;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { margin:0; padding:0; background:#060b16; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#e2e8f0; }
        .wrapper { width:100%; background:#060b16; padding:30px 15px; }
        .card { max-width:600px; margin:0 auto; background:#0b1120; border:1px solid rgba(201,164,92,0.3); border-radius:16px; overflow:hidden; box-shadow:0 15px 40px rgba(0,0,0,0.6); }
        .header { background:linear-gradient(135deg, #0d1527, #070c17); padding:28px 30px; border-bottom:1px solid rgba(255,255,255,0.06); text-align:center; }
        .brand { font-size:22px; font-weight:800; color:#ffffff; letter-spacing:0.04em; }
        .accent { color:#c9a45c; }
        .body { padding:32px 30px; line-height:1.65; font-size:15px; color:#cbd5e1; }
        .headline { font-size:20px; font-weight:700; color:#ffffff; margin:0 0 16px; font-family:Georgia, serif; }
        .footer { padding:20px 30px; background:#070c17; border-top:1px solid rgba(255,255,255,0.06); font-size:12px; color:#64748b; text-align:center; line-height:1.5; }
        .btn { display:inline-block; padding:12px 24px; background:linear-gradient(135deg, #c9a45c, #a88438); color:#0b1120 !important; font-weight:700; text-decoration:none; border-radius:8px; margin-top:20px; font-size:14px; }
        .meta-box { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; margin:20px 0; font-size:14px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <div class="brand">LOGIC <span class="accent">TECH</span></div>
            <div style="font-size:12px; color:#94a3b8; margin-top:4px; letter-spacing:0.08em; text-transform:uppercase;">Enterprise Engineering &amp; Solutions</div>
          </div>
          <div class="body">
            ${headline ? `<div class="headline">${headline}</div>` : ''}
            ${contentHtml}
          </div>
          <div class="footer">
            <div>&copy; ${new Date().getFullYear()} Logic Tech Ltd. All rights reserved.</div>
            <div>The Mirage Towers, Chiromo Road, Westlands, Nairobi, Kenya</div>
            <div style="margin-top:6px;">Need urgent concierge assistance? <a href="https://wa.me/254702588886" style="color:#c9a45c;">Chat on WhatsApp</a></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return mailer.sendMail({
    from: defaultFrom,
    to,
    subject,
    text: textFallback || subject,
    html
  });
}

module.exports = { mailer, smtpConfigured, verifySmtp, sendBrandedEmail, defaultFrom };
