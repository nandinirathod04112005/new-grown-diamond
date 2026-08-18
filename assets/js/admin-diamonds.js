/* ============================================================
   NEW GROWN DIAMOND — ADMIN DIAMOND INVENTORY (LIVE)
   ------------------------------------------------------------
   Guarded by requireAdmin(). Rows load from public.diamonds in
   the connected Supabase project (RLS decides what an account
   may see). Search, filters, sort and pagination run client-side
   over the loaded inventory.

   Feature, activate and archive write through to Supabase. Loading,
   empty and error states reflect the
     actual fetch, and Retry re-queries Supabase.
   ============================================================ */
(function () {
  'use strict';

  var PAGE_SIZE = 10;

  var state = {
    rows: [],
    query: '',
    filters: {
      shape: 'all', colour: 'all', clarity: 'all', cut: 'all', lab: 'all',
      growth: 'all', availability: 'all', status: 'all', featured: 'all',
      caratMin: '', caratMax: ''
    },
    sort: 'updated-desc',
    page: 1,
    ui: 'loading',
    mutating: {},
    toolbarBound: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------------- live data ---------------- */

  /** One row from public.diamonds → the shape the renderers use. */
  function mapRow(d) {
    return {
      uuid: d.id,
      id: d.stock_number || d.public_id || '—',
      publicId: d.public_id || '',
      report: d.report_number || '',
      shape: d.shape || '—',
      carat: Number(d.carat) || 0,
      colour: d.color || '—',
      clarity: d.clarity || '—',
      cut: d.cut || '—',
      lab: d.laboratory || '—',
      growth: d.growth_method || '—',
      availability: d.availability || '—',
      featured: !!d.featured,
      active: d.active !== false,
      archivedAt: d.archived_at || null,
      updated: String(d.updated_at || d.created_at || '').slice(0, 10) || '—'
    };
  }

  /** Select the whole inventory from Supabase (newest first). */
  async function loadAdminDiamonds() {
    var res = await window.ngdSupabase
      .from('diamonds')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapRow);
  }

  /* ---------------- live mutations ---------------- */

  function toast(message, withUndo, type) {
    var box = $('adm-toast');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + (type || 'info') +
      ' d-flex flex-wrap align-items-center gap-2';
    div.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.textContent = message;
    div.appendChild(text);
    box.appendChild(div);
  }

  function mutationError(error) {
    console.error('[NGD Admin] diamond update failed:', error);
    var message = (error && error.message) || '';
    if (/failed to fetch|networkerror|fetch failed|load failed/i.test(message)) {
      return 'Could not reach the inventory service. Check your connection and try again.';
    }
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(message))) {
      return 'Your account is not permitted to change diamonds.';
    }
    return 'The change could not be saved. Please try again.';
  }

  async function updateRow(row, values, success) {
    if (state.mutating[row.publicId]) return false;
    state.mutating[row.publicId] = true;
    apply();
    try {
      values.updated_at = new Date().toISOString();
      var result = await window.ngdSupabase.from('diamonds').update(values)
        .eq('public_id', row.publicId).is('archived_at', null).select('public_id');
      if (result.error) throw result.error;
      if (!result.data || result.data.length !== 1) throw { code: 'not_found' };
      toast(success, false, 'success');
      return true;
    } catch (error) {
      toast(mutationError(error), false, 'danger');
      return false;
    } finally {
      delete state.mutating[row.publicId];
      apply();
    }
  }

  async function toggleFeatured(row) {
    var next = !row.featured;
    if (await updateRow(row, { featured: next },
      row.id + (next ? ' is now featured.' : ' is no longer featured.'))) {
      row.featured = next;
      apply();
    }
  }

  async function toggleActive(row) {
    var next = !row.active;
    if (!next && !window.confirm('Deactivate ' + row.id + '? Customers will no longer see it.')) return;
    if (await updateRow(row, { active: next }, row.id + (next ? ' was activated.' : ' was deactivated.'))) {
      row.active = next;
      apply();
    }
  }

  async function archiveRow(row) {
    if (!window.confirm('Archive ' + row.id + '? It will be deactivated and removed from this inventory.')) return;
    var now = new Date().toISOString();
    if (await updateRow(row, { archived_at: now, active: false }, row.id + ' was archived.')) {
      state.rows = state.rows.filter(function (item) { return item.publicId !== row.publicId; });
      setUiState(state.rows.length ? 'rows' : 'empty');
    }
  }

  /* ---------------- filtering + sorting ---------------- */

  function matches(row) {
    var f = state.filters;
    var q = state.query.trim().toLowerCase();
    if (q && (row.id + ' ' + row.report + ' ' + row.publicId + ' ' + row.shape + ' ' +
      row.colour + ' ' + row.clarity + ' ' + row.cut + ' ' + row.lab)
      .toLowerCase().indexOf(q) === -1) return false;
    if (f.shape !== 'all' && row.shape !== f.shape) return false;
    if (f.colour !== 'all' && row.colour !== f.colour) return false;
    if (f.clarity !== 'all' && row.clarity !== f.clarity) return false;
    if (f.cut !== 'all' && row.cut !== f.cut) return false;
    if (f.lab !== 'all' && row.lab !== f.lab) return false;
    if (f.growth !== 'all' && row.growth !== f.growth) return false;
    if (f.availability !== 'all' && row.availability !== f.availability) return false;
    if (f.status === 'active' && !row.active) return false;
    if (f.status === 'inactive' && row.active) return false;
    if (f.featured === 'featured' && !row.featured) return false;
    if (f.featured === 'not-featured' && row.featured) return false;
    if (f.caratMin !== '' && row.carat < parseFloat(f.caratMin)) return false;
    if (f.caratMax !== '' && row.carat > parseFloat(f.caratMax)) return false;
    return true;
  }

  var SORTS = {
    'updated-desc': function (a, b) { return b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id); },
    'stock': function (a, b) { return a.id.localeCompare(b.id); },
    'carat-desc': function (a, b) { return b.carat - a.carat; },
    'carat-asc': function (a, b) { return a.carat - b.carat; }
  };

  function visibleRows() {
    return state.rows.filter(matches).sort(SORTS[state.sort] || SORTS['updated-desc']);
  }

  function activeFilterCount() {
    var f = state.filters;
    var n = 0;
    ['shape', 'colour', 'clarity', 'cut', 'lab', 'growth', 'availability', 'status', 'featured']
      .forEach(function (k) { if (f[k] !== 'all') n++; });
    if (f.caratMin !== '') n++;
    if (f.caratMax !== '') n++;
    return n;
  }

  /* ---------------- rendering ---------------- */

  function art(row) {
    return (window.NGD_GEM_ART || {})[String(row.shape).toLowerCase()] || '';
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
      '<a class="ngd-icon-btn" href="../diamond-details.html?id=' + encodeURIComponent(row.id) + '"' +
      ' title="View on the storefront" aria-label="View ' + row.id + '" data-adm-act="view">' + ICONS.view + '</a>' +
      '<a class="ngd-icon-btn" href="edit-diamond.html?id=' + encodeURIComponent(row.publicId) + '"' +
      ' title="Edit" aria-label="Edit ' + row.id + '" data-adm-act="edit">' + ICONS.edit + '</a>' +
      '<button type="button" class="ngd-icon-btn' + (row.featured ? ' is-on' : '') + '"' +
      ' title="' + (row.featured ? 'Unfeature' : 'Feature') + '"' +
      ' aria-label="' + (row.featured ? 'Unfeature ' : 'Feature ') + row.id + '"' +
      ' aria-pressed="' + row.featured + '" data-adm-act="feature">' + ICONS.star + '</button>' +
      '<button type="button" class="ngd-icon-btn' + (row.active ? '' : ' is-off') + '"' +
      ' title="' + (row.active ? 'Deactivate' : 'Activate') + '"' +
      ' aria-label="' + (row.active ? 'Deactivate ' : 'Activate ') + row.id + '"' +
      ' aria-pressed="' + row.active + '" data-adm-act="active">' + ICONS.power + '</button>' +
      '<button type="button" class="ngd-icon-btn is-danger" title="Archive (never permanently deletes)"' +
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
        '<td class="ngd-stock-cell">' + row.id + '</td>' +
        '<td>' + row.shape + '</td>' +
        '<td>' + row.carat.toFixed(2) + '</td>' +
        '<td>' + row.colour + '</td>' +
        '<td>' + row.clarity + '</td>' +
        '<td>' + row.lab + '</td>' +
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
        '<strong>' + row.id + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + row.shape + ' · ' + row.carat.toFixed(2) +
        ' ct · ' + row.colour + ' · ' + row.clarity + ' · ' + row.lab + '</span>' +
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
    if (state.ui !== 'rows') return;
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

    $('adm-count').textContent =
      'Showing ' + (all.length === 0 ? 0 : start + 1) + '–' +
      Math.min(start + PAGE_SIZE, all.length) + ' of ' + all.length +
      ' (inventory: ' + total + ' stones)';
    var fc = activeFilterCount();
    $('adm-filter-count').textContent = fc ? String(fc) : '';
    $('adm-filter-count').classList.toggle('d-none', fc === 0);

    $('adm-table-card').hidden = pageRows.length === 0;
    $('adm-cards-wrap').hidden = pageRows.length === 0;
    $('adm-no-match').hidden = !(total > 0 && all.length === 0);
    $('adm-stage-empty').hidden = true;
    $('adm-stage-loading').hidden = true;
    $('adm-stage-error').hidden = true;
  }

  /* ---------------- real load lifecycle ---------------- */

  function setUiState(ui) {
    state.ui = ui;
    var rows = ui === 'rows';
    $('adm-table-card').hidden = !rows;
    $('adm-cards-wrap').hidden = !rows;
    $('adm-pagination').hidden = !rows;
    $('adm-no-match').hidden = true;
    $('adm-stage-loading').hidden = ui !== 'loading';
    $('adm-stage-empty').hidden = ui !== 'empty';
    $('adm-stage-error').hidden = ui !== 'error';
    if (ui === 'loading') $('adm-count').textContent = 'Loading the inventory…';
    else if (ui === 'empty') $('adm-count').textContent = 'No diamonds in the inventory yet';
    else if (ui === 'error') $('adm-count').textContent = 'The inventory could not be loaded';
    if (rows) apply();
  }

  async function reload() {
    setUiState('loading');
    try {
      state.rows = await loadAdminDiamonds();
      populateFilters();
      setUiState(state.rows.length ? 'rows' : 'empty');
    } catch (err) {
      console.error('[NGD Admin] diamonds load failed:', err);
      setUiState('error');
    }
  }

  /* ---------------- wiring ---------------- */

  function resetSelect(id) {
    var sel = $(id);
    while (sel.options.length > 1) sel.remove(1);
    sel.value = 'all';
  }

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
      var v = r[key];
      if (v && v !== '—' && seen.indexOf(v) === -1) seen.push(v);
    });
    return seen.sort();
  }

  /** Re-derive the filter options from the freshly loaded rows. */
  function populateFilters() {
    [['adm-f-shape', 'shape'], ['adm-f-colour', 'colour'], ['adm-f-clarity', 'clarity'],
     ['adm-f-cut', 'cut'], ['adm-f-lab', 'lab'], ['adm-f-growth', 'growth'],
     ['adm-f-availability', 'availability']].forEach(function (pair) {
      resetSelect(pair[0]);
      fillSelect(pair[0], uniques(pair[1]));
      state.filters[pair[1]] = 'all';
    });
  }

  function bindToolbar() {
    if (state.toolbarBound) return;
    state.toolbarBound = true;

    $('adm-search').addEventListener('input', function () {
      state.query = this.value; state.page = 1; apply();
    });
    $('adm-sort').addEventListener('change', function () {
      state.sort = this.value; apply();
    });

    [['adm-f-shape', 'shape'], ['adm-f-colour', 'colour'], ['adm-f-clarity', 'clarity'],
     ['adm-f-cut', 'cut'], ['adm-f-lab', 'lab'], ['adm-f-growth', 'growth'],
     ['adm-f-availability', 'availability'], ['adm-f-status', 'status'],
     ['adm-f-featured', 'featured']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function () {
        state.filters[pair[1]] = this.value; state.page = 1; apply();
      });
    });
    ['adm-f-carat-min', 'adm-f-carat-max'].forEach(function (id, i) {
      $(id).addEventListener('input', function () {
        state.filters[i === 0 ? 'caratMin' : 'caratMax'] = this.value;
        state.page = 1; apply();
      });
    });

    $('adm-clear').addEventListener('click', function () {
      state.query = ''; state.page = 1;
      state.filters = { shape: 'all', colour: 'all', clarity: 'all', cut: 'all', lab: 'all',
        growth: 'all', availability: 'all', status: 'all', featured: 'all', caratMin: '', caratMax: '' };
      $('adm-search').value = '';
      ['adm-f-shape', 'adm-f-colour', 'adm-f-clarity', 'adm-f-cut', 'adm-f-lab',
       'adm-f-growth', 'adm-f-availability', 'adm-f-status', 'adm-f-featured']
        .forEach(function (id) { $(id).value = 'all'; });
      $('adm-f-carat-min').value = '';
      $('adm-f-carat-max').value = '';
      apply();
    });

    $('adm-retry').addEventListener('click', reload);
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening

    bindToolbar();
    await reload();

    /* Arriving from a successful Add Diamond save */
    var params = new URLSearchParams(window.location.search);
    var added = params.get('added');
    var updated = params.get('updated');
    if (state.ui === 'rows' && (added || updated || params.get('archived'))) {
      toast(added ? added + ' was added to the inventory.' :
        updated ? updated + ' was updated successfully.' : 'The diamond was archived.', false, 'success');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
