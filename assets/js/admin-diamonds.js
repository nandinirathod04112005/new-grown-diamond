/* ============================================================
   NEW GROWN DIAMOND — ADMIN DIAMOND INVENTORY (LIVE, STEP 32)
   ------------------------------------------------------------
   Guarded by requireAdmin(). Rows load from public.diamonds in
   the connected Supabase project (RLS decides what an account
   may see). Search, filters, sort and pagination run client-side
   over the loaded inventory.

   Loading / empty / error states are real: they reflect the
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
    toolbarBound: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
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
      updated: String(d.updated_at || d.created_at || '').slice(0, 10) || '—'
    };
  }

  /** Select the whole inventory from Supabase (newest first). */
  async function loadAdminDiamonds() {
    var res = await window.ngdSupabase
      .from('diamonds')
      .select('*')
      .order('updated_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapRow);
  }

  /* ---------------- notifications ---------------- */

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

  function chips(row) {
    var availCls = row.availability === 'In Stock' ? 'is-good' : '';
    return {
      avail: '<span class="ngd-status-chip ' + availCls + '">' + escapeHtml(row.availability) + '</span>',
      featured: row.featured
        ? '<span class="ngd-status-chip is-gold">Featured</span>'
        : '<span class="ngd-status-chip is-dim">—</span>',
      active: row.active
        ? '<span class="ngd-status-chip is-good">Active</span>'
        : '<span class="ngd-status-chip is-dim">Inactive</span>'
    };
  }

  function tableRows(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return (
        '<tr data-adm-row="' + escapeHtml(row.id) + '"' + (row.active ? '' : ' class="is-inactive"') + '>' +
        '<td class="ngd-stock-cell">' + escapeHtml(row.id) + '</td>' +
        '<td>' + escapeHtml(row.shape) + '</td>' +
        '<td>' + row.carat.toFixed(2) + '</td>' +
        '<td>' + escapeHtml(row.colour) + '</td>' +
        '<td>' + escapeHtml(row.clarity) + '</td>' +
        '<td>' + escapeHtml(row.lab) + '</td>' +
        '<td>' + c.avail + '</td>' +
        '<td>' + c.featured + '</td>' +
        '<td>' + c.active + '</td>' +
        '<td class="text-nowrap">' + escapeHtml(row.updated) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function cardsHtml(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return (
        '<article class="ngd-req-card" data-adm-row="' + escapeHtml(row.id) + '">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<div class="flex-grow-1 min-w-0">' +
        '<strong>' + escapeHtml(row.id) + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + escapeHtml(row.shape) + ' · ' + row.carat.toFixed(2) +
        ' ct · ' + escapeHtml(row.colour) + ' · ' + escapeHtml(row.clarity) + ' · ' + escapeHtml(row.lab) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex flex-wrap gap-2 mt-2">' + c.avail + c.featured + c.active + '</div>' +
        '<dl class="ngd-req-meta"><div><dt>Updated</dt><dd>' + escapeHtml(row.updated) + '</dd></div></dl>' +
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

  function apply() {
    if (state.ui !== 'rows') return;
    var all = visibleRows();
    var total = state.rows.length;
    var start = (state.page - 1) * PAGE_SIZE;
    if (start >= all.length) { state.page = 1; start = 0; }
    var pageRows = all.slice(start, start + PAGE_SIZE);

    $('adm-table-body').innerHTML = tableRows(pageRows);
    $('adm-cards-wrap').innerHTML = cardsHtml(pageRows);
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
    var added = new URLSearchParams(window.location.search).get('added');
    if (added && state.ui === 'rows') {
      toast(added + ' was added to the inventory.', false, 'success');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
