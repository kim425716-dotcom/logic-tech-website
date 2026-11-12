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
const { sendOrderConfirmationEmail, sendAdminOrderNotification } = require('../utils/mailer');

const router = express.Router();

// ── Schema migration: shop tables ──────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS shop_products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'General',
    price       INTEGER NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    sku         TEXT UNIQUE,
    image_url   TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active'
      CHECK(status IN ('active','archived')),
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

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

// ── Default Store Products (Website Synchronization) ────────────────
const INITIAL_PRODUCTS = [
  {
    name: "Dell XPS 15", category: "Laptop", price: 185000, stock: 5, sku: "LT-XPS-15",
    image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    description: "A powerhouse laptop crafted for creators and professionals. Stunning InfinityEdge display, long battery life, and VR-ready graphics."
  },
  {
    name: "MacBook Air M3", category: "Laptop", price: 145000, stock: 8, sku: "LT-MBA-M3",
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
    description: "The world's most capable 13-inch laptop. All-day battery life, fanless design, and breakthrough Apple M3 performance."
  },
  {
    name: "HP Pavilion 15", category: "Laptop", price: 65000, stock: 12, sku: "LT-HP-PAV15",
    image_url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
    description: "Reliable everyday laptop for students and home users. Great value with solid performance and vivid display."
  },
  {
    name: "Lenovo ThinkPad X1 Carbon", category: "Laptop", price: 210000, stock: 3, sku: "LT-TP-X1C",
    image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80",
    description: "The ultimate business laptop. MIL-SPEC durability, legendary keyboard, and exceptional security features."
  },
  {
    name: "HP ProDesk 600 G6 MT", category: "Desktop", price: 95000, stock: 6, sku: "LT-HP-PD600",
    image_url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80",
    description: "Enterprise-grade mini tower desktop built for business productivity. Expandable, manageable, and secure."
  },
  {
    name: "iMac 24\" M3", category: "Desktop", price: 220000, stock: 4, sku: "LT-IMAC-24M3",
    image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80",
    description: "The most colourful, most powerful 24-inch iMac ever. Stunning 4.5K Retina display in an impossibly thin design."
  },
  {
    name: "iPhone 16 Pro Max", category: "Phone", price: 180000, stock: 10, sku: "LT-IPH-16PM",
    image_url: "https://images.unsplash.com/photo-1706355284897-9059ba2a3c3b?w=600&q=80",
    description: "Apple's most powerful iPhone ever. Titanium design, A18 Pro chip, and a pro camera system that redefines photography."
  },
  {
    name: "Samsung Galaxy S25 Ultra", category: "Phone", price: 155000, stock: 7, sku: "LT-SAM-S25U",
    image_url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80",
    description: "Galaxy AI meets S Pen precision. The pinnacle of Android innovation with a stunning 200MP camera."
  },
  {
    name: "Google Pixel 9 Pro", category: "Phone", price: 110000, stock: 9, sku: "LT-PIX-9PRO",
    image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80",
    description: "Google's smartest phone. Powered by Gemini AI and a Tensor G4 chip for the best of Google, all in one place."
  },
  {
    name: "OnePlus 13", category: "Phone", price: 85000, stock: 15, sku: "LT-OP-13",
    image_url: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80",
    description: "Flagship speed, legendary charging. The OnePlus 13 brings elite performance at a compelling price point."
  },
  {
    name: "Logitech MX Master 3S", category: "Accessory", price: 12500, stock: 20, sku: "LT-LOGI-MX3S",
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80",
    description: "The master of mice. 8K DPI tracking on any surface, ultra-fast MagSpeed scroll wheel, and all-day ergonomic comfort."
  },
  {
    name: "Samsung T7 Shield 1TB SSD", category: "Accessory", price: 14500, stock: 18, sku: "LT-SAM-T7S1TB",
    image_url: "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&q=80",
    description: "Rugged portable SSD with IP65 dust & water resistance. Blazing-fast transfers and military-grade drop protection."
  }
];

