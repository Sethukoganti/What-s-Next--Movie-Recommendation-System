/* Theme control — Netflix-style dark/light toggle, persisted in localStorage & user profile. */
(function () {
  'use strict';

  var ROOT = document.documentElement;
  var STORAGE_KEY = 'wn:theme';

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function resolved() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* noop */ }
    var server = ROOT.getAttribute('data-user-theme') || 'auto';
    var choice = saved || server || 'auto';
    if (choice === 'auto') {
      choice = getSystemPreference();
    }
    return choice === 'light' ? 'light' : 'dark';
  }

  function apply(theme) {
    ROOT.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'light' ? 'false' : 'true');
      btn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    }
  }

  function persist(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* noop */ }
    var token = csrfToken();
    if (!token) return;
    fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
      body: JSON.stringify({ theme: theme }),
      credentials: 'same-origin',
    }).catch(function () { /* anonymous users may be unauthenticated */ });
  }

  function toggleTheme() {
    var current = resolved();
    var next = current === 'light' ? 'dark' : 'light';
    apply(next);
    persist(next);
    var evt = new CustomEvent('wn:themechange', { detail: { theme: next } });
    document.dispatchEvent(evt);
  }

  function init() {
    apply(resolved());
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleTheme();
      });
      btn.setAttribute('aria-pressed', resolved() === 'light' ? 'false' : 'true');
    }

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: light)');
      var handler = function () {
        var saved = null;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* noop */ }
        var server = ROOT.getAttribute('data-user-theme') || 'auto';
        if ((!saved || saved === 'auto') && server === 'auto') {
          apply(getSystemPreference());
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WN = window.WN || {};
  window.WN.theme = { resolved: resolved, apply: apply, toggle: toggleTheme };
})();