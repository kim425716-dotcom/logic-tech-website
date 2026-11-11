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

/**
 * Send order confirmation & receipt email to customer
 */
async function sendOrderConfirmationEmail(order) {
  if (!mailer) return null;
  try {
    const items = typeof order.items_json === 'string'
      ? JSON.parse(order.items_json)
      : (order.items || []);

    const itemsRows = items.map(item => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 10px 0; color: #fff; font-weight: 600;">${item.name || 'Product'} <span style="color:#94a3b8; font-size:12px;">&times; ${item.qty || 1}</span></td>
        <td style="padding: 10px 0; text-align: right; color: #c9a45c; font-weight: 700;">KES ${(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</td>
      </tr>
    `).join('');

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display:inline-block; width:52px; height:52px; border-radius:50%; background:rgba(0,178,100,0.15); color:#00b264; line-height:52px; font-size:24px; font-weight:bold; margin-bottom:12px;">✓</div>
        <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Official Store Receipt</div>
        <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 4px;">Thank you for your purchase, ${order.customer_name}!</div>
      </div>

      <div class="meta-box" style="background: rgba(201,164,92,0.05); border: 1px solid rgba(201,164,92,0.25); border-radius: 12px; padding: 16px 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">Order Reference:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #c9a45c; font-family: monospace; font-size: 14px;">${order.ref}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">M-Pesa Receipt Code:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #10b981; font-family: monospace; font-size: 14px;">${order.mpesa_receipt || 'PAID'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">Payment Method:</td>
            <td style="padding: 4px 0; text-align: right; color: #fff;">${order.payment_method === 'card' ? 'Credit / Debit Card' : 'Lipa na M-Pesa'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">Delivery Destination:</td>
            <td style="padding: 4px 0; text-align: right; color: #fff;">${order.address}, ${order.city}, ${order.county}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 10px;">Itemized Invoice</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${itemsRows}
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">Delivery &amp; Logistics:</td>
            <td style="padding: 10px 0; text-align: right; color: #cbd5e1;">KES ${Number(order.delivery || 0).toLocaleString()}</td>
          </tr>
          <tr style="border-top: 2px solid rgba(201,164,92,0.4);">
            <td style="padding: 14px 0 0; font-size: 16px; font-weight: 800; color: #ffffff;">Total Paid:</td>
            <td style="padding: 14px 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #c9a45c;">KES ${Number(order.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://wa.me/254702588886?text=Hi%20Logic%20Tech%2C%20following%20up%20on%20my%20order%20${encodeURIComponent(order.ref)}" class="btn" style="background:#25D366; color:#ffffff !important;">
          💬 Track Delivery via WhatsApp
        </a>
      </div>
    `;

    return await sendBrandedEmail({
      to: order.customer_email,
      subject: `Order Confirmed: ${order.ref} — Logic Tech`,
      preheader: `Your order ${order.ref} has been confirmed. Receipt: ${order.mpesa_receipt || 'PAID'}`,
      headline: '',
      contentHtml,
      textFallback: `Order Confirmed: ${order.ref}\nTotal: KES ${Number(order.total).toLocaleString()}\nM-Pesa Receipt: ${order.mpesa_receipt || 'PAID'}\nDelivery: ${order.address}, ${order.city}, ${order.county}`
    });
  } catch (err) {
    console.error('Failed to send order confirmation email:', err);
    return null;
  }
}

/**
 * Send admin alert email when a new paid order arrives
 */
async function sendAdminOrderNotification(order) {
  if (!mailer) return null;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'info@logictech.co.ke';
  try {
    const items = typeof order.items_json === 'string'
      ? JSON.parse(order.items_json)
      : (order.items || []);

    const itemsSummary = items.map(i => `• ${i.name} (x${i.qty}) — KES ${(i.price * i.qty).toLocaleString()}`).join('<br>');

    const contentHtml = `
      <div style="font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 12px;">
        💰 New Paid Order Received: ${order.ref}
      </div>
      <p style="color: #cbd5e1; margin-bottom: 16px;">
        A customer has completed payment. Please prepare items for dispatch.
      </p>

      <div class="meta-box">
        <strong>Customer:</strong> ${order.customer_name}<br>
        <strong>Phone:</strong> <a href="tel:${order.customer_phone}" style="color:#c9a45c;">${order.customer_phone}</a> (<a href="https://wa.me/${String(order.customer_phone).replace(/\\D/g,'')}" style="color:#25D366;">WhatsApp</a>)<br>
        <strong>Email:</strong> ${order.customer_email}<br>
        <strong>Address:</strong> ${order.address}, ${order.city}, ${order.county}<br>
        <strong>Amount Paid:</strong> KES ${Number(order.total).toLocaleString()}<br>
        <strong>M-Pesa Receipt:</strong> <span style="color:#10b981; font-family:monospace; font-weight:bold;">${order.mpesa_receipt || 'VERIFIED'}</span><br>
        <strong>Payment Method:</strong> ${order.payment_method}
      </div>

      <div style="margin: 16px 0;">
        <strong style="color: #fff;">Items to Pack:</strong><br>
        <div style="margin-top:6px; line-height:1.6; color:#cbd5e1;">${itemsSummary}</div>
      </div>

      <div style="margin-top: 24px;">
        <a href="${process.env.PUBLIC_URL || 'https://logictech.co.ke'}/dashboard-admin.html#shop" class="btn">
          View in Admin Dashboard &rarr;
        </a>
      </div>
    `;

    return await sendBrandedEmail({
      to: adminEmail,
      subject: `[PAID ORDER] ${order.ref} — KES ${Number(order.total).toLocaleString()} (${order.customer_name})`,
      preheader: `New paid order from ${order.customer_name}: KES ${Number(order.total).toLocaleString()}`,
      contentHtml,
      textFallback: `New Paid Order: ${order.ref} by ${order.customer_name} for KES ${order.total}. Receipt: ${order.mpesa_receipt}`
    });
  } catch (err) {
    console.error('Failed to send admin order notification:', err);
    return null;
  }
}

module.exports = {
  mailer,
  smtpConfigured,
  verifySmtp,
  sendBrandedEmail,
  sendOrderConfirmationEmail,
  sendAdminOrderNotification,
  defaultFrom
};
