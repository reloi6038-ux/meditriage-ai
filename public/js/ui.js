(function () {
  'use strict';

  // ---------- Theme ----------
  const THEME_KEY = 'mt-theme';
  const root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }
  initTheme();

  document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle
    const tt = document.getElementById('theme-toggle');
    if (tt) {
      tt.addEventListener('click', function () {
        const cur = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(cur);
      });
    }

    // Mobile nav
    const btn = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        const open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Active nav link
    const here = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-menu a[data-nav]').forEach(function (a) {
      const p = a.getAttribute('href');
      if (p === here) a.setAttribute('aria-current', 'page');
    });

    // Scroll reveal
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-visible'); });
    }

    // Animated counters
    document.querySelectorAll('[data-count-to]').forEach(function (el) {
      const target = parseFloat(el.getAttribute('data-count-to'));
      const suffix = el.getAttribute('data-count-suffix') || '';
      const dur = 900;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(target % 1 ? 1 : 0) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  });
})();