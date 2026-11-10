/**
 * Shop Routes — M-Pesa STK Push, Order Management
 *
 * POST /api/shop/orders          — create a new shop order
 * POST /api/shop/mpesa/stk-push  — trigger Safaricom Daraja STK Push
 * POST /api/shop/mpesa/callback  — Safaricom payment callback (webhook)
 * GET  /api/shop/orders/:ref     — poll order/payment status
 * GET  /api/admin/shop/orders    — admin: list all orders (requireAdmin)
 * PUT  /api/admin/shop/orders/:id/status — admin: update order status
 */
const express = require('express');
const https = require('node:https');
const { db } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { fail, stringField, validEmail } = require('../utils/validation');

const router = express.Router();

// ── Schema migration: shop tables ──────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS shop_orders (
    id          INTEGER PRIMARY KEY,
    ref         TEXT NOT NULL UNIQUE,
    customer_name  TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    county      TEXT NOT NULL,
    city        TEXT NOT NULL,
    address     TEXT NOT NULL,
    items_json  TEXT NOT NULL,
    subtotal    INTEGER NOT NULL,
    delivery    INTEGER NOT NULL DEFAULT 0,
    total       INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'mpesa',
    payment_status TEXT NOT NULL DEFAULT 'pending'
      CHECK(payment_status IN ('pending','processing','paid','failed','cancelled')),
    mpesa_checkout_id TEXT,
    mpesa_receipt    TEXT,
    status      TEXT NOT NULL DEFAULT 'Processing'
      CHECK(status IN ('Processing','Confirmed','Shipped','Delivered','Cancelled')),
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_shop_orders_ref   ON shop_orders(ref);
  CREATE INDEX IF NOT EXISTS idx_shop_orders_email ON shop_orders(customer_email);
  CREATE INDEX IF NOT EXISTS idx_shop_orders_mpesa ON shop_orders(mpesa_checkout_id);
`);

// ── Helpers ─────────────────────────────────────────────────────────

/** Generate order reference: LT-SHOP-2026-XXXX */
function generateRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ts   = Date.now().toString(36).toUpperCase().slice(-4);
  return `LT-SHOP-${year}-${rand}${ts}`;
}

/** Sanitise a Kenyan phone number to 254XXXXXXXXX */
function normaliseMpesaPhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^0[7-9]\d{8}$/.test(digits))  return '254' + digits.slice(1);
  if (/^254[7-9]\d{8}$/.test(digits)) return digits;
  if (/^\+?254[7-9]\d{8}$/.test(digits)) return digits.replace(/^\+/, '');
  throw fail(400, 'Enter a valid Safaricom number (07XX or 254XX format).');
}

/** Validate that an integer amount is in KES cents (whole KES here) */
function validAmount(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 999999) {
    throw fail(400, 'Invalid order amount.');
  }
  return n;
}

/**
 * Get a Safaricom Daraja OAuth2 access token.
 * Uses Basic auth with consumer key + secret from env.
 */
function getDarajaToken() {
  return new Promise((resolve, reject) => {
    const key    = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    if (!key || !secret) {
      return reject(fail(503,
        'M-Pesa credentials are not configured yet. ' +
        'Please add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to .env. ' +
        'See the M-Pesa Setup Guide for instructions.'
      ));
    }

    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
    const isSandbox   = process.env.MPESA_ENVIRONMENT !== 'production';
    const host        = isSandbox
      ? 'sandbox.safaricom.co.ke'
      : 'api.safaricom.co.ke';

    const options = {
      hostname: host,
      path: '/oauth/v1/generate?grant_type=client_credentials',
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.access_token) {
            return reject(fail(502, 'Failed to get M-Pesa access token.'));
          }
          resolve(json.access_token);
        } catch (_e) {
          reject(fail(502, 'Invalid response from M-Pesa auth.'));
        }
      });
    });
    req.on('error', (e) => reject(fail(502, `M-Pesa auth error: ${e.message}`)));
    req.end();
  });
}

/**
 * Send an M-Pesa Express (STK Push) request.
 */
function sendSTKPush({ token, phone, amount, orderId, ref }) {
  return new Promise((resolve, reject) => {
    const shortcode  = process.env.MPESA_SHORTCODE;
    const passkey    = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL ||
      `${process.env.PUBLIC_URL || 'https://logictech.co.ke'}/api/shop/mpesa/callback`;

    if (!shortcode || !passkey) {
      return reject(fail(503, 'M-Pesa shortcode/passkey not configured.'));
    }

    const timestamp = new Date().toISOString()
      .replace(/[-T:.Z]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`)
      .toString('base64');

    const isSandbox = process.env.MPESA_ENVIRONMENT !== 'production';
    const host      = isSandbox ? 'sandbox.safaricom.co.ke' : 'api.safaricom.co.ke';

    const payload = JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: ref,
      TransactionDesc: `Logic Tech Shop Order ${ref}`
    });

    const options = {
      hostname: host,
      path: '/mpesa/stkpush/v1/processrequest',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (_e) {
          reject(fail(502, 'Invalid response from M-Pesa STK Push.'));
        }
      });
    });
    req.on('error', (e) => reject(fail(502, `M-Pesa request error: ${e.message}`)));
    req.write(payload);
    req.end();
  });
}

// ── Validation helpers ───────────────────────────────────────────────

const KENYA_COUNTIES = new Set([
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret / Uasin Gishu','Kiambu',
  'Machakos','Kajiado','Muranga','Nyeri','Meru','Embu','Kirinyaga',
  'Nyandarua','Laikipia','Samburu','Trans Nzoia','West Pokot',
  'Elgeyo-Marakwet','Nandi','Baringo','Bomet','Kericho','Narok',
  'Kisii','Nyamira','Migori','Homa Bay','Siaya','Vihiga','Kakamega',
  'Bungoma','Busia','Marsabit','Isiolo','Tharaka-Nithi','Kitui',
  'Makueni','Kilifi','Kwale','Taita-Taveta','Tana River','Lamu',
  'Garissa','Wajir','Mandera','Turkana'
]);

function validateOrderBody(body) {
  const name  = stringField(body.customer_name,  'Customer name',  120);
  const email = validEmail(body.customer_email);
  const phone = stringField(body.customer_phone, 'Phone number',   30);
  const county = stringField(body.county, 'County', 60);
  if (!KENYA_COUNTIES.has(county)) throw fail(400, 'Select a valid Kenya county.');
  const city    = stringField(body.city,    'City',    80);
  const address = stringField(body.address, 'Address', 200);

  // Items: array of { id, name, price, qty }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) throw fail(400, 'Cart is empty.');
  if (items.length > 50) throw fail(400, 'Too many items in cart.');
  for (const item of items) {
    if (typeof item.id !== 'number') throw fail(400, 'Invalid item ID.');
    if (typeof item.qty !== 'number' || item.qty < 1 || item.qty > 100) throw fail(400, 'Invalid item quantity.');
    if (typeof item.price !== 'number' || item.price < 0) throw fail(400, 'Invalid item price.');
  }

  const subtotal = validAmount(body.subtotal);
  const delivery = Number(body.delivery);
  if (![0, 300, 500].includes(delivery)) throw fail(400, 'Invalid delivery fee.');
  const total = validAmount(body.total);
  if (total !== subtotal + delivery) throw fail(400, 'Order total mismatch.');

  const paymentMethod = body.payment_method === 'card' ? 'card' : 'mpesa';

  return { name, email, phone, county, city, address, items, subtotal, delivery, total, paymentMethod };
}

// ── Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/shop/orders
 * Create a new shop order (saves to DB, returns ref).
 */
