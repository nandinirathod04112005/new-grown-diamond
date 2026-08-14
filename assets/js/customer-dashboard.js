/* ============================================================
   NEW GROWN DIAMOND — CUSTOMER DASHBOARD (STEP 20 UI)
   ------------------------------------------------------------
   Guarded by requireCustomer(): authenticated + role=customer +
   account_status not blocked. Admins are sent to the admin
   console; anonymous visitors to login.html.

   The dashboard is UI-only beyond the profile: no favourites,
   quotes, holds, inspections or enquiries backend exists yet,
   and nothing here pretends otherwise.
   - "Live" shows honest empty states and “—” metrics.
   - "Demo data" swaps in rows/values that are chipped DEMO.
   - Loading / Empty / Error preview the state designs.
   The future Supabase phase replaces loadDashboardData() below
   and feeds the same [data-dash-*] hooks — the markup is final.
   ============================================================ */
(function () {
  'use strict';

  var DEMO_METRICS = {
    saved_diamonds: 4,
    saved_jewellery: 2,
    quotes: 3,
    holds: 1,
    inspections: 2,
    enquiries: 3
  };

  var PANEL_STATE_FOR = {
    live: 'empty',   /* honest: there is no data source yet */
    demo: 'data',
    loading: 'loading',
    empty: 'empty',
    error: 'error'
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

  /**
   * Future-backend seam. The Supabase phase replaces this with real
   * queries (favourites, quotes, holds, inspections, enquiries for
   * the signed-in customer) and calls the same renderers below.
   */
  function loadDashboardData() {
    return null; /* no backend yet — the UI stays in its honest state */
  }

  /* ---------------- UI state machine (demo preview) ---------------- */

  function setPanelState(panel, state) {
    panel.querySelectorAll('[data-dash-show]').forEach(function (block) {
      block.hidden = block.getAttribute('data-dash-show') !== state;
    });
    var chip = panel.querySelector('[data-dash-panel-chip]');
    if (chip) chip.classList.toggle('d-none', state !== 'data');
  }

  function setMetrics(mode) {
    document.querySelectorAll('[data-dash-metric]').forEach(function (card) {
      var key = card.getAttribute('data-dash-metric');
      var valueEl = card.querySelector('[data-dash-value]');
      var chip = card.querySelector('[data-dash-demo-chip]');
      var demo = mode === 'demo' && key in DEMO_METRICS;
      if (valueEl) valueEl.textContent = demo ? String(DEMO_METRICS[key]) : '—';
      if (chip) chip.classList.toggle('d-none', !demo);
    });
    var note = document.querySelector('[data-dash-metric-note]');
    if (note) {
      note.textContent = mode === 'demo'
        ? 'Demo values for layout preview only — none of these numbers are real.'
        : 'Counts connect to your account in the Supabase phase — nothing here is live data yet.';
    }
  }

  function setUiState(state) {
    var panelState = PANEL_STATE_FOR[state] || 'empty';
    document.querySelectorAll('[data-dash-preview]').forEach(function (panel) {
      setPanelState(panel, panelState);
    });
    setMetrics(state);
    document.querySelectorAll('#dash-state-switch [data-dash-state]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-dash-state') === state);
    });
  }

  function initStateSwitch() {
    var wrap = document.getElementById('dash-state-switch');
    if (!wrap) return;
    wrap.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-dash-state]');
      if (btn) setUiState(btn.getAttribute('data-dash-state'));
    });
    document.querySelectorAll('[data-dash-retry]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setUiState('live');
      });
    });
  }

  /* ---------------- sidebar behaviour ---------------- */

  function initSidebarNav() {
    var links = document.querySelectorAll('.ngd-dash-nav a[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        links.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');
        /* below the lg breakpoint the sidebar is an offcanvas —
           close it so the anchored section is visible */
        if (window.innerWidth < 992 && window.bootstrap) {
          var sidebar = document.getElementById('dashSidebar');
          var oc = window.bootstrap.Offcanvas.getInstance(sidebar);
          if (oc) oc.hide();
        }
      });
    });
  }

  /* ---------------- boot ---------------- */

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

    initStateSwitch();
    initSidebarNav();
    setUiState('live');
    loadDashboardData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
