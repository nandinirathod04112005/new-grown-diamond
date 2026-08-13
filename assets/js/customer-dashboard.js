/* ============================================================
   NEW GROWN DIAMOND — CUSTOMER DASHBOARD
   Guarded by requireCustomer(): authenticated + role=customer +
   account_status not blocked. Admins are sent to the admin
   console; anonymous visitors to login.html.
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
    var res = await window.NGDAuth.requireCustomer();
    if (!res) return; // a redirect is already happening

    var profile = res.profile;
    var fullName = pretty(profile.full_name, '');

    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');
    fill('full_name', pretty(profile.full_name));
    fill('email', pretty(profile.email || res.user.email));
    fill('company_name', pretty(profile.company_name));
    fill('phone', pretty(profile.phone));
    fill('role', pretty(profile.role, 'customer'));
    fill('account_status', pretty(profile.account_status, 'active'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
