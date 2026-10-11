/* =============================================
   LOGIC TECH — JavaScript
   ============================================= */

/* ---- API Configuration ---- */
// apiFetch() is defined globally in js/api.js.
// Keep this file free from duplicated fetch logic.

/**
 * Wrapper around fetch() that always sends credentials (cookies)
 * and prepends the correct API base URL.
 * @param {string} path  API path, e.g. '/api/auth/login'
 * @param {Object} opts  fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>}
 */
// Intentionally left empty: use window.apiFetch() from js/api.js