router.post('/orders',
  rateLimit('shop_order', 10, 60_000),
  async (req, res, next) => {
    try {
      const v = validateOrderBody(req.body);
      const ref = generateRef();

      db.prepare(`
        INSERT INTO shop_orders
          (ref, customer_name, customer_email, customer_phone,
           county, city, address, items_json,
           subtotal, delivery, total, payment_method)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        ref, v.name, v.email, v.phone,
        v.county, v.city, v.address, JSON.stringify(v.items),
        v.subtotal, v.delivery, v.total, v.paymentMethod
      );

      res.json({ ok: true, ref });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/shop/mpesa/stk-push
 * Body: { order_ref, phone }
 * Triggers a real Safaricom Daraja STK Push.
 */
router.post('/mpesa/stk-push',
  rateLimit('mpesa_stk', 5, 60_000),
  async (req, res, next) => {
    try {
      const ref   = stringField(req.body.order_ref, 'Order reference', 40);
      const rawPhone = req.body.phone;
      const phone = normaliseMpesaPhone(rawPhone);

      // Load order from DB
      const order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(ref);
      if (!order) throw fail(404, 'Order not found. Please restart checkout.');
      if (order.payment_status === 'paid') throw fail(409, 'Order is already paid.');
      if (order.payment_status === 'processing') {
        throw fail(409, 'An STK Push is already in progress. Check your phone.');
      }

      // Update phone on order
      db.prepare(`
        UPDATE shop_orders SET customer_phone = ?, payment_status = 'processing',
        updated_at = CURRENT_TIMESTAMP WHERE ref = ?
      `).run(phone, ref);

      // Get Daraja token and push
      const token = await getDarajaToken();
      const result = await sendSTKPush({
        token, phone,
        amount: order.total,
        orderId: order.id,
        ref
      });

      if (result.ResponseCode === '0') {
        // Success — store CheckoutRequestID for callback matching
        db.prepare(`
          UPDATE shop_orders SET mpesa_checkout_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE ref = ?
        `).run(result.CheckoutRequestID, ref);

        return res.json({
          ok: true,
          checkoutRequestId: result.CheckoutRequestID,
          message: 'STK Push sent! Enter your M-Pesa PIN on your phone.'
        });
      } else {
        // Daraja returned an error code
        db.prepare(`
          UPDATE shop_orders SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE ref = ?
        `).run(ref);
        throw fail(502, result.CustomerMessage || result.ResponseDescription || 'STK Push failed. Try again.');
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/shop/mpesa/callback
 * Safaricom Daraja posts payment result here.
 * No auth required — verified by CheckoutRequestID match.
 */
router.post('/mpesa/callback', (req, res) => {
  try {
    const body = req.body;
    const stk  = body?.Body?.stkCallback;
    if (!stk) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const checkoutId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;

    if (resultCode === 0) {
      // Payment successful
      const meta = stk.CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;
      const receipt = get('MpesaReceiptNumber') || null;

      db.prepare(`
        UPDATE shop_orders
        SET payment_status = 'paid', mpesa_receipt = ?,
            status = 'Confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE mpesa_checkout_id = ?
      `).run(receipt, checkoutId);
    } else {
      // Payment failed or cancelled
      db.prepare(`
        UPDATE shop_orders
        SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE mpesa_checkout_id = ?
      `).run(checkoutId);
    }
  } catch (err) {
    console.error('M-Pesa callback error:', err);
  }
  // Always respond 200 to Safaricom
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

/**
 * GET /api/shop/orders/:ref
 * Poll payment status (called by frontend every 3s after STK push).
 */
router.get('/orders/:ref',
  rateLimit('shop_poll', 60, 60_000),
  (req, res, next) => {
    try {
      const ref = stringField(req.params.ref, 'Order reference', 40);
      const order = db.prepare(`
        SELECT ref, status, payment_status, mpesa_receipt, created_at
        FROM shop_orders WHERE ref = ?
      `).get(ref);
      if (!order) throw fail(404, 'Order not found.');
      res.json({ ok: true, order });
    } catch (err) {
      next(err);
    }
  }
);

// ── Admin routes ─────────────────────────────────────────────────────

/**
 * GET /api/shop/admin/orders
 * Admin: list all orders, newest first.
 */
router.get('/admin/orders', requireAdmin, (req, res, next) => {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const orders = db.prepare(`
      SELECT id, ref, customer_name, customer_email, customer_phone,
             county, city, total, payment_method, payment_status,
             mpesa_receipt, status, created_at
      FROM shop_orders
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const { count } = db.prepare('SELECT COUNT(*) AS count FROM shop_orders').get();
    res.json({ ok: true, orders, total: count, page, limit });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/shop/admin/orders/:id/status
 * Admin: update order fulfilment status.
 */
const ORDER_STATUSES = new Set(['Processing','Confirmed','Shipped','Delivered','Cancelled']);

router.put('/admin/orders/:id/status', requireAdmin, (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const status = stringField(req.body.status, 'Status', 20);
    if (!ORDER_STATUSES.has(status)) throw fail(400, 'Invalid order status.');
    const info = db.prepare(`
      UPDATE shop_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);
    if (!info.changes) throw fail(404, 'Order not found.');
    res.json({ ok: true, status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

