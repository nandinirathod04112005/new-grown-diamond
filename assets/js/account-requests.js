/* ============================================================
   NEW GROWN DIAMOND — ACCOUNT REQUEST LISTS (LIVE)
   ------------------------------------------------------------
   One controller powers the three guarded request pages —
   Quote History, Holds and Inspections — selected by
   <body data-requests-page="quotes|holds|inspections">.

   All three lists are LIVE: they read the signed-in customer's
   own rows from public.quotes / public.holds / public.inspections
   (RLS scopes every query to auth.uid()), joined to the live
   products for display. Rendering, search and the filters run
   client-side over the loaded rows.
   ============================================================ */
(function () {
  'use strict';

  var CONFIGS = {
    quotes: {
      title: 'Quote History',
      idHead: 'Request',
      statuses: { Pending: '', Reviewed: 'is-gold', Responded: 'is-good', Closed: 'is-dim' },
      extra: { key: 'price', head: 'Quoted Price' },
      emptyTitle: 'No quote requests yet',
      emptyText: 'Use the Request Quote button on any diamond or jewellery page — your requests are tracked here.'
    },
    holds: {
      title: 'Holds',
      idHead: 'Hold',
      statuses: { Pending: '', Active: 'is-gold', Released: 'is-dim', Expired: 'is-dim', Rejected: 'is-dim' },
      extra: { key: 'expires', head: 'Expires' },
      emptyTitle: 'No holds yet',
      emptyText: 'Ask us to hold a stone or piece while you decide — use Request Hold on any product page.'
    },
    inspections: {
      title: 'Inspections',
      idHead: 'Inspection',
      statuses: { Pending: '', Scheduled: 'is-gold', Completed: 'is-good', Cancelled: 'is-dim', Rejected: 'is-dim' },
      extra: { key: 'type', head: 'Preferred type' },
      emptyTitle: 'No inspections yet',
      emptyText: 'Book a viewing from any diamond page — your inspection requests are tracked here.'
    }
  };

  var INSPECTION_TYPES = {
    in_person: 'In person · atelier',
    video_call: 'Video call',
    third_party_lab: 'Third-party lab'
  };

  var state = { config: null, rows: [], query: '', status: 'all', from: '', to: '', ui: 'demo' };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    var node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }

  /** Load the signed-in customer's own requests from Supabase. */
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
            url: '../' + (diamond ? 'diamond' : 'jewellery') + '-details.html?id=' + encodeURIComponent(item.public_id || ref),
            typeLabel: diamond ? 'Diamond' : 'Jewellery'
          }
        };
      }).filter(Boolean);
    }
    if (kind === 'holds') {
      var holds = await window.ngdSupabase.from('holds')
        .select('*, diamonds(*), jewellery(*)')
        .order('requested_at', { ascending: false });
      if (holds.error) throw holds.error;
      return (holds.data || []).map(function (hold) {
        var item = hold.product_type === 'diamond' ? hold.diamonds : hold.jewellery;
        if (!item) return null;
        var diamond = hold.product_type === 'diamond';
        var ref = diamond ? (item.stock_number || item.public_id || item.id) : (item.sku || item.public_id || item.id);
        return {
          id: hold.public_id, kind: hold.product_type, ref: ref,
          requested: String(hold.requested_at || hold.created_at).slice(0, 10),
          expires: hold.expires_at ? String(hold.expires_at).slice(0, 10) : null,
          status: hold.status.charAt(0).toUpperCase() + hold.status.slice(1),
          note: hold.customer_message || '—', adminNote: hold.admin_note,
          product: {
            name: diamond ? (item.shape || 'Diamond') + ' · ' + Number(item.carat || 0).toFixed(2) + ' ct' : (item.name || item.product_name || 'Jewellery'),
            sub: diamond ? [item.color, item.clarity, item.laboratory].filter(Boolean).join(' · ') : (item.category || 'Jewellery'),
            stock: ref, art: diamond ? ((window.NGD_GEM_ART || {})[String(item.shape || '').toLowerCase()] || '') : '',
            url: '../' + (diamond ? 'diamond' : 'jewellery') + '-details.html?id=' + encodeURIComponent(item.public_id || ref),
            typeLabel: diamond ? 'Diamond' : 'Jewellery'
          }
        };
      }).filter(Boolean);
    }
    var inspections = await window.ngdSupabase.from('inspections')
      .select('*, diamonds(*), jewellery(*)')
      .order('created_at', { ascending: false });
    if (inspections.error) throw inspections.error;
    return (inspections.data || []).map(function (inspection) {
      var item = inspection.product_type === 'diamond' ? inspection.diamonds : inspection.jewellery;
      if (!item) return null;
      var diamond = inspection.product_type === 'diamond';
      var ref = diamond ? (item.stock_number || item.public_id || item.id) : (item.sku || item.public_id || item.id);
      return {
        id: inspection.public_id, kind: inspection.product_type, ref: ref,
        requested: String(inspection.created_at).slice(0, 10),
        type: INSPECTION_TYPES[inspection.inspection_type] || inspection.inspection_type || '—',
        preferred: inspection.preferred_date || null,
        scheduled: inspection.scheduled_at ? String(inspection.scheduled_at).slice(0, 10) : null,
        status: inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1),
        note: inspection.customer_message || '—', adminNote: inspection.admin_note,
        product: {
          name: diamond ? (item.shape || 'Diamond') + ' · ' + Number(item.carat || 0).toFixed(2) + ' ct' : (item.name || item.product_name || 'Jewellery'),
          sub: diamond ? [item.color, item.clarity, item.laboratory].filter(Boolean).join(' · ') : (item.category || 'Jewellery'),
          stock: ref, art: diamond ? ((window.NGD_GEM_ART || {})[String(item.shape || '').toLowerCase()] || '') : '',
          url: '../' + (diamond ? 'diamond' : 'jewellery') + '-details.html?id=' + encodeURIComponent(item.public_id || ref),
          typeLabel: diamond ? 'Diamond' : 'Jewellery'
        }
      };
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
    return '<span class="ngd-status-chip ' + cls + '">' + esc(row.status) + '</span>';
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
      '<span class="min-w-0"><strong>' + esc(row.product.name) + '</strong>' +
      '<span class="ngd-text-muted d-block small">' + esc(row.product.stock) + ' · ' + esc(row.product.sub) + '</span></span>' +
      '</div>'
    );
  }

  function detailHtml(row) {
    return (
      '<div class="ngd-req-detail" data-req-detail hidden>' +
      '<dl class="row small mb-2">' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Reference</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.id) + '</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Item</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.product.name) + ' (' + esc(row.product.stock) + ')</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Requested</dt><dd class="col-sm-9 py-1 mb-0">' + row.requested + '</dd>' +
      (row.expires ? '<dt class="col-sm-3 ngd-stat-label py-1">Expires</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.expires) + '</dd>' : '') +
      (row.type ? '<dt class="col-sm-3 ngd-stat-label py-1">Type</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.type) + '</dd>' : '') +
      (row.preferred ? '<dt class="col-sm-3 ngd-stat-label py-1">Preferred date</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.preferred) + '</dd>' : '') +
      (row.scheduled ? '<dt class="col-sm-3 ngd-stat-label py-1">Scheduled</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.scheduled) + '</dd>' : '') +
      '<dt class="col-sm-3 ngd-stat-label py-1">Status</dt><dd class="col-sm-9 py-1 mb-0">' + chip(row) + '</dd>' +
      '<dt class="col-sm-3 ngd-stat-label py-1">Customer message</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.note) + '</dd>' +
      (row.adminNote ? '<dt class="col-sm-3 ngd-stat-label py-1">Admin response</dt><dd class="col-sm-9 py-1 mb-0">' + esc(row.adminNote) + '</dd>' : '') +
      (row.price != null ? '<dt class="col-sm-3 ngd-stat-label py-1">Quoted price</dt><dd class="col-sm-9 py-1 mb-0">' + extraValue(row) + '</dd>' : '') +
      '</dl>' +
      '<div class="d-flex flex-wrap align-items-center gap-3">' +
      '<a class="ngd-link small" href="' + row.product.url + '">View this item in the catalogue</a>' +
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
        '<tr data-req-row="' + esc(row.id) + '">' +
        '<td class="ngd-stock-cell">' + esc(row.id) + '</td>' +
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
        '<article class="ngd-req-card" data-req-row="' + esc(row.id) + '">' +
        '<div class="d-flex justify-content-between align-items-center gap-2 mb-2">' +
        '<span class="ngd-stock-no">' + esc(row.id) + '</span>' + chip(row) +
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

    $('req-count').textContent = 'Showing ' + rows.length + ' of ' + total + ' requests';
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