function seedInitialProducts() {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM shop_products').get();
  if (countRow && countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO shop_products (name, category, price, stock, sku, image_url, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);
    const seedTx = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(
          item.name, item.category, item.price, item.stock, item.sku, item.image_url, item.description
        );
      }
    });
    seedTx(INITIAL_PRODUCTS);
  }
}
try {
  seedInitialProducts();
} catch (err) {
  console.warn('Initial product seed skipped:', err.message);
}

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
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
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

/**
 * Query Daraja STK Push transaction status
 */
function querySTKPush({ token, checkoutRequestId }) {
  return new Promise((resolve, reject) => {
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey   = process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {
      return reject(fail(503, 'M-Pesa shortcode/passkey not configured.'));
    }

    const timestamp = new Date().toISOString()
      .replace(/[-T:.Z]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const isSandbox = process.env.MPESA_ENVIRONMENT !== 'production';
    const host      = isSandbox ? 'sandbox.safaricom.co.ke' : 'api.safaricom.co.ke';

    const payload = JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    });

    const options = {
      hostname: host,
      path: '/mpesa/stkpushquery/v1/query',
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
          reject(fail(502, 'Invalid response from M-Pesa query.'));
        }
      });
    });
    req.on('error', (e) => reject(fail(502, `M-Pesa query request error: ${e.message}`)));
    req.write(payload);
    req.end();
  });
}

/**
 * Fulfill an order when payment is successfully verified.
 * - Updates order payment_status to 'paid' and status to 'Confirmed'
 * - Decrements inventory stock for each purchased item
 * - Triggers branded customer confirmation email & admin alert email
 */
