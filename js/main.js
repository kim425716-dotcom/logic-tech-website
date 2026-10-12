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

(function () {
  const THEME_KEY = 'logictech-theme';

  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);

    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      // Ignore storage errors in restricted or private browsing contexts.
    }
  }

  function initializeTheme() {
    const savedTheme = (() => {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch (error) {
        return null;
      }
    })();

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    applyTheme(Boolean(shouldUseDark));

    const toggleButtons = document.querySelectorAll('#themeToggle');
    toggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark');
        applyTheme(isDark);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme, { once: true });
  } else {
    initializeTheme();
  }
})();
