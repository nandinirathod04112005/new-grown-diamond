/* ============================================================
   NEW GROWN DIAMOND — ADMIN JEWELLERY INVENTORY (STEP 26 UI)
   ------------------------------------------------------------
   Guarded by requireAdmin(). DEMO ONLY beyond the guard: the
   rows are the public demo collection augmented with
   deterministic admin fields (featured / active / updated —
   the same formulas the diamond inventory uses, so both
   consoles stay in step). Feature, activate and archive
   actions edit ONLY this in-memory preview — every change
   shows an honest toast (with Undo for archive) and the
   samples return on reload. Nothing is saved to any server
   and no success is faked.

   FUTURE SUPABASE SEAM
   --------------------
   loadAdminJewellery() becomes a select over the jewellery
   table (incl. featured/active/updated_at columns) and the
   three mutate helpers become updates/soft-deletes. Rendering,
   filters, sort and pagination need no changes.
   ============================================================ */
(function () {
  'use strict';

  var PAGE_SIZE = 10;

  /* Spec order — also the future Supabase category enum. */
  var CATEGORIES = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];

  var state = {
    rows: [],
    query: '',
    filters: { category: 'all', availability: 'all', status: 'all', featured: 'all' },
    sort: 'updated-desc',
    page: 1,
    ui: 'demo',
    lastArchived: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------------- demo data ---------------- */

  function updatedFor(i) {
    var month = 6 + (i % 3);            /* 2026-06 … 2026-08 */
    var day = (i * 7) % 28 + 1;
    return '2026-0' + month + '-' + String(day).padStart(2, '0');
  }

  /** Future-backend seam: demo collection + deterministic admin fields. */
  async function loadAdminJewellery() {
    var result = await window.ngdSupabase.from('jewellery').select(
      'public_id,sku,product_name,category,diamond_weight,availability,featured,active,updated_at'
    ).is('archived_at', null).order('updated_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []).map(function (p) {
      return {
        id: p.public_id, sku: p.sku, name: p.product_name,
        category: p.category, weightCt: p.diamond_weight == null ? null : Number(p.diamond_weight),
        availability: p.availability, featured: !!p.featured, active: !!p.active,
        updated: p.updated_at ? String(p.updated_at).slice(0, 10) : '—'
      };
    });
  }

  /* ---------------- honest demo mutations ---------------- */

  function toast(message, withUndo) {
    var box = $('adm-toast');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-info d-flex flex-wrap align-items-center gap-2';
    div.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.textContent = message;
    div.appendChild(text);
    if (withUndo) {
      var undo = document.createElement('button');
      undo.type = 'button';
      undo.className = 'ngd-link btn btn-link p-0 border-0 align-baseline';
      undo.id = 'adm-undo';
      undo.textContent = 'Undo';
      undo.addEventListener('click', restoreArchived);
      div.appendChild(undo);
    }
    box.appendChild(div);
  }

  async function updateRow(row, changes, successMessage) {
    var result = await window.ngdSupabase.from('jewellery').update(Object.assign({}, changes, {
      updated_at: new Date().toISOString()
    })).eq('public_id', row.id).select('public_id').maybeSingle();
    if (result.error || !result.data) {
      toast('The change was not saved. ' + ((result.error && result.error.message) || 'The product may no longer exist.'));
      return false;
    }
    Object.assign(row, changes, { updated: new Date().toISOString().slice(0, 10) });
    toast(row.id + ' ' + successMessage + '.');
    apply();
    return true;
  }

  async function toggleFeatured(row) {
    await updateRow(row, { featured: !row.featured }, row.featured ? 'unfeatured' : 'marked featured');
  }

  async function toggleActive(row) {
    if (row.active && !window.confirm('Deactivate ' + row.id + '?')) return;
    await updateRow(row, { active: !row.active }, row.active ? 'deactivated' : 'activated');
  }

  async function archiveRow(row) {
    if (!window.confirm('Archive ' + row.id + '? It will be removed from the normal inventory.')) return;
    var ok = await updateRow(row, { active: false, archived_at: new Date().toISOString() }, 'archived');
    if (!ok) return;
    state.rows = state.rows.filter(function (item) { return item !== row; });
    apply();
  }

  /* ---------------- filtering + sorting ---------------- */

  function matches(row) {
    var f = state.filters;
    var q = state.query.trim().toLowerCase();
    if (q && (row.id + ' ' + row.sku + ' ' + row.name + ' ' + row.category).toLowerCase().indexOf(q) === -1) return false;
    if (f.category !== 'all' && row.category !== f.category) return false;
    if (f.availability !== 'all' && row.availability !== f.availability) return false;
    if (f.status === 'active' && !row.active) return false;
    if (f.status === 'inactive' && row.active) return false;
    if (f.featured === 'featured' && !row.featured) return false;
    if (f.featured === 'not-featured' && row.featured) return false;
    return true;
  }

  /* All-metal pieces (weightCt null) always sort after set pieces. */
  var SORTS = {
    'updated-desc': function (a, b) { return b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id); },
    'name': function (a, b) { return a.name.localeCompare(b.name); },
    'sku': function (a, b) { return a.sku.localeCompare(b.sku); },
    'weight-desc': function (a, b) {
      if (a.weightCt === null) return b.weightCt === null ? 0 : 1;
      if (b.weightCt === null) return -1;
      return b.weightCt - a.weightCt;
    },
    'weight-asc': function (a, b) {
      if (a.weightCt === null) return b.weightCt === null ? 0 : 1;
      if (b.weightCt === null) return -1;
      return a.weightCt - b.weightCt;
    }
  };

  function visibleRows() {
    return state.rows.filter(matches).sort(SORTS[state.sort] || SORTS['updated-desc']);
  }

  function activeFilterCount() {
    var f = state.filters;
    var n = 0;
    ['category', 'availability', 'status', 'featured']
      .forEach(function (k) { if (f[k] !== 'all') n++; });
    return n;
  }

  /* ---------------- rendering ---------------- */

  function art(row) {
    return (window.NGD_JEWEL_ART || {})[row.category.toLowerCase()] || '';
  }

  function weightText(row) {
    return row.weightCt === null ? '—' : row.weightCt.toFixed(2) + ' ct';
  }

  function chips(row) {
    var availCls = row.availability === 'In Stock' ? 'is-good' : '';
    return {
      avail: '<span class="ngd-status-chip ' + availCls + '">' + row.availability + '</span>',
      featured: row.featured
        ? '<span class="ngd-status-chip is-gold">Featured</span>'
        : '<span class="ngd-status-chip is-dim">—</span>',
      active: row.active
        ? '<span class="ngd-status-chip is-good">Active</span>'
        : '<span class="ngd-status-chip is-dim">Inactive</span>'
    };
  }

  var ICONS = {
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="m13.5 6.5 3 3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1 0 11.4 0"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>'
  };

  function actionsHtml(row) {
    return (
      '<div class="ngd-adm-actions">' +
      '<a class="ngd-icon-btn" href="../jewellery-details.html?id=' + encodeURIComponent(row.id) + '"' +
      ' title="View on the storefront" aria-label="View ' + row.id + '" data-adm-act="view">' + ICONS.view + '</a>' +
      '<a class="ngd-icon-btn" href="edit-jewellery.html?id=' + encodeURIComponent(row.id) + '"' +
      ' title="Edit" aria-label="Edit ' + row.id + '" data-adm-act="edit">' + ICONS.edit + '</a>' +
      '<button type="button" class="ngd-icon-btn' + (row.featured ? ' is-on' : '') + '"' +
      ' title="' + (row.featured ? 'Unfeature' : 'Feature') + '"' +
      ' aria-label="' + (row.featured ? 'Unfeature ' : 'Feature ') + row.id + '"' +
      ' aria-pressed="' + row.featured + '" data-adm-act="feature">' + ICONS.star + '</button>' +
      '<button type="button" class="ngd-icon-btn' + (row.active ? '' : ' is-off') + '"' +
      ' title="' + (row.active ? 'Deactivate' : 'Activate') + '"' +
      ' aria-label="' + (row.active ? 'Deactivate ' : 'Activate ') + row.id + '"' +
      ' aria-pressed="' + row.active + '" data-adm-act="active">' + ICONS.power + '</button>' +
      '<button type="button" class="ngd-icon-btn is-danger" title="Archive"' +
      ' aria-label="Archive ' + row.id + '" data-adm-act="archive">' + ICONS.archive + '</button>' +
      '</div>'
    );
  }

  function tableRows(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return (
        '<tr data-adm-row="' + row.id + '"' + (row.active ? '' : ' class="is-inactive"') + '>' +
        '<td><span class="ngd-req-thumb">' + art(row) + '</span></td>' +
        '<td class="ngd-stock-cell">' + row.sku + '</td>' +
        '<td>' + row.name + '</td>' +
        '<td>' + row.category + '</td>' +
        '<td>' + weightText(row) + '</td>' +
        '<td>' + c.avail + '</td>' +
        '<td>' + c.featured + '</td>' +
        '<td>' + c.active + '</td>' +
        '<td class="text-nowrap">' + row.updated + '</td>' +
        '<td>' + actionsHtml(row) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function cardsHtml(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return (
        '<article class="ngd-req-card" data-adm-row="' + row.id + '">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<span class="ngd-req-thumb">' + art(row) + '</span>' +
        '<div class="flex-grow-1 min-w-0">' +
        '<strong>' + row.name + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + row.sku + ' · ' + row.category +
        ' · ' + weightText(row) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex flex-wrap gap-2 mt-2">' + c.avail + c.featured + c.active + '</div>' +
        '<dl class="ngd-req-meta"><div><dt>Updated</dt><dd>' + row.updated + '</dd></div></dl>' +
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
    var html = '<nav aria-label="Inventory pages"><ul class="pagination ngd-pagination mb-0">';
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
      if (act === 'view' || act === 'edit') return; /* real navigation */
      el.addEventListener('click', function () {
        var id = el.closest('[data-adm-row]').getAttribute('data-adm-row');
        var row = state.rows.find(function (r) { return r.id === id; });
        if (!row) return;
        if (act === 'feature') toggleFeatured(row);
        else if (act === 'active') toggleActive(row);
        else if (act === 'archive') archiveRow(row);
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
      ? 'No jewellery'
      : 'Showing ' + (all.length === 0 ? 0 : start + 1) + '–' +
        Math.min(start + PAGE_SIZE, all.length) + ' of ' + all.length +
        ' (collection: ' + total + ' products)';
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

  /* ---------------- UI state previews ---------------- */

  function setUiState(ui) {
    state.ui = ui;
    var demo = ui === 'demo';
    $('adm-table-card').hidden = !demo;
    $('adm-cards-wrap').hidden = !demo;
    $('adm-pagination').hidden = !demo;
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
    fillSelect('adm-f-category', CATEGORIES);
    fillSelect('adm-f-availability', uniques('availability'));

    $('adm-search').addEventListener('input', function () {
      state.query = this.value; state.page = 1; apply();
    });
    $('adm-sort').addEventListener('change', function () {
      state.sort = this.value; apply();
    });

    [['adm-f-category', 'category'], ['adm-f-availability', 'availability'],
     ['adm-f-status', 'status'], ['adm-f-featured', 'featured']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function () {
        state.filters[pair[1]] = this.value; state.page = 1; apply();
      });
    });

    $('adm-clear').addEventListener('click', function () {
      state.query = ''; state.page = 1;
      state.filters = { category: 'all', availability: 'all', status: 'all', featured: 'all' };
      $('adm-search').value = '';
      ['adm-f-category', 'adm-f-availability', 'adm-f-status', 'adm-f-featured']
        .forEach(function (id) { $(id).value = 'all'; });
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

    try {
      state.rows = await loadAdminJewellery();
      initToolbar();
      setUiState('demo');
    } catch (error) {
      console.error('[NGD Admin Jewellery] load failed:', error);
      state.rows = [];
      initToolbar();
      setUiState('error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