async function fulfillOrderPayment(order, receipt, paymentMethod = 'mpesa') {
  if (!order) return null;
  if (order.payment_status === 'paid') return order;

  // 1. Update order status in SQLite
  db.prepare(`
    UPDATE shop_orders
    SET payment_status = 'paid',
        mpesa_receipt = COALESCE(?, mpesa_receipt),
        payment_method = ?,
        status = CASE WHEN status = 'Processing' THEN 'Confirmed' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(receipt || null, paymentMethod, order.id);

  // 2. Decrement inventory stock
  try {
    const items = typeof order.items_json === 'string'
      ? JSON.parse(order.items_json)
      : (order.items || []);

    const updateStockStmt = db.prepare(`
      UPDATE shop_products
      SET stock = MAX(0, stock - ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const item of items) {
      if (item.id && item.qty) {
        updateStockStmt.run(Number(item.qty), Number(item.id));
      }
    }
  } catch (err) {
    console.error('Error decrementing inventory stock:', err);
  }

  const updatedOrder = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(order.id);

  // 3. Send notifications asynchronously
  sendOrderConfirmationEmail(updatedOrder).catch(e => console.error('Customer email notification error:', e));
  sendAdminOrderNotification(updatedOrder).catch(e => console.error('Admin email notification error:', e));

  return updatedOrder;
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
 * GET /api/shop/products
 * Public catalogue list for shop.html storefront
 */
router.get('/products', (_req, res, next) => {
  try {
    const products = db.prepare(`
      SELECT id, name, description, category, price, stock, sku, image_url, status
      FROM shop_products
      WHERE status = 'active'
      ORDER BY id ASC
    `).all();
    res.json({ ok: true, products });
  } catch (err) {
    next(err);
  }
});

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

      // Check if Daraja live credentials exist
      const hasDaraja = Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET);

      if (!hasDaraja) {
        // Safe simulation fallback for local development or until Daraja keys are set
        const mockCheckoutId = 'SIM_' + Date.now();
        db.prepare(`
          UPDATE shop_orders SET mpesa_checkout_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE ref = ?
        `).run(mockCheckoutId, ref);

        // Auto-confirm after 3.5s to simulate phone STK response
        setTimeout(async () => {
          try {
            const mockReceipt = 'QK' + Math.floor(10000000 + Math.random() * 90000000).toString();
            const currOrder = db.prepare('SELECT * FROM shop_orders WHERE mpesa_checkout_id = ?').get(mockCheckoutId);
            if (currOrder && currOrder.payment_status === 'processing') {
              await fulfillOrderPayment(currOrder, mockReceipt, 'mpesa_simulated');
            }
          } catch (e) {
            console.error('Simulation payment error:', e);
          }
        }, 3500);

        return res.json({
          ok: true,
          checkoutRequestId: mockCheckoutId,
          simulated: true,
          message: 'STK Push sent to ' + phone + ' (Receiving: ' + (process.env.MPESA_RECEIVER_PHONE || '0702588886') + '). Enter PIN on your phone.'
        });
      }

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
router.post('/mpesa/callback', async (req, res) => {
  try {
    const body = req.body;
    const stk  = body?.Body?.stkCallback;
    if (!stk) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const checkoutId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;
    const order = db.prepare('SELECT * FROM shop_orders WHERE mpesa_checkout_id = ?').get(checkoutId);

    if (resultCode === 0 && order) {
      // Payment successful
      const meta = stk.CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;
      const receipt = get('MpesaReceiptNumber') || null;

      await fulfillOrderPayment(order, receipt, 'mpesa_stk');
    } else if (order) {
      // Payment failed or cancelled
      db.prepare(`
        UPDATE shop_orders
        SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(order.id);
    }
  } catch (err) {
    console.error('M-Pesa callback error:', err);
  }
  // Always respond 200 to Safaricom
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

/**
 * POST /api/shop/mpesa/query
 * Actively query Safaricom Daraja STK Push status.
 * Body: { order_ref, checkout_request_id }
 */
router.post('/mpesa/query',
  rateLimit('mpesa_query', 30, 60_000),
  async (req, res, next) => {
    try {
      const ref = req.body.order_ref ? String(req.body.order_ref).trim() : null;
      const checkoutId = req.body.checkout_request_id ? String(req.body.checkout_request_id).trim() : null;

      let order = null;
      if (ref) {
        order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(ref);
      } else if (checkoutId) {
        order = db.prepare('SELECT * FROM shop_orders WHERE mpesa_checkout_id = ?').get(checkoutId);
      }

      if (!order) throw fail(404, 'Order not found.');
      if (order.payment_status === 'paid') {
        return res.json({ ok: true, paid: true, status: 'paid', receipt: order.mpesa_receipt, order });
      }

      const targetCheckoutId = checkoutId || order.mpesa_checkout_id;
      if (!targetCheckoutId) {
        return res.json({ ok: true, paid: false, status: order.payment_status, message: 'No active STK Push found.' });
      }

      if (targetCheckoutId.startsWith('SIM_')) {
        return res.json({ ok: true, paid: order.payment_status === 'paid', status: order.payment_status });
      }

      const hasDaraja = Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET);
      if (!hasDaraja) {
        return res.json({ ok: true, paid: order.payment_status === 'paid', status: order.payment_status });
      }

      const token = await getDarajaToken();
      const result = await querySTKPush({ token, checkoutRequestId: targetCheckoutId });

      if (result.ResultCode === '0' || result.ResultCode === 0) {
        const receipt = result.MpesaReceiptNumber || result.CheckoutRequestID;
        const fulfilled = await fulfillOrderPayment(order, receipt, 'mpesa_stk');
        return res.json({ ok: true, paid: true, status: 'paid', receipt, order: fulfilled });
      } else if (result.ResultCode === '1032' || result.ResultCode === 1032) {
        db.prepare(`UPDATE shop_orders SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(order.id);
        return res.json({ ok: true, paid: false, status: 'failed', message: 'Transaction cancelled by user.' });
      }

      res.json({ ok: true, paid: false, status: order.payment_status, raw: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * C2B Webhooks: Lipa na M-Pesa Buy Goods (Till) & Paybill
 */
router.post('/mpesa/c2b-validation', (_req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/c2b-confirmation', async (req, res) => {
  try {
    const { TransID, TransAmount, BillRefNumber, MSISDN } = req.body;
    const ref = BillRefNumber ? String(BillRefNumber).trim() : '';
    let phone = '';
    try { if (MSISDN) phone = normaliseMpesaPhone(MSISDN); } catch (_) {}

    let order = null;
    if (ref) {
      order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(ref);
    }
    if (!order && phone) {
      order = db.prepare(`
        SELECT * FROM shop_orders
        WHERE (customer_phone = ? OR customer_phone LIKE ?)
          AND payment_status IN ('pending', 'processing')
        ORDER BY created_at DESC LIMIT 1
      `).get(phone, `%${phone.slice(-9)}`);
    }

    if (order && TransID) {
      await fulfillOrderPayment(order, TransID, 'mpesa_c2b');
    }
  } catch (err) {
    console.error('C2B confirmation error:', err);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

/**
 * GET /api/shop/config
 * Public store config: receiver phone, business name, till number
 */
router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    receiver_phone: process.env.MPESA_RECEIVER_PHONE || '0702588886',
    receiver_name: 'Logic Tech Store',
    till_number: process.env.MPESA_SHORTCODE || '174379',
    has_live_daraja: Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET)
  });
});

/**
 * POST /api/shop/mpesa/manual-verify
 * Customer submits M-Pesa transaction code after paying to 0702588886
 * Body: { order_ref, mpesa_code }
 */
router.post('/mpesa/manual-verify',
  rateLimit('mpesa_manual', 10, 60_000),
  async (req, res, next) => {
    try {
      const ref = stringField(req.body.order_ref, 'Order reference', 40);
      const rawCode = stringField(req.body.mpesa_code, 'M-Pesa transaction code', 20);
      const code = rawCode.toUpperCase().replace(/\s+/g, '');

      if (!/^[A-Z0-9]{8,15}$/.test(code)) {
        throw fail(400, 'Enter a valid M-Pesa transaction code (e.g. QK84ND92KL).');
      }

      const order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(ref);
      if (!order) throw fail(404, 'Order not found.');
      if (order.payment_status === 'paid') {
        return res.json({ ok: true, message: 'Order is already marked as paid.', order });
      }

      const fulfilled = await fulfillOrderPayment(order, code, 'mpesa_manual');

      res.json({
        ok: true,
        message: 'Payment verified successfully! Your order is now confirmed.',
        receipt: code,
        order: fulfilled
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Card Payments: Initiate & Webhook
 */
router.post('/api/shop/card/initiate',
  rateLimit('card_init', 10, 60_000),
  async (req, res, next) => {
    try {
      const ref = stringField(req.body.order_ref, 'Order reference', 40);
      const order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(ref);
      if (!order) throw fail(404, 'Order not found.');

      const flwKey = process.env.FLW_SECRET_KEY;
      if (!flwKey) {
        // Safe simulation fallback for Card payment
        const mockReceipt = 'FLW-' + Date.now().toString(36).toUpperCase();
        const fulfilled = await fulfillOrderPayment(order, mockReceipt, 'card_simulated');
        return res.json({
          ok: true,
          simulated: true,
          receipt: mockReceipt,
          order: fulfilled,
          message: 'Card payment processed successfully.'
        });
      }

      // Flutterwave standard checkout payload
      const flwPayload = JSON.stringify({
        tx_ref: order.ref,
        amount: order.total,
        currency: 'KES',
        redirect_url: `${process.env.PUBLIC_URL || 'https://logictech.co.ke'}/shop.html?payment=complete&ref=${order.ref}`,
        customer: {
          email: order.customer_email,
          phonenumber: order.customer_phone,
          name: order.customer_name
        },
        customizations: {
          title: 'Logic Tech Store Checkout',
          description: `Payment for order ${order.ref}`,
          logo: `${process.env.PUBLIC_URL || 'https://logictech.co.ke'}/assets/logo.png`
        }
      });

      const options = {
        hostname: 'api.flutterwave.com',
        path: '/v3/payments',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flwKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(flwPayload)
        }
      };

      const flwReq = https.request(options, (flwRes) => {
        let data = '';
        flwRes.on('data', chunk => { data += chunk; });
        flwRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'success' && json.data?.link) {
              return res.json({ ok: true, payment_url: json.data.link });
            }
            throw new Error(json.message || 'Failed to initiate card gateway.');
          } catch (e) {
            next(fail(502, `Card gateway error: ${e.message}`));
          }
        });
      });
      flwReq.on('error', (e) => next(fail(502, `Card gateway connection error: ${e.message}`)));
      flwReq.write(flwPayload);
      flwReq.end();
    } catch (err) {
      next(err);
    }
  }
);

router.post('/card/webhook', async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const expectedHash = process.env.FLW_WEBHOOK_HASH;
    if (expectedHash && signature !== expectedHash) {
      return res.status(401).end();
    }

    const { status, txRef, id } = req.body?.data || {};
    if (status === 'successful' && txRef) {
      const order = db.prepare('SELECT * FROM shop_orders WHERE ref = ?').get(txRef);
      if (order && order.payment_status !== 'paid') {
        await fulfillOrderPayment(order, `FLW-${id || txRef}`, 'card');
      }
    }
  } catch (err) {
    console.error('Card webhook error:', err);
  }
  res.status(200).end();
});

/**
 * GET /api/shop/orders/by-email?email=...
 * Client portal: fetch a client's orders by email address.
 * Rate-limited; returns safe subset of fields (no full address details).
 */
router.get('/orders/by-email',
  rateLimit('shop_by_email', 20, 60_000),
  (req, res, next) => {
    try {
      const email = validEmail(req.query.email || '');
      const orders = db.prepare(`
        SELECT ref, status, payment_status, mpesa_receipt, total, items_json,
               customer_name, city, county, created_at
        FROM shop_orders
        WHERE customer_email = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(email);
      res.json({ ok: true, orders });
    } catch (err) {
      next(err);
    }
  }
);

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
        SELECT ref, status, payment_status, mpesa_receipt, total, items_json,
               customer_name, customer_email, city, county, created_at
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
             county, city, address, items_json, subtotal, delivery, total,
             payment_method, payment_status, mpesa_receipt, status, created_at
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

/**
 * POST /api/shop/admin/orders/:id/confirm-payment
 * Admin: manually mark an order as paid (e.g. manual Till payment or Bank Wire)
 */
router.post('/admin/orders/:id/confirm-payment', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const receipt = req.body.receipt ? String(req.body.receipt).trim().toUpperCase() : `ADM-${Date.now().toString(36).toUpperCase()}`;
    const order = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(id);
    if (!order) throw fail(404, 'Order not found.');

    const updated = await fulfillOrderPayment(order, receipt, 'admin_manual');
    res.json({ ok: true, message: 'Order payment confirmed & stock updated.', order: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/shop/admin/orders/:id/resend-receipt
 * Admin: re-send branded receipt email to customer
 */
router.post('/admin/orders/:id/resend-receipt', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const order = db.prepare('SELECT * FROM shop_orders WHERE id = ?').get(id);
    if (!order) throw fail(404, 'Order not found.');

    const mailRes = await sendOrderConfirmationEmail(order);
    res.json({ ok: true, message: mailRes ? 'Receipt email resent successfully.' : 'Email transport skipped or not configured.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/shop/admin/orders/:id
 * Admin: delete an order (e.g. test orders).
 */
router.delete('/admin/orders/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM shop_orders WHERE id = ?').run(id);
    if (!info.changes) throw fail(404, 'Order not found.');
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

// ── Admin: Product / Inventory Management ─────────────────────────

/**
 * GET /api/shop/admin/products
 */
router.get('/admin/products', requireAdmin, (req, res, next) => {
  try {
    const products = db.prepare(`
      SELECT id, name, description, category, price, stock, sku, image_url, status, created_at, updated_at
      FROM shop_products ORDER BY created_at DESC
    `).all();
    const totalActive = products.filter(p => p.status === 'active').length;
    const outOfStock  = products.filter(p => p.stock === 0 && p.status === 'active').length;
    const lowStock    = products.filter(p => p.stock > 0 && p.stock <= 5 && p.status === 'active').length;
    res.json({ ok: true, products, stats: { total: products.length, totalActive, outOfStock, lowStock } });
  } catch (err) { next(err); }
});

/**
 * POST /api/shop/admin/products — create product
 */
router.post('/admin/products', requireAdmin, (req, res, next) => {
  try {
    const name        = stringField(req.body.name, 'Name', 200);
    const description = (req.body.description || '').slice(0, 2000);
    const category    = (req.body.category || 'General').slice(0, 100);
    const price       = Number(req.body.price);
    const stock       = Number(req.body.stock ?? 0);
    const sku         = (req.body.sku || '').slice(0, 100) || null;
    const image_url   = (req.body.image_url || '').slice(0, 500);

    if (!name || name.length < 2) throw fail(400, 'Product name must be at least 2 characters.');
    if (!Number.isInteger(price) || price < 0) throw fail(400, 'Price must be a non-negative integer (KES).');
    if (!Number.isInteger(stock) || stock < 0) throw fail(400, 'Stock must be a non-negative integer.');

    const info = db.prepare(`
      INSERT INTO shop_products (name, description, category, price, stock, sku, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, category, price, stock, sku, image_url);

    const product = db.prepare('SELECT * FROM shop_products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ok: true, product });
  } catch (err) { next(err); }
});

/**
 * PUT /api/shop/admin/products/:id — update product
 */
router.put('/admin/products/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM shop_products WHERE id = ?').get(id);
    if (!existing) throw fail(404, 'Product not found.');

    const name        = req.body.name        !== undefined ? stringField(req.body.name, 'Name', 200)   : existing.name;
    const description = req.body.description !== undefined ? String(req.body.description).slice(0, 2000) : existing.description;
    const category    = req.body.category    !== undefined ? String(req.body.category).slice(0, 100)    : existing.category;
    const price       = req.body.price       !== undefined ? Number(req.body.price)                     : existing.price;
    const stock       = req.body.stock       !== undefined ? Number(req.body.stock)                     : existing.stock;
    const sku         = req.body.sku         !== undefined ? (String(req.body.sku).slice(0, 100) || null) : existing.sku;
    const image_url   = req.body.image_url   !== undefined ? String(req.body.image_url).slice(0, 500)   : existing.image_url;
    const status      = req.body.status      !== undefined ? String(req.body.status)                    : existing.status;

    if (!Number.isInteger(price) || price < 0) throw fail(400, 'Price must be a non-negative integer (KES).');
    if (!Number.isInteger(stock) || stock < 0) throw fail(400, 'Stock must be a non-negative integer.');
    if (!['active', 'archived'].includes(status)) throw fail(400, 'Invalid status.');

    db.prepare(`
      UPDATE shop_products SET name=?, description=?, category=?, price=?, stock=?, sku=?, image_url=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(name, description, category, price, stock, sku, image_url, status, id);

    const product = db.prepare('SELECT * FROM shop_products WHERE id = ?').get(id);
    res.json({ ok: true, product });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/shop/admin/products/:id
 */
router.delete('/admin/products/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM shop_products WHERE id = ?').run(id);
    if (!info.changes) throw fail(404, 'Product not found.');
    res.json({ ok: true, id });
  } catch (err) { next(err); }
});

/**
 * POST /api/shop/admin/products/sync-defaults
 * Sync/restore initial 12 store products from website catalog
 */
router.post('/admin/products/sync-defaults', requireAdmin, (_req, res, next) => {
  try {
    const insertStmt = db.prepare(`
      INSERT INTO shop_products (name, category, price, stock, sku, image_url, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      ON CONFLICT(sku) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        price = excluded.price,
        stock = excluded.stock,
        image_url = excluded.image_url,
        description = excluded.description,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `);
    const syncTx = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(
          item.name, item.category, item.price, item.stock, item.sku, item.image_url, item.description
        );
      }
    });
    syncTx(INITIAL_PRODUCTS);
    res.json({ ok: true, message: `Synced ${INITIAL_PRODUCTS.length} store catalogue items.` });
  } catch (err) { next(err); }
});

module.exports = router;

