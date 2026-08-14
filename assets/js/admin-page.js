/* ============================================================
   NEW GROWN DIAMOND — GENERIC ADMIN PAGE GUARD
   ------------------------------------------------------------
   Shared by simple admin pages (e.g. the Add/Edit Diamond
   placeholders): runs requireAdmin() — which reveals the
   fail-closed hidden body on success — and fills the topbar
   first-name badge. Page-specific behaviour stays in each
   page's own controller when it gains one.
   ============================================================ */
(function () {
  'use strict';

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening
    var fullName = (res.profile.full_name || '').trim();
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) {
      el.textContent = fullName ? fullName.split(/\s+/)[0] : 'there';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
