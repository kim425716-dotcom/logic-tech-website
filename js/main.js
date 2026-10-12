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
  const THEME_TOGGLE_SELECTOR = '#themeToggle';
  const THEME_ICON_SELECTOR = '#themeIcon';

  if (window.__logicTechThemeBound) return;
  window.__logicTechThemeBound = true;

  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);

    const icon = document.querySelector(THEME_ICON_SELECTOR);
    if (icon) {
      icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      // Ignore storage errors in restricted/private browsing contexts.
    }
  }

  function initializeTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch (error) {
      // Ignore storage errors in restricted/private browsing contexts.
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    applyTheme(Boolean(shouldUseDark));

    document.querySelectorAll(THEME_TOGGLE_SELECTOR).forEach((button) => {
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
