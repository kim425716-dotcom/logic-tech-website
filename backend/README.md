# Logic Tech Backend Architecture & Documentation

A modular, lightweight, production-ready Express.js backend for the Logic Tech platform with native SQLite database, session authentication, role-based access control, and complete API endpoints.

---

## 🏗️ Architecture Overview

```
backend/
├── config/
│   └── database.js          # SQLite connection, schema migrations, and prepared queries
├── middleware/
│   ├── auth.js              # Session cookie extraction, requireUser, requireAdmin guards
│   ├── errorHandler.js      # Centralized JSON error response handler
│   └── rateLimit.js         # Sliding-window IP rate limiter
├── routes/
│   ├── admin.js             # Admin management (inquiries review, FAQ CRUD)
│   ├── auth.js              # Registration, login, logout, password resets, session check
│   ├── dashboard.js         # Client dashboard stats and active project tracking
│   ├── faqs.js              # Public FAQ listing endpoint
│   ├── inquiries.js         # Public contact form submission
│   └── projects.js          # Client project request submission
├── storage/
│   └── logictech.sqlite     # SQLite database file (auto-created on startup)
├── utils/
│   ├── crypto.js            # Scrypt password hashing, timing-safe compare, tokens, cookies
│   ├── email.js             # Transactional email notification helper (optional SMTP)
│   └── validation.js        # Input sanitization, email validation, safe strings
├── .env                     # Local environment configuration
├── .env.example             # Template environment file
├── package.json             # Dependencies and scripts
└── server.js                # Express app entry point
```

---

## 🚀 Getting Started

### 1. Installation
```bash
cd backend
npm install
```

### 2. Configuration (`.env`)
```env
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5500

# Seed Admin User (auto-seeded on first run if not exists)
ADMIN_NAME=Logic Tech Admin
ADMIN_EMAIL=admin@logictech.io
ADMIN_PASSWORD=changeme1234567890

# Optional SMTP for password reset emails:
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=your_user
# SMTP_PASS=your_pass
# SMTP_FROM=Logic Tech <noreply@logictech.io>
```

### 3. Start the Server
```bash
# Run backend server
npm start

# Or with automatic reload during development:
npm run dev
```

The server will be available at **`http://localhost:8080`**.

---

## 📡 API Endpoints

### 🩺 Health & Public
- `GET /api/health` — Service health check
- `GET /api/faqs` — Retrieve all published FAQs
- `POST /api/inquiries` — Submit contact form inquiry (public or authenticated)

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Create client account (`name`, `email`, `password`, `company`, `phone`)
- `POST /api/auth/login` — Sign in and set `logictech_session` HttpOnly cookie
- `POST /api/auth/logout` — Invalidate session and clear cookie
- `GET  /api/auth/me` — Get current logged-in user profile
- `POST /api/auth/forgot-password` — Request password reset link/token
- `POST /api/auth/reset-password` — Reset password using token

### 📊 Client Dashboard & Projects
- `GET  /api/dashboard` — Get logged-in user's projects and summary statistics (`requireUser`)
- `POST /api/project-requests` — Submit a new project request (`requireUser`)

### 🛡️ Admin (`/api/admin` — requires `role = 'admin'`)
- `GET    /api/admin/inquiries` — List all contact form inquiries
- `POST   /api/admin/faqs` — Create a new FAQ item
- `PUT    /api/admin/faqs/:id` — Update an existing FAQ item
- `DELETE /api/admin/faqs/:id` — Delete an FAQ item

---

## 🔒 Security Highlights
- **Password Security**: Key derivation using Node.js built-in `scrypt` with random salt and timing-safe equality checks.
- **Session Auth**: Secure, `HttpOnly`, `SameSite=Lax` cookies using SHA-256 token hashing.
- **CORS Support**: Configured for local dev servers (e.g. VS Code Live Server on port 5500) and production same-origin serving.
- **Rate Limiting**: Built-in sliding-window IP rate limiting on sensitive routes (auth, login, forgot-password, contact forms).
