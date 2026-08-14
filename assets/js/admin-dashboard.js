/* ============================================================
   NEW GROWN DIAMOND — ADMIN DASHBOARD (STEP 23 UI)
   ------------------------------------------------------------
   Guarded by requireAdmin(): authenticated + role=admin +
   account_status not blocked. Customers are sent to their own
   dashboard; anonymous visitors to login.html. Database RLS
   remains the real security layer for all admin data.

   The dashboard is UI-only beyond the guard: KPI values are
   clearly-chipped demo figures (diamond/jewellery counts are
   computed from the demo catalogue the storefront actually
   shows; the rest are static samples), the activity feed is a
   labelled sample, and quick actions for unbuilt management
   pages are visibly Soon — nothing pretends to be live.

   FUTURE SUPABASE SEAM
   --------------------
   Replace loadAdminData() with real counts and an activity
   query; it feeds the same [data-admin-kpi] hooks.
   ============================================================ */
(function () {
  'use strict';

  /* Static samples for figures that have no demo-catalogue source. */
  var DEMO_KPIS = {
    customers: 12,
    pending_quotes: 3,
    pending_holds: 1,
    enquiries: 5
  };

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

  function setKpi(key, value) {
    var card = document.querySelector('[data-admin-kpi="' + key + '"]');
    if (!card) return;
    var el = card.querySelector('[data-admin-kpi-value]');
    if (el) el.textContent = String(value);
  }

  /**
   * Future-backend seam. Today: demo-catalogue sizes for the two
   * inventory KPIs plus static samples for the rest. The Supabase
   * phase replaces this with real per-table counts and a recent
   * activity select feeding [data-admin-feed].
   */
  function loadAdminData() {
    setKpi('diamonds', (window.NGD_DEMO_DIAMONDS || []).length);
    setKpi('jewellery', (window.NGD_DEMO_JEWELLERY || []).length);
    Object.keys(DEMO_KPIS).forEach(function (key) {
      setKpi(key, DEMO_KPIS[key]);
    });
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

    loadAdminData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
