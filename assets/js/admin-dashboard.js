/* ============================================================
   NEW GROWN DIAMOND — ADMIN DASHBOARD
   Guarded by requireAdmin(): authenticated + role=admin +
   account_status not blocked. Customers are sent to their own
   dashboard; anonymous visitors to login.html. Database RLS
   remains the real security layer for all admin data.
   ============================================================ */
(function () {
  'use strict';

  function fill(field, value) {
    document
      .querySelectorAll('[data-ngd-field="' + field + '"]')
      .forEach(function (el) {
        el.textContent = value;
      });
  }

  function pretty(value, fallback) {
    var v = (value == null ? '' : String(value)).trim();
    return v ? v : fallback || '—';
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening

    var profile = res.profile;
    var fullName = pretty(profile.full_name, '');

    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');
    fill('full_name', pretty(profile.full_name));
    fill('email', pretty(profile.email || res.user.email));
    fill('role', pretty(profile.role, 'admin'));
    fill('account_status', pretty(profile.account_status, 'active'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
