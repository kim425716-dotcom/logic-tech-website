# Logic Tech Website

Official modern and responsive static website for **Logic Tech** — Delivering tailored IT solutions, cloud infrastructure, cybersecurity, custom software engineering, and digital transformation.

## 🚀 Features

- **Modern Glassmorphic UI**: High-impact visuals, responsive layouts, smooth micro-interactions, and dark mode palette.
- **Full Page Suite**:
  - `index.html`: Home page with service highlights, stats, testimonials, and interactive contact modal.
  - `about.html`: Company vision, leadership, and core values.
  - `services.html`: In-depth breakdown of IT solutions & service packages.
  - `how-it-works.html`: 4-step client engagement & project lifecycle.
  - `case-studies.html`: Client success stories and metrics.
  - `faq.html`: Frequently asked questions with interactive accordion.
  - `contact.html`: Contact forms, office location, and direct inquiries.
  - `login.html`, `register.html`, `forgot-password.html`: Client portal authentication screens.
  - `dashboard-client.html`: Client dashboard with project progress, ticketing, and invoices.
- **Vanilla Frontend**: HTML5, CSS, and JavaScript, served by a modular Express/SQLite backend.

## Backend

The site includes a modular Express API backed by SQLite in [`backend/`](./backend). It stores accounts, sessions, project requests, contact inquiries, password reset tokens, and FAQ content.

Requirements: Node.js 22.5 or newer and npm.

```bash
cd backend
npm install
npm start
```

For local development, run the backend at `http://localhost:8080` and serve the site at `http://localhost:5500` (for example, with VS Code Live Server). The backend's default CORS origin is `http://localhost:5500`. Do not open the HTML files directly: sign-in, contact, dashboard, and FAQ features require the API.

### Configuration

Configure `backend/.env` before starting the server. The variable names are documented in [`backend/.env.example`](./backend/.env.example):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `8080`) |
| `APP_URL` | Public site URL used to build password-reset links |
| `ADMIN_EMAIL` | Creates or updates the administrator account at startup |
| `ADMIN_PASSWORD` | Administrator password; must be at least 16 characters |
| `ADMIN_NAME` | Optional administrator display name |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP server settings for password-reset mail |
| `SMTP_FROM` | Optional sender address (defaults to `SMTP_USER`) |

For production, serve the site from the backend with `NODE_ENV=production`, use HTTPS so the session cookie gets the `Secure` attribute, configure a strong administrator password, and provide SMTP settings for password reset. No demo login credentials are enabled.

### API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `POST /api/inquiries`
- `GET /api/dashboard`, `POST /api/project-requests`
- `GET /api/faqs`
- Admin-only: `GET /api/admin/inquiries`, `POST /api/admin/faqs`, `PUT/DELETE /api/admin/faqs/:id`

The API uses HttpOnly, SameSite session cookies. Passwords are stored as salted scrypt hashes. FAQ content is seeded from `data/faqs.json` the first time the database is created.

## Static-only preview

The pages can still be previewed with a static server, but backend-dependent functions will not work in that mode.
