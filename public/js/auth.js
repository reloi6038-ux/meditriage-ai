(function (window) {
  'use strict';

  var TOKEN_KEY = 'mt-token';
  var USER_KEY  = 'mt-user';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function setSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user || null));
    } catch (_) {}
  }
  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (_) {}
  }
  function isLoggedIn() { return !!getToken(); }
  function isAdmin() {
    var u = getUser();
    return !!(u && u.role === 'admin');
  }

  // Redirect to /login.html if not signed in. Optional callback for post-login return.
  function requireAuth(redirectTo) {
    if (!isLoggedIn()) {
      var back = redirectTo || (location.pathname + location.search);
      location.href = '/login.html?next=' + encodeURIComponent(back);
      return false;
    }
    return true;
  }
  function requireAdmin() {
    if (!isLoggedIn()) {
      var back = location.pathname + location.search;
      location.href = '/login.html?next=' + encodeURIComponent(back);
      return false;
    }
    if (!isAdmin()) {
      location.href = '/?error=not_admin';
      return false;
    }
    return true;
  }

  function signOut(opts) {
    opts = opts || {};
    clearSession();
    if (opts.redirect !== false) location.href = opts.redirectTo || '/';
  }

  // Update the nav in the current page based on auth state.
  function updateNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    // Create or find the auth container in nav-actions
    var actions = nav.querySelector('.nav-actions');
    if (!actions) return;
    var existing = actions.querySelector('.nav-auth');
    if (existing) existing.remove();

    var box = document.createElement('div');
    box.className = 'nav-auth';

    var user = getUser();
    if (user && getToken()) {
      var display = user.displayName || user.email || 'Account';
      box.innerHTML =
        '<a class="nav-auth-chip" href="/history.html" title="' + escapeAttr(user.email) + '">' +
          '<span class="nav-auth-avatar">' + escapeHtml(firstLetter(display)) + '</span>' +
          '<span class="nav-auth-name">' + escapeHtml(firstWord(display)) + '</span>' +
        '</a>' +
        (user.role === 'admin' ? '<a class="nav-auth-link" href="/admin.html">Admin</a>' : '') +
        '<button class="nav-auth-btn" type="button" data-signout>Sign out</button>';
    } else {
      box.innerHTML =
        '<a class="nav-auth-link" href="/login.html">Sign in</a>' +
        '<a class="nav-auth-cta" href="/register.html">Sign up</a>';
    }

    // Insert before the theme toggle if present, else at end
    var themeBtn = actions.querySelector('.theme-toggle');
    if (themeBtn) actions.insertBefore(box, themeBtn);
    else actions.appendChild(box);

    // Wire sign out
    var btn = box.querySelector('[data-signout]');
    if (btn) btn.addEventListener('click', function () { signOut(); });
  }

  function firstLetter(s) {
    return String(s || '?').trim().charAt(0).toUpperCase();
  }
  function firstWord(s) {
    return String(s || '').trim().split(/\s+/)[0].slice(0, 20);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // Auto-run nav update when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNav);
  } else {
    updateNav();
  }

  window.Auth = {
    getToken: getToken,
    getUser: getUser,
    setSession: setSession,
    clearSession: clearSession,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    signOut: signOut,
    updateNav: updateNav
  };
})(window);