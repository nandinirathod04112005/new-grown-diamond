/* ============================================================
   NEW GROWN DIAMOND — ADMIN DIAMOND INVENTORY (STEP 24 UI)
   ------------------------------------------------------------
   Guarded by requireAdmin(). DEMO ONLY beyond the guard: the
   rows are the public demo catalogue augmented with
   deterministic admin fields (featured / active / updated).
   Feature, activate and archive actions edit ONLY this
   in-memory preview — every change shows an honest toast
   (with Undo for archive) and the samples return on reload.
   Nothing is saved to any server and no success is faked.

   FUTURE SUPABASE SEAM
   --------------------
   loadAdminDiamonds() becomes a select over the diamonds table
   (incl. featured/active/updated_at columns) and the three
   mutate helpers become updates/soft-deletes. Rendering,
   filters, sort and pagination need no changes.
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

  /** Future-backend seam: demo catalogue + deterministic admin fields. */
  function loadAdminDiamonds() {
    return (window.NGD_DEMO_DIAMONDS || []).map(function (d, i) {
      return Object.assign({}, d, {
        featured: i % 5 === 0 || i % 7 === 0,
        active: i % 9 !== 4,
        updated: updatedFor(i)
      });
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

  function demoNote(action, row) {
    return row.id + ' ' + action + ' in this demo preview — nothing was saved to any server.';
  }

  function toggleFeatured(row) {
    row.featured = !row.featured;
    toast(demoNote(row.featured ? 'marked featured' : 'unfeatured', row));
    apply();
  }

  function toggleActive(row) {
    row.active = !row.active;
    toast(demoNote(row.active ? 'activated' : 'deactivated', row));
    apply();
  }

  function archiveRow(row) {
    var index = state.rows.indexOf(row);
    if (index === -1) return;
    state.rows.splice(index, 1);
    state.lastArchived = { row: row, index: index };
    toast(demoNote('archived', row), true);
    apply();
  }

  function restoreArchived() {
    var last = state.lastArchived;
    if (!last) return;
    state.rows.splice(Math.min(last.index, state.rows.length), 0, last.row);
    state.lastArchived = null;
    $('adm-toast').innerHTML = '';
    apply();
  }

  /* ---------------- filtering + sorting ---------------- */

  function matches(row) {
    var f = state.filters;
    var q = state.query.trim().toLowerCase();
    if (q && (row.id + ' ' + row.shape + ' ' + row.colour + ' ' + row.clarity + ' ' +
      row.cut + ' ' + row.lab).toLowerCase().indexOf(q) === -1) return false;
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
    return (window.NGD_GEM_ART || {})[row.shape.toLowerCase()] || '';
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
      '<a class="ngd-icon-btn" href="edit-diamond.html?id=' + encodeURIComponent(row.id) + '"' +
      ' title="Edit" aria-label="Edit ' + row.id + '" data-adm-act="edit">' + ICONS.edit + '</a>' +
      '<button type="button" class="ngd-icon-btn' + (row.featured ? ' is-on' : '') + '"' +
      ' title="' + (row.featured ? 'Unfeature' : 'Feature') + ' (demo only)"' +
      ' aria-label="' + (row.featured ? 'Unfeature ' : 'Feature ') + row.id + '"' +
      ' aria-pressed="' + row.featured + '" data-adm-act="feature">' + ICONS.star + '</button>' +
      '<button type="button" class="ngd-icon-btn' + (row.active ? '' : ' is-off') + '"' +
      ' title="' + (row.active ? 'Deactivate' : 'Activate') + ' (demo only)"' +
      ' aria-label="' + (row.active ? 'Deactivate ' : 'Activate ') + row.id + '"' +
      ' aria-pressed="' + row.active + '" data-adm-act="active">' + ICONS.power + '</button>' +
      '<button type="button" class="ngd-icon-btn is-danger" title="Archive (demo only)"' +
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
      ? 'No diamonds'
      : 'Showing ' + (all.length === 0 ? 0 : start + 1) + '–' +
        Math.min(start + PAGE_SIZE, all.length) + ' of ' + all.length +
        ' (catalogue: ' + total + ' demo stones)';
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
    fillSelect('adm-f-shape', uniques('shape'));
    fillSelect('adm-f-colour', uniques('colour'));
    fillSelect('adm-f-clarity', uniques('clarity'));
    fillSelect('adm-f-cut', uniques('cut'));
    fillSelect('adm-f-lab', uniques('lab'));
    fillSelect('adm-f-growth', uniques('growth'));
    fillSelect('adm-f-availability', uniques('availability'));

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

    state.rows = loadAdminDiamonds();
    initToolbar();
    setUiState('demo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
