/* ============================================================
   NEW GROWN DIAMOND — ADMIN CUSTOMERS (STEP 28 UI)
   ------------------------------------------------------------
   Guarded by requireAdmin(). DEMO ONLY beyond the guard: the
   rows are invented sample accounts (customers-data.js) and
   the details panel's recent quotes / holds / inspections are
   generated deterministically per customer — the enquiries
   list joins the demo enquiries dataset. Activate/Deactivate
   edits ONLY this in-memory preview with an honest toast and
   everything returns on reload. Nothing is saved to any server
   and no success is faked. View Quotes opens the profile at
   its quotes list (the dedicated Quotes console is a later
   phase); View Enquiries deep-links into the real Enquiries
   page filtered to the account.

   FUTURE SUPABASE SEAM
   --------------------
   loadAdminCustomers() becomes a select over the profiles
   table (plus per-account request/enquiry queries for the
   details panel) and toggleActive() an account_status update.
   Rendering, filters, sort and pagination need no changes.
   ============================================================ */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var STATUSES = ['Active', 'Pending', 'Inactive'];

  var state = {
    rows: [],
    query: '',
    filters: { status: 'all', country: 'all' },
    sort: 'joined-desc',
    page: 1,
    ui: 'demo',
    detailId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** Future-backend seam: demo accounts from customers-data.js. */
  function loadAdminCustomers() {
    return (window.NGD_DEMO_CUSTOMERS || []).map(function (c) {
      return Object.assign({}, c);
    });
  }

  /* ---------------- honest demo mutations ---------------- */

  function toast(message) {
    var box = $('adm-toast');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-info';
    div.setAttribute('role', 'status');
    div.textContent = message;
    box.appendChild(div);
  }

  function toggleActive(row) {
    row.status = row.status === 'Active' ? 'Inactive' : 'Active';
    toast(row.id + ' ' + (row.status === 'Active' ? 'activated' : 'deactivated') +
      ' in this demo preview — nothing was saved to any server.');
    apply();
    if (state.detailId === row.id) renderDetail(row, null);
  }

  /* ---------------- filtering + sorting ---------------- */

  function matches(row) {
    var f = state.filters;
    var q = state.query.trim().toLowerCase();
    if (q && (row.id + ' ' + row.name + ' ' + (row.company || '') + ' ' + row.email)
      .toLowerCase().indexOf(q) === -1) return false;
    if (f.status !== 'all' && row.status !== f.status) return false;
    if (f.country !== 'all' && row.country !== f.country) return false;
    return true;
  }

  var SORTS = {
    'joined-desc': function (a, b) { return b.joined.localeCompare(a.joined) || a.id.localeCompare(b.id); },
    'activity-desc': function (a, b) { return b.lastActive.localeCompare(a.lastActive) || a.id.localeCompare(b.id); },
    'name': function (a, b) { return a.name.localeCompare(b.name); },
    'company': function (a, b) { return (a.company || '—').localeCompare(b.company || '—'); }
  };

  function visibleRows() {
    return state.rows.filter(matches).sort(SORTS[state.sort] || SORTS['joined-desc']);
  }

  function activeFilterCount() {
    var f = state.filters;
    var n = 0;
    if (f.status !== 'all') n++;
    if (f.country !== 'all') n++;
    return n;
  }

  /* ---------------- rendering ---------------- */

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function statusChip(status) {
    var cls = status === 'Active' ? 'is-good' : status === 'Pending' ? 'is-gold' : 'is-dim';
    return '<span class="ngd-status-chip ' + cls + '">' + status + '</span>';
  }

  var ICONS = {
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1 0 11.4 0"/></svg>',
    quotes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h9l3.5 3.5v13.5H6Z"/><path d="M15 3.5V7h3.5M9 11h6M9 14.5h6M9 18h3.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
  };

  function actionsHtml(row) {
    var active = row.status === 'Active';
    return (
      '<div class="ngd-adm-actions">' +
      '<button type="button" class="ngd-icon-btn" title="View profile"' +
      ' aria-label="View ' + row.name + '" data-adm-act="view">' + ICONS.view + '</button>' +
      '<button type="button" class="ngd-icon-btn' + (active ? '' : ' is-off') + '"' +
      ' title="' + (active ? 'Deactivate' : 'Activate') + ' (demo only)"' +
      ' aria-label="' + (active ? 'Deactivate ' : 'Activate ') + row.name + '"' +
      ' aria-pressed="' + active + '" data-adm-act="active">' + ICONS.power + '</button>' +
      '<button type="button" class="ngd-icon-btn" title="Quote history (opens the profile)"' +
      ' aria-label="View quotes from ' + row.name + '" data-adm-act="quotes">' + ICONS.quotes + '</button>' +
      '<a class="ngd-icon-btn" href="enquiries.html?customer=' + encodeURIComponent(row.id) + '"' +
      ' title="View enquiries" aria-label="View enquiries from ' + row.name + '"' +
      ' data-adm-act="enquiries">' + ICONS.mail + '</a>' +
      '</div>'
    );
  }

  function tableRows(rows) {
    return rows.map(function (row) {
      return (
        '<tr data-adm-row="' + row.id + '"' + (row.status === 'Inactive' ? ' class="is-inactive"' : '') + '>' +
        '<td><strong>' + row.name + '</strong>' +
        '<span class="d-block small ngd-text-muted">' + row.id + '</span></td>' +
        '<td>' + (row.company || '—') + '</td>' +
        '<td><span class="ngd-clip">' + row.email + '</span></td>' +
        '<td>' + row.mobile + '</td>' +
        '<td>' + row.country + '</td>' +
        '<td>' + statusChip(row.status) + '</td>' +
        '<td class="text-nowrap">' + row.joined + '</td>' +
        '<td class="text-nowrap">' + row.lastActive + '</td>' +
        '<td>' + actionsHtml(row) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function cardsHtml(rows) {
    return rows.map(function (row) {
      return (
        '<article class="ngd-req-card" data-adm-row="' + row.id + '">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<span class="ngd-init-avatar" aria-hidden="true">' + initials(row.name) + '</span>' +
        '<div class="flex-grow-1 min-w-0">' +
        '<strong>' + row.name + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + (row.company || row.id) + ' · ' + row.country + '</span>' +
        '</div>' +
        statusChip(row.status) +
        '</div>' +
        '<dl class="ngd-req-meta">' +
        '<div><dt>Email</dt><dd class="text-break">' + row.email + '</dd></div>' +
        '<div><dt>Mobile</dt><dd>' + row.mobile + '</dd></div>' +
        '<div><dt>Joined</dt><dd>' + row.joined + '</dd></div>' +
        '<div><dt>Last activity</dt><dd>' + row.lastActive + '</dd></div>' +
        '</dl>' +
        '<div class="mt-2">' + actionsHtml(row) + '</div>' +
        '</article>'
      );
    }).join('');
  }

  function renderPagination(total) {
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var wrap = $('adm-pagination');
    if (pages <= 1) { wrap.innerHTML = ''; return; }
    var html = '<nav aria-label="Customer pages"><ul class="pagination ngd-pagination mb-0">';
    html += '<li class="page-item' + (state.page === 1 ? ' disabled' : '') +
      '"><button type="button" class="page-link" data-adm-page="prev">‹</button></li>';
    for (var p = 1; p <= pages; p++) {
      html += '<li class="page-item' + (p === state.page ? ' active' : '') +
        '"><button type="button" class="page-link" data-adm-page="' + p + '">' + p + '</button></li>';
    }
    html += '<li class="page-item' + (state.page === pages ? ' disabled' : '') +
      '"><button type="button" class="page-link" data-adm-page="next">›</button></li>';
    html += '</ul></nav>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-adm-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-adm-page');
        if (v === 'prev') state.page = Math.max(1, state.page - 1);
        else if (v === 'next') state.page = Math.min(pages, state.page + 1);
        else state.page = parseInt(v, 10);
        apply();
      });
    });
  }

  function bindActions(root) {
    root.querySelectorAll('[data-adm-act]').forEach(function (el) {
      var act = el.getAttribute('data-adm-act');
      if (act === 'enquiries') return; /* real navigation */
      el.addEventListener('click', function () {
        var id = el.closest('[data-adm-row]').getAttribute('data-adm-row');
        var row = state.rows.find(function (r) { return r.id === id; });
        if (!row) return;
        if (act === 'view') renderDetail(row, null);
        else if (act === 'quotes') renderDetail(row, 'quotes');
        else if (act === 'active') toggleActive(row);
      });
    });
  }

  function apply() {
    if (state.ui !== 'demo') return;
    var all = visibleRows();
    var total = state.rows.length;
    var start = (state.page - 1) * PAGE_SIZE;
    if (start >= all.length) { state.page = 1; start = 0; }
    var pageRows = all.slice(start, start + PAGE_SIZE);

    $('adm-table-body').innerHTML = tableRows(pageRows);
    $('adm-cards-wrap').innerHTML = cardsHtml(pageRows);
    bindActions($('adm-table-body'));
    bindActions($('adm-cards-wrap'));
    renderPagination(all.length);

    $('adm-count').textContent = all.length === 0 && total === 0
      ? 'No customers'
      : 'Showing ' + (all.length === 0 ? 0 : start + 1) + '–' +
        Math.min(start + PAGE_SIZE, all.length) + ' of ' + all.length +
        ' (accounts: ' + total + ' demo customers)';
    var fc = activeFilterCount();
    $('adm-filter-count').textContent = fc ? String(fc) : '';
    $('adm-filter-count').classList.toggle('d-none', fc === 0);

    $('adm-table-card').hidden = pageRows.length === 0;
    $('adm-cards-wrap').hidden = pageRows.length === 0;
    $('adm-no-match').hidden = !(total > 0 && all.length === 0);
    $('adm-stage-empty').hidden = total !== 0;
    $('adm-stage-loading').hidden = true;
    $('adm-stage-error').hidden = true;
  }

  /* ---------------- details panel ---------------- */

  /* Deterministic sample activity per customer index — the Supabase
     phase replaces these with real per-account queries. */
  var QUOTE_STATUSES = ['Pending', 'Reviewed', 'Responded', 'Closed'];
  var HOLD_STATUSES = ['Pending', 'Active', 'Expired', 'Released'];
  var INSP_STATUSES = ['Requested', 'Scheduled', 'Completed', 'Cancelled'];

  function chipClassFor(status) {
    if (['Responded', 'Active', 'Completed'].indexOf(status) !== -1) return 'is-good';
    if (['Pending', 'Requested', 'New'].indexOf(status) !== -1) return 'is-gold';
    if (['Closed', 'Expired', 'Released', 'Cancelled'].indexOf(status) !== -1) return 'is-dim';
    return '';
  }

  function demoDate(i, k) {
    return '2026-0' + (6 + ((i + k) % 3)) + '-' + pad2(((i * 7 + k * 9) % 28) + 1);
  }

  function stoneRef(i, k, offset) {
    return 'NGD-10' + pad2(((i * 5 + k * 3 + offset) % 28) + 1);
  }

  function demoActivity(row) {
    var i = state.rows.findIndex(function (r) { return r.id === row.id; });
    var lists = { quotes: [], holds: [], inspections: [] };
    var q = i % 3;
    var h = (i + 2) % 3;
    var n = (i + 1) % 2 + (i % 5 === 0 ? 1 : 0);
    var k;
    for (k = 0; k < q; k++) {
      lists.quotes.push({ label: 'Quote QT-30' + pad2(i * 2 + k + 1) + ' · ' + stoneRef(i, k, 0),
        status: QUOTE_STATUSES[(i + k) % 4], date: demoDate(i, k) });
    }
    for (k = 0; k < h; k++) {
      lists.holds.push({ label: 'Hold on ' + stoneRef(i, k, 7),
        status: HOLD_STATUSES[(i + k) % 4], date: demoDate(i, k + 1) });
    }
    for (k = 0; k < n; k++) {
      lists.inspections.push({ label: 'Inspection · ' + stoneRef(i, k, 14),
        status: INSP_STATUSES[(i + k) % 4], date: demoDate(i, k + 2) });
    }
    return lists;
  }

  function activityRows(items, emptyText) {
    if (!items.length) {
      return '<p class="ngd-text-muted small mb-0">' + emptyText + '</p>';
    }
    return items.map(function (item) {
      return (
        '<div class="ngd-dash-row">' +
        '<div class="flex-grow-1 min-w-0"><strong class="small">' + item.label + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + item.date + '</span></div>' +
        '<span class="ngd-status-chip ' + chipClassFor(item.status) + '">' + item.status + '</span>' +
        '<span class="ngd-demo-chip">Demo</span>' +
        '</div>'
      );
    }).join('');
  }

  function detailSection(key, title, body) {
    return (
      '<section class="mt-3" data-cust-sec="' + key + '">' +
      '<h3 class="ngd-eyebrow mb-2">' + title + '</h3>' + body + '</section>'
    );
  }

  function renderDetail(row, focusSection) {
    state.detailId = row.id;
    var panel = $('cust-detail');
    var acts = demoActivity(row);
    var enquiries = (window.NGD_DEMO_ENQUIRIES || [])
      .filter(function (e) { return e.customerId === row.id; })
      .slice(0, 3)
      .map(function (e) {
        return { label: e.id + ' · ' + e.subject, status: e.status, date: e.date };
      });

    panel.innerHTML =
      '<div class="d-flex flex-wrap align-items-center gap-3">' +
      '<span class="ngd-init-avatar" aria-hidden="true">' + initials(row.name) + '</span>' +
      '<div class="flex-grow-1 min-w-0">' +
      '<h2 class="ngd-title fs-5 mb-0">' + row.name + '</h2>' +
      '<span class="ngd-text-muted small">' + (row.company || 'Individual account') + ' · ' + row.id + '</span>' +
      '</div>' +
      statusChip(row.status) +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" id="cust-detail-close">Close</button>' +
      '</div>' +
      '<dl class="ngd-req-meta mt-3">' +
      '<div><dt>Email</dt><dd class="text-break">' + row.email + '</dd></div>' +
      '<div><dt>Mobile</dt><dd>' + row.mobile + '</dd></div>' +
      '<div><dt>Country</dt><dd>' + row.country + '</dd></div>' +
      '<div><dt>Joined</dt><dd>' + row.joined + '</dd></div>' +
      '<div><dt>Last activity</dt><dd>' + row.lastActive + '</dd></div>' +
      '</dl>' +
      detailSection('quotes', 'Recent Quotes',
        activityRows(acts.quotes, 'No demo quotes for this account yet.')) +
      detailSection('holds', 'Recent Holds',
        activityRows(acts.holds, 'No demo holds for this account yet.')) +
      detailSection('inspections', 'Recent Inspections',
        activityRows(acts.inspections, 'No demo inspections for this account yet.')) +
      detailSection('enquiries', 'Recent Enquiries',
        activityRows(enquiries, 'No demo enquiries from this account yet.') +
        '<a class="ngd-link small d-inline-block mt-2" href="enquiries.html?customer=' +
        encodeURIComponent(row.id) + '">Open in the Enquiries console →</a>') +
      '<p class="ngd-dash-metric-note mt-3 mb-0">Demo profile — the activity above is ' +
      'generated sample data, not live records.</p>';

    panel.hidden = false;
    $('cust-detail-close').addEventListener('click', function () {
      panel.hidden = true;
      state.detailId = null;
    });
    var target = focusSection
      ? panel.querySelector('[data-cust-sec="' + focusSection + '"]') || panel
      : panel;
    target.scrollIntoView({ block: focusSection ? 'center' : 'nearest', behavior: 'smooth' });
  }

  /* ---------------- UI state previews ---------------- */

  function setUiState(ui) {
    state.ui = ui;
    var demo = ui === 'demo';
    $('adm-table-card').hidden = !demo;
    $('adm-cards-wrap').hidden = !demo;
    $('adm-pagination').hidden = !demo;
    $('cust-detail').hidden = true;
    state.detailId = null;
    $('adm-no-match').hidden = true;
    $('adm-stage-loading').hidden = ui !== 'loading';
    $('adm-stage-empty').hidden = ui !== 'empty';
    $('adm-stage-error').hidden = ui !== 'error';
    document.querySelectorAll('#adm-state-switch [data-adm-state]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-adm-state') === ui);
    });
    if (demo) apply();
    else $('adm-count').textContent = 'UI state preview — no data is being loaded';
  }

  /* ---------------- wiring ---------------- */

  function fillSelect(id, values) {
    var sel = $(id);
    values.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  }

  function uniques(key) {
    var seen = [];
    state.rows.forEach(function (r) {
      if (seen.indexOf(r[key]) === -1) seen.push(r[key]);
    });
    return seen.sort();
  }

  function initToolbar() {
    fillSelect('adm-f-status', STATUSES);
    fillSelect('adm-f-country', uniques('country'));

    $('adm-search').addEventListener('input', function () {
      state.query = this.value; state.page = 1; apply();
    });
    $('adm-sort').addEventListener('change', function () {
      state.sort = this.value; apply();
    });
    [['adm-f-status', 'status'], ['adm-f-country', 'country']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function () {
        state.filters[pair[1]] = this.value; state.page = 1; apply();
      });
    });
    $('adm-clear').addEventListener('click', function () {
      state.query = ''; state.page = 1;
      state.filters = { status: 'all', country: 'all' };
      $('adm-search').value = '';
      $('adm-f-status').value = 'all';
      $('adm-f-country').value = 'all';
      apply();
    });
    $('adm-state-switch').addEventListener('click', function (event) {
      var btn = event.target.closest('[data-adm-state]');
      if (btn) setUiState(btn.getAttribute('data-adm-state'));
    });
    $('adm-retry').addEventListener('click', function () { setUiState('demo'); });
  }

  function fill(field, value) {
    document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening

    var fullName = (res.profile.full_name || '').trim();
    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');

    state.rows = loadAdminCustomers();
    initToolbar();
    setUiState('demo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
