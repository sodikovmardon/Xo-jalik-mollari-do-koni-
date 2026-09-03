/**
 * theme.js — Dark / Light theme toggle with localStorage persistence
 *
 * CRITICAL: This script runs in <head> where document.body is NULL.
 * We must NOT touch document.body here — only document.documentElement.
 * The body attribute is set later via DOMContentLoaded.
 */
(function () {
  var KEY = 'store-theme';

  // Read saved theme or default to dark
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var theme = saved === 'light' ? 'light' : 'dark';

  // Set on <html> ONLY — this is safe in <head>
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;

  // When DOM is ready, set body attribute too
  function applyToBody() {
    document.body.setAttribute('data-theme', theme);
  }
  if (document.body) {
    applyToBody();
  } else {
    document.addEventListener('DOMContentLoaded', applyToBody);
  }

  // Global toggle function
  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    theme = next;

    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    if (document.body) {
      document.body.setAttribute('data-theme', next);
    }

    try { localStorage.setItem(KEY, next); } catch (e) {}
  };
})();
