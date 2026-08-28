/**
 * theme.js — Dark / Light theme toggle with localStorage persistence
 *
 * Loaded in <head> to prevent flash of wrong theme.
 * Sets body[data-theme] immediately from localStorage.
 * Also defines toggleTheme() for the header toggle button.
 */
(function () {
  var KEY = 'store-theme';

  // Read saved theme or default to dark
  var saved = localStorage.getItem(KEY);
  var theme = saved === 'light' ? 'light' : 'dark';

  // Apply immediately (before paint)
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;

  // Global toggle function — called by the header button
  window.toggleTheme = function () {
    var current = document.body.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;

    try { localStorage.setItem(KEY, next); } catch (e) {}
  };
})();
