/* ============================================================
   NEW GROWN DIAMOND — ADMIN ENQUIRIES (STEP 28 UI)
   ------------------------------------------------------------
   Guarded by requireAdmin(). DEMO ONLY beyond the guard: the
   inbox is the invented sample dataset (enquiries-data.js)
   joined to the demo customers. Status actions (Mark In
   Progress / Mark Responded / Close) edit ONLY this in-memory
   preview with an honest toast — nothing is saved to any
   server, no email is sent or faked, and everything returns on
   reload. The details panel's internal notes area says plainly
   that notes are not saved anywhere yet. ?customer=CU-… deep
   links (from the Customers console) pre-fill the search box.

   FUTURE SUPABASE SEAM
   --------------------
   loadAdminEnquiries() becomes a select over the enquiries
   table (joined to profiles) and setStatus() an update; the
   notes textarea maps to an admin_notes column. Rendering,
   filters and pagination need no changes.
   ============================================================ */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var STATUSES = ['New', 'In Progress', 'Responded', 'Closed'];
  var TYPES = ['General', 'Diamonds', 'Jewellery', 'Business', 'Support'];

  var state = {
    rows: [],
    query: '',
    filters: { status: 'all', type: 'all', from: '', to: '' },
    page: 1,
    ui: 'demo',
    detailId: null,
    notes: {}          /* per-enquiry draft notes, in-memory only */
  };

  function $(id) {
    return document.getElementById(id);
  }

  /** Future-backend seam: demo inbox joined to the demo customers. */
  function loadAdminEnquiries() {
    var byId = {};
    (window.NGD_DEMO_CUSTOMERS || []).forEach(function (c) { byId[c.id] = c; });
    return (window.NGD_DEMO_ENQUIRIES || []).map(function (e) {
      var c = e.customerId ? byId[e.customerId] : null;
      return Object.assign({}, e, {
        name: e.name || (c ? c.name : '—'),
        company: e.company != null ? e.company : (c ? c.company : null),
        email: e.email || (c ? c.email : '—'),
        guest: !e.customerId
      });
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

  function setStatus(row, status) {
    if (row.status === status) return;
    row.status = status;
    toast(row.id + ' ' + (status === 'Closed' ? 'closed' : 'marked ' + status) +
      ' in this demo preview — nothing was saved to any server.');
    apply();
    if (state.detailId === row.id) renderDetail(row);
  }

  /* ---------------- filtering ---------------- */

  function matches(row) {
    var f = state.filters;
    var q = state.query.trim().toLowerCase();
    if (q && (row.id + ' ' + row.name + ' ' + (row.company || '') + ' ' + row.email + ' ' +
      row.subject + ' ' + (row.customerId || '') + ' ' + (row.related || ''))
      .toLowerCase().indexOf(q) === -1) return false;
    if (f.status !== 'all' && row.status !== f.status) return false;
    if (f.type !== 'all' && row.type !== f.type) return false;
    if (f.from && row.date < f.from) return false;
    if (f.to && row.date > f.to) return false;
    return true;
  }

  function visibleRows() {
    /* newest first — the inbox order an admin expects */
    return state.rows.filter(matches).sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });
  }

  function activeFilterCount() {
    var f = state.filters;
    var n = 0;
    if (f.status !== 'all') n++;
    if (f.type !== 'all') n++;
    if (f.from) n++;
    if (f.to) n++;
    return n;
  }

  /* ---------------- rendering ---------------- */

  function statusChip(status) {
    var cls = status === 'New' ? 'is-gold'
      : status === 'Responded' ? 'is-good'
      : status === 'Closed' ? 'is-dim' : '';
    return '<span class="ngd-status-chip ' + cls + '">' + status + '</span>';
  }

  function relatedCell(row) {
    if (!row.related) return '—';
    var href = row.related.indexOf('NGD-') === 0
      ? '../diamond-details.html?id=' + encodeURIComponent(row.related)
      : '../jewellery-details.html?id=' + encodeURIComponent(row.related);
    return '<a class="ngd-link" href="' + href + '">' + row.related + '</a>';
  }

  var ICONS = {
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 7 4 12l5.5 5"/><path d="M4 12h9a7 7 0 0 1 7 7"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/></svg>'
  };

  function actionsHtml(row) {
    function statusBtn(act, icon, target, title) {
      var disabled = row.status === target;
      return '<button type="button" class="ngd-icon-btn"' + (disabled ? ' disabled' : '') +
        ' title="' + title + ' (demo only)" aria-label="' + title + ' — ' + row.id + '"' +
        ' data-adm-act="' + act + '">' + icon + '</button>';
    }
    return (
      '<div class="ngd-adm-actions">' +
      '<button type="button" class="ngd-icon-btn" title="View enquiry"' +
      ' aria-label="View ' + row.id + '" data-adm-act="view">' + ICONS.view + '</button>' +
      statusBtn('progress', ICONS.progress, 'In Progress', 'Mark In Progress') +
      statusBtn('responded', ICONS.reply, 'Responded', 'Mark Responded') +
      statusBtn('close', ICONS.done, 'Closed', 'Close') +
      '</div>'
    );
  }

  function tableRows(rows) {
    return rows.map(function (row) {
      return (
        '<tr data-adm-row="' + row.id + '"' + (row.status === 'Closed' ? ' class="is-inactive"' : '') + '>' +
        '<td class="ngd-stock-cell">' + row.id + '</td>' +
        '<td><strong>' + row.name + '</strong>' +
        (row.guest ? '<span class="d-block small ngd-text-muted">Guest</span>' : '') + '</td>' +
        '<td>' + (row.company || '—') + '</td>' +
        '<td><span class="ngd-clip">' + row.email + '</span></td>' +
        '<td><span class="ngd-clip" title="' + row.subject + '">' + row.subject + '</span></td>' +
        '<td>' + row.type + '</td>' +
        '<td>' + relatedCell(row) + '</td>' +
        '<td class="text-nowrap">' + row.date + '</td>' +
        '<td>' + statusChip(row.status) + '</td>' +
        '<td>' + actionsHtml(row) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function cardsHtml(rows) {
    return rows.map(function (row) {
      return (
        '<article class="ngd-req-card" data-adm-row="' + row.id + '">' +
        '<div class="d-flex align-items-start gap-2">' +
        '<div class="flex-grow-1 min-w-0">' +
        '<strong>' + row.subject + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + row.id + ' · ' + row.name +
        (row.company ? ' · ' + row.company : '') + '</span>' +
        '</div>' +
        statusChip(row.status) +
        '</div>' +
        '<dl class="ngd-req-meta">' +
        '<div><dt>Type</dt><dd>' + row.type + '</dd></div>' +
        '<div><dt>Date</dt><dd>' + row.date + '</dd></div>' +
        '<div><dt>Email</dt><dd class="text-break">' + row.email + '</dd></div>' +
        '<div><dt>Related</dt><dd>' + relatedCell(row) + '</dd></div>' +
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
    var html = '<nav aria-label="Enquiry pages"><ul class="pagination ngd-pagination mb-0">';
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
      el.addEventListener('click', function () {
        var id = el.closest('[data-adm-row]').getAttribute('data-adm-row');
        var row = state.rows.find(function (r) { return r.id === id; });
        if (!row) return;
        var act = el.getAttribute('data-adm-act');
        if (act === 'view') renderDetail(row);
        else if (act === 'progress') setStatus(row, 'In Progress');
        else if (act === 'responded') setStatus(row, 'Responded');
        else if (act === 'close') setStatus(row, 'Closed');
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
      ? 'No enquiries'
      : 'Showing ' + (all.length === 0 ? 0 : start + 1) + '–' +
        Math.min(start + PAGE_SIZE, all.length) + ' of ' + all.length +
        ' (inbox: ' + total + ' demo enquiries)';
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

  function renderDetail(row) {
    /* keep any draft note across re-renders (in-memory only) */
    var existing = $('enq-notes');
    if (existing && state.detailId) state.notes[state.detailId] = existing.value;
    state.detailId = row.id;

    var panel = $('enq-detail');
    function statusAction(target, label) {
      return '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm"' +
        (row.status === target ? ' disabled' : '') +
        ' data-enq-status="' + target + '">' + label + '</button>';
    }

    panel.innerHTML =
      '<div class="d-flex flex-wrap align-items-center gap-2">' +
      '<div class="flex-grow-1 min-w-0">' +
      '<h2 class="ngd-title fs-5 mb-0">' + row.subject + '</h2>' +
      '<span class="ngd-text-muted small">' + row.id + ' · ' + row.date + '</span>' +
      '</div>' +
      statusChip(row.status) +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" id="enq-detail-close">Close panel</button>' +
      '</div>' +
      '<dl class="ngd-req-meta mt-3">' +
      '<div><dt>From</dt><dd>' + row.name +
      (row.guest ? ' <span class="ngd-demo-chip">Guest</span>' : ' · ' + row.customerId) + '</dd></div>' +
      '<div><dt>Company</dt><dd>' + (row.company || '—') + '</dd></div>' +
      '<div><dt>Email</dt><dd class="text-break">' + row.email + '</dd></div>' +
      '<div><dt>Type</dt><dd>' + row.type + '</dd></div>' +
      '<div><dt>Related</dt><dd>' + relatedCell(row) + '</dd></div>' +
      '</dl>' +
      '<section class="mt-3" data-enq-sec="message">' +
      '<h3 class="ngd-eyebrow mb-2">Message</h3>' +
      '<p class="mb-0">' + row.message + '</p>' +
      '</section>' +
      '<section class="mt-3" data-enq-sec="notes">' +
      '<label class="form-label" for="enq-notes">Internal notes</label>' +
      '<textarea class="form-control" id="enq-notes" rows="3"' +
      ' placeholder="Visible to admins only…"></textarea>' +
      '<p class="ngd-dash-metric-note mt-1 mb-0">Demo only — notes are not saved ' +
      'anywhere yet; the admin notes column arrives with the Supabase phase.</p>' +
      '</section>' +
      '<div class="d-flex flex-wrap align-items-center gap-2 mt-3" data-enq-sec="actions">' +
      statusAction('In Progress', 'Mark In Progress') +
      statusAction('Responded', 'Mark Responded') +
      statusAction('Closed', 'Close enquiry') +
      '<span class="ngd-dash-metric-note">Status changes preview here only — no email is sent.</span>' +
      '</div>';

    $('enq-notes').value = state.notes[row.id] || '';
    panel.hidden = false;
    $('enq-detail-close').addEventListener('click', function () {
      state.notes[row.id] = $('enq-notes').value;
      panel.hidden = true;
      state.detailId = null;
    });
    panel.querySelectorAll('[data-enq-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStatus(row, btn.getAttribute('data-enq-status'));
      });
    });
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------------- UI state previews ---------------- */

  function setUiState(ui) {
    state.ui = ui;
    var demo = ui === 'demo';
    $('adm-table-card').hidden = !demo;
    $('adm-cards-wrap').hidden = !demo;
    $('adm-pagination').hidden = !demo;
    $('enq-detail').hidden = true;
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

  function initToolbar() {
    fillSelect('adm-f-status', STATUSES);
    fillSelect('adm-f-type', TYPES);

    $('adm-search').addEventListener('input', function () {
      state.query = this.value; state.page = 1; apply();
    });
    [['adm-f-status', 'status'], ['adm-f-type', 'type']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function () {
        state.filters[pair[1]] = this.value; state.page = 1; apply();
      });
    });
    [['adm-f-from', 'from'], ['adm-f-to', 'to']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function () {
        state.filters[pair[1]] = this.value; state.page = 1; apply();
      });
    });
    $('adm-clear').addEventListener('click', function () {
      state.query = ''; state.page = 1;
      state.filters = { status: 'all', type: 'all', from: '', to: '' };
      $('adm-search').value = '';
      $('adm-f-status').value = 'all';
      $('adm-f-type').value = 'all';
      $('adm-f-from').value = '';
      $('adm-f-to').value = '';
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

    state.rows = loadAdminEnquiries();

    /* deep link from the Customers console: pre-filter by account */
    var cust = new URLSearchParams(window.location.search).get('customer');
    if (cust) {
      state.query = cust;
      $('adm-search').value = cust;
    }

    initToolbar();
    setUiState('demo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
