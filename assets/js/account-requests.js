/* ============================================================
   NEW GROWN DIAMOND — ACCOUNT REQUEST LISTS (STEP 22 UI)
   ------------------------------------------------------------
   One controller powers the three guarded request pages —
   Quote History, Holds and Inspections — selected by
   <body data-requests-page="quotes|holds|inspections">.

   DEMO ONLY beyond the guard: no request backend exists. The
   rows are static samples resolved against the public demo
   catalogue, the page says so in its notice, and the state
   switcher only previews the loading/empty/error designs.
   Nothing is submitted, stored or deleted anywhere.

   FUTURE SUPABASE SEAM
   --------------------
   Replace loadRequests() with selects from the matching tables
   (quotes / holds / inspections; user_id, item_type, item_id,
   status, requested_at, …). Rendering, search and filters need
   no changes — the row shape below mirrors those columns.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- demo data ---------------- */

  var CONFIGS = {
    quotes: {
      title: 'Quote History',
      idHead: 'Request',
      statuses: { Pending: '', Reviewed: 'is-gold', Responded: 'is-good', Closed: 'is-dim' },
      extra: { key: 'price', head: 'Quoted Price' },
      emptyTitle: 'No quote requests yet',
      emptyText: 'Request Quote buttons across the site will file requests here once your account backend arrives.',
      rows: [
        { id: 'Q-0106', kind: 'diamond', ref: 'NGD-1007', requested: '2026-08-11', status: 'Pending',
          note: 'Asked for the best price on this stone with express delivery.' },
        { id: 'Q-0105', kind: 'jewellery', ref: 'JW-1003', requested: '2026-08-08', status: 'Reviewed',
          note: 'Requested a quote in ring size 54 with a rush engraving.' },
        { id: 'Q-0104', kind: 'diamond', ref: 'NGD-1015', requested: '2026-08-01', status: 'Responded',
          note: 'Quote sent by email — awaiting your confirmation.' },
        { id: 'Q-0103', kind: 'diamond', ref: 'NGD-1012', requested: '2026-07-22', status: 'Responded',
          note: 'Quote sent with a matched-pair option included.' },
        { id: 'Q-0102', kind: 'jewellery', ref: 'JW-1006', requested: '2026-07-10', status: 'Closed',
          note: 'Closed at your request — piece reserved elsewhere.' },
        { id: 'Q-0101', kind: 'diamond', ref: 'NGD-1001', requested: '2026-06-28', status: 'Closed',
          note: 'Quote expired after fourteen days without a reply.' }
      ]
    },
    holds: {
      title: 'Holds',
      idHead: 'Hold',
      statuses: { Pending: '', Active: 'is-gold', Expired: 'is-dim', Released: 'is-dim' },
      extra: { key: 'expires', head: 'Expires' },
      emptyTitle: 'No holds yet',
      emptyText: 'Ask us to hold a stone while you decide — holds you request will be tracked here once your account backend arrives.',
      rows: [
        { id: 'H-0045', kind: 'diamond', ref: 'NGD-1022', requested: '2026-08-12', expires: '2026-08-19',
          status: 'Pending', note: 'Awaiting confirmation from the inventory desk.' },
        { id: 'H-0044', kind: 'diamond', ref: 'NGD-1007', requested: '2026-08-09', expires: '2026-08-16',
          status: 'Active', note: 'Stone is off the market and reserved for you.' },
        { id: 'H-0043', kind: 'jewellery', ref: 'JW-1008', requested: '2026-08-02', expires: '2026-08-09',
          status: 'Active', note: 'Piece held at the atelier for your viewing.' },
        { id: 'H-0042', kind: 'diamond', ref: 'NGD-1012', requested: '2026-07-18', expires: '2026-07-25',
          status: 'Expired', note: 'Hold lapsed after seven days — the stone returned to the inventory.' },
        { id: 'H-0041', kind: 'diamond', ref: 'NGD-1003', requested: '2026-07-05', expires: '2026-07-12',
          status: 'Released', note: 'Released early at your request.' }
      ]
    },
    inspections: {
      title: 'Inspections',
      idHead: 'Inspection',
      statuses: { Requested: '', Scheduled: 'is-gold', Completed: 'is-good', Cancelled: 'is-dim' },
      extra: { key: 'type', head: 'Preferred type' },
      emptyTitle: 'No inspections yet',
      emptyText: 'Book a viewing of any stone or piece — inspection requests will be tracked here once your account backend arrives.',
      rows: [
        { id: 'INS-0031', kind: 'diamond', ref: 'NGD-1015', requested: '2026-08-13', type: 'In person · atelier',
          status: 'Requested', note: 'Preferred slot: weekday mornings.' },
        { id: 'INS-0030', kind: 'diamond', ref: 'NGD-1007', requested: '2026-08-06', type: 'Video call',
          status: 'Scheduled', note: 'Video inspection confirmed with a gemmologist.' },
        { id: 'INS-0029', kind: 'jewellery', ref: 'JW-1012', requested: '2026-07-28', type: 'In person · atelier',
          status: 'Completed', note: 'Viewed at the atelier — notes shared by email.' },
        { id: 'INS-0028', kind: 'diamond', ref: 'NGD-1001', requested: '2026-07-15', type: 'Third-party lab',
          status: 'Completed', note: 'Independent verification completed at the laboratory.' },
        { id: 'INS-0027', kind: 'jewellery', ref: 'JW-1006', requested: '2026-07-02', type: 'Video call',
          status: 'Cancelled', note: 'Cancelled at your request before scheduling.' }
      ]
    }
  };

  var state = { config: null, rows: [], query: '', status: 'all', from: '', to: '', ui: 'demo' };

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------------- catalogue resolution ---------------- */

  function resolveProduct(row) {
    if (row.kind === 'diamond') {
      var d = (window.NGD_DEMO_DIAMONDS || []).find(function (x) { return x.id === row.ref; });
      return d ? {
        name: d.shape + ' · ' + d.carat.toFixed(2) + ' ct',
        sub: d.colour + ' · ' + d.clarity + ' · ' + d.lab,
        stock: d.id,
        art: (window.NGD_GEM_ART || {})[d.shape.toLowerCase()] || '',
        url: '../diamond-details.html?id=' + encodeURIComponent(d.id),
        typeLabel: 'Diamond'
      } : null;
    }
    var p = (window.NGD_DEMO_JEWELLERY || []).find(function (x) { return x.id === row.ref; });
    return p ? {
      name: p.name,
      sub: p.category,
      stock: p.id,
      art: (window.NGD_JEWEL_ART || {})[p.category.toLowerCase()] || '',
      url: '../jewellery-details.html?id=' + encodeURIComponent(p.id),
      typeLabel: 'Jewellery'
    } : null;
  }

  /** Load quote requests from Supabase; the untouched request types retain their existing previews. */
  async function loadRequests(kind) {
    if (kind === 'quotes') {
      var result = await window.ngdSupabase.from('quotes')
        .select('*, diamonds(*), jewellery(*)')
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return (result.data || []).map(function (quote) {
        var item = quote.product_type === 'diamond' ? quote.diamonds : quote.jewellery;
        if (!item) return null;
        var diamond = quote.product_type === 'diamond';
        var ref = diamond ? (item.stock_number || item.public_id) : (item.sku || item.public_id);
        return {
          id: quote.public_id,
          kind: quote.product_type,
          ref: ref,
          requested: String(quote.created_at).slice(0, 10),
          status: quote.status.charAt(0).toUpperCase() + quote.status.slice(1),
          note: quote.customer_message || '—',
          adminNote: quote.admin_note,
          price: quote.quoted_price,
          currency: quote.currency,
          product: {
            name: diamond
              ? (item.shape || 'Diamond') + ' · ' + Number(item.carat || 0).toFixed(2) + ' ct'
              : (item.name || item.product_name || 'Jewellery'),
            sub: diamond
              ? [item.color, item.clarity, item.laboratory].filter(Boolean).join(' · ')
              : (item.category || 'Jewellery'),
            stock: ref,
            art: diamond ? ((window.NGD_GEM_ART || {})[String(item.shape || '').toLowerCase()] || '') : '',
            url: '../' + (diamond ? 'diamond' : 'jewellery') + '-details.html?id=' + encodeURIComponent(ref),
            typeLabel: diamond ? 'Diamond' : 'Jewellery'
          }
        };
      }).filter(Boolean);
    }
    return (CONFIGS[kind].rows || []).map(function (row) {
      var product = resolveProduct(row);
      return product ? Object.assign({ product: product }, row) : null;
    }).filter(Boolean);
  }

  /* ---------------- filtering ---------------- */

  function visibleRows() {
    var q = state.query.trim().toLowerCase();
    return state.rows.filter(function (row) {
      if (state.status !== 'all' && row.status !== state.status) return false;
      if (state.from && row.requested < state.from) return false;
      if (state.to && row.requested > state.to) return false;
      if (!q) return true;
      return (row.id + ' ' + row.product.name + ' ' + row.product.stock + ' ' +
        row.product.typeLabel + ' ' + row.status).toLowerCase().indexOf(q) !== -1;
    });
  }

  /* ---------------- rendering ---------------- */

  function chip(row) {
    var cls = state.config.statuses[row.status] || '';
    return '<span class="ngd-status-chip ' + cls + '">' + row.status + '</span>';
  }

  function extraValue(row) {
    if (state.config === CONFIGS.quotes) {
      return row.price == null ? '—' : (row.currency || '') + ' ' + Number(row.price).toLocaleString();
    }
    var key = state.config.extra.key;
    if (key === 'type' && state.config === CONFIGS.quotes) return row.product.typeLabel;
    return row[key] || '—';
  }

  function productCell(row) {
    return (
      '<div class="ngd-req-product">' +
      '<span class="ngd-req-thumb" aria-hidden="true">' + row.product.art + '</span>' +
      '<span class="min-w-0"><strong>' + row.product.name + '</strong>' +
      '<span class="ngd-text-muted d-block small">' + row.product.stock + ' · ' + row.product.sub + '</span></span>' +
      '</div>'
    );
  }

  function detailHtml(row) {
    return (
      '<div class="ngd-req-detail" data-req-detail hidden>' +
      '<dl class="row small mb-2">' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Reference</dt><dd class="col-sm-9 py-1 mb-0">' + row.id + '</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Item</dt><dd class="col-sm-9 py-1 mb-0">' + row.product.name + ' (' + row.product.stock + ')</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Requested</dt><dd class="col-sm-9 py-1 mb-0">' + row.requested + '</dd>' +
      (row.expires ? '<dt class="col-sm-3 ngd-stat-label py-1">Expires</dt><dd class="col-sm-9 py-1 mb-0">' + row.expires + '</dd>' : '') +
      (row.type ? '<dt class="col-sm-3 ngd-stat-label py-1">Type</dt><dd class="col-sm-9 py-1 mb-0">' + row.type + '</dd>' : '') +
      '<dt class="col-sm-3 ngd-stat-label py-1">Status</dt><dd class="col-sm-9 py-1 mb-0">' + chip(row) + '</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Customer message</dt><dd class="col-sm-9 py-1 mb-0">' + row.note + '</dd>' +
      (row.adminNote ? '<dt class="col-sm-3 ngd-stat-label py-1">Admin response</dt><dd class="col-sm-9 py-1 mb-0">' + row.adminNote + '</dd>' : '') +
      (row.price != null ? '<dt class="col-sm-3 ngd-stat-label py-1">Quoted price</dt><dd class="col-sm-9 py-1 mb-0">' + extraValue(row) + '</dd>' : '') +
      '</dl>' +
      '<div class="d-flex flex-wrap align-items-center gap-3">' +
      '<a class="ngd-link small" href="' + row.product.url + '">View this item in the catalogue</a>' +
      (state.config === CONFIGS.quotes ? '' : '<span class="ngd-demo-chip">Demo record</span>') +
      '</div>' +
      '</div>'
    );
  }

  function tableHtml(rows) {
    var extraHead = state.config.extra.head;
    var head =
      '<thead><tr><th scope="col">' + state.config.idHead + '</th><th scope="col">Product</th>' +
      '<th scope="col">Requested</th><th scope="col">' + extraHead + '</th>' +
      '<th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>';
    var body = rows.map(function (row) {
      return (
        '<tr data-req-row="' + row.id + '">' +
        '<td class="ngd-stock-cell">' + row.id + '</td>' +
        '<td>' + productCell(row) + '</td>' +
        '<td>' + row.requested + '</td>' +
        '<td>' + extraValue(row) + '</td>' +
        '<td>' + chip(row) + '</td>' +
        '<td class="text-end"><button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-req-toggle ' +
        'aria-expanded="false">View Details</button></td>' +
        '</tr>' +
        '<tr class="ngd-req-detail-row"><td colspan="6" class="p-0">' + detailHtml(row) + '</td></tr>'
      );
    }).join('');
    return (
      '<div class="ngd-table-card"><div class="table-responsive">' +
      '<table class="table ngd-table ngd-req-table mb-0">' + head + '<tbody>' + body + '</tbody></table>' +
      '</div></div>'
    );
  }

  function cardsHtml(rows) {
    return rows.map(function (row) {
      return (
        '<article class="ngd-req-card" data-req-row="' + row.id + '">' +
        '<div class="d-flex justify-content-between align-items-center gap-2 mb-2">' +
        '<span class="ngd-stock-no">' + row.id + '</span>' + chip(row) +
        '</div>' +
        productCell(row) +
        '<dl class="ngd-req-meta">' +
        '<div><dt>Requested</dt><dd>' + row.requested + '</dd></div>' +
        '<div><dt>' + state.config.extra.head + '</dt><dd>' + extraValue(row) + '</dd></div>' +
        '</dl>' +
        '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-btn-block mt-2" data-req-toggle ' +
        'aria-expanded="false">View Details</button>' +
        detailHtml(row) +
        '</article>'
      );
    }).join('');
  }

  function bindToggles(root) {
    root.querySelectorAll('[data-req-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var holder = btn.closest('[data-req-row]');
        var detail = holder.matches('tr')
          ? holder.nextElementSibling.querySelector('[data-req-detail]')
          : holder.querySelector('[data-req-detail]');
        var open = detail.hidden;
        detail.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Hide Details' : 'View Details';
      });
    });
  }

  function apply() {
    if (state.ui !== 'demo') return; /* state previews own the stage */
    var rows = visibleRows();
    var total = state.rows.length;

    $('req-table-wrap').innerHTML = rows.length ? tableHtml(rows) : '';
    $('req-cards-wrap').innerHTML = rows.length ? cardsHtml(rows) : '';
    bindToggles($('req-table-wrap'));
    bindToggles($('req-cards-wrap'));

    $('req-count').textContent = 'Showing ' + rows.length + ' of ' + total + (state.config === CONFIGS.quotes ? ' quote requests' : ' demo records');
    $('req-no-match').hidden = !(total > 0 && rows.length === 0);
    $('req-stage-empty').hidden = total !== 0;
    $('req-stage-loading').hidden = true;
    $('req-stage-error').hidden = true;
  }

  /* ---------------- UI state previews ---------------- */

  function setUiState(ui) {
    state.ui = ui;
    var showList = ui === 'demo';
    $('req-table-wrap').hidden = !showList;
    $('req-cards-wrap').hidden = !showList;
    $('req-no-match').hidden = true;
    $('req-stage-loading').hidden = ui !== 'loading';
    $('req-stage-empty').hidden = ui !== 'empty';
    $('req-stage-error').hidden = ui !== 'error';
    document.querySelectorAll('#req-state-switch [data-req-state]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-req-state') === ui);
    });
    if (showList) apply();
    else $('req-count').textContent = 'UI state preview — no data is being loaded';
  }

  /* ---------------- wiring ---------------- */

  function initToolbar() {
    var statusSel = $('req-status');
    Object.keys(state.config.statuses).forEach(function (status) {
      var opt = document.createElement('option');
      opt.value = status;
      opt.textContent = status;
      statusSel.appendChild(opt);
    });

    $('req-search').addEventListener('input', function () {
      state.query = this.value; apply();
    });
    statusSel.addEventListener('change', function () {
      state.status = this.value; apply();
    });
    $('req-from').addEventListener('change', function () {
      state.from = this.value; apply();
    });
    $('req-to').addEventListener('change', function () {
      state.to = this.value; apply();
    });
    $('req-clear').addEventListener('click', function () {
      state.query = ''; state.status = 'all'; state.from = ''; state.to = '';
      $('req-search').value = '';
      statusSel.value = 'all';
      $('req-from').value = '';
      $('req-to').value = '';
      apply();
    });

    var switchWrap = $('req-state-switch');
    switchWrap.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-req-state]');
      if (btn) setUiState(btn.getAttribute('data-req-state'));
    });
    $('req-retry').addEventListener('click', function () { window.location.reload(); });
  }

  function fill(field, value) {
    document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  async function init() {
    var kind = document.body.getAttribute('data-requests-page');
    state.config = CONFIGS[kind];
    if (!state.config) return;

    var res = await window.NGDAuth.requireCustomer();
    if (!res) return; // a redirect is already happening

    var fullName = (res.profile.full_name || '').trim();
    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');

    try {
      state.rows = await loadRequests(kind);
    } catch (error) {
      console.error('[NGD Quotes] load failed:', error);
      initToolbar();
      setUiState('error');
      return;
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
