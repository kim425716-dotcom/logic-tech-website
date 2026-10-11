/**
 * API Configuration & Fetch Wrapper
 * Shared across all JavaScript files
 *
 * Usage: apiFetch('/api/endpoint', { method: 'POST', body: JSON.stringify(...) })
 */
(function () {
  'use strict';

  const isLocalDev = window.location.hostname === 'localhost' || window.location.port === '5500';
  const API_BASE = isLocalDev ? 'http://localhost:8080' : '';

  /**
   * Wrapper around fetch() that always sends credentials (cookies)
   * and prepends the correct API base URL.
   * @param {string} path API path, e.g. '/api/auth/login'
   * @param {Object} opts fetch options (method, headers, body, etc.)
   * @returns {Promise<Response>}
   */
  function apiFetch(path, opts = {}) {
    return fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...opts
    });
  }

  window.API_BASE = API_BASE;
  window.apiFetch = apiFetch;
})();
