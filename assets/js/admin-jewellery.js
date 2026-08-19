/* Admin jewellery inventory backed by public.jewellery. */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var state = {
    rows: [], query: '', page: 1, sort: 'updated-desc', ui: 'loading', bound: false,
    filters: { category: 'all', availability: 'all', status: 'all' }, busy: {}
  };
  function $(id) { return document.getElementById(id); }
  function text(value, fallback) {
    return value === null || value === undefined || value === '' ? (fallback || '—') : String(value);
  }
  function escapeHtml(value) {
    var node = document.createElement('div');
    node.textContent = text(value);
    return node.innerHTML;
  }
  function mapRow(row) {
    return {
      id: row.id, publicId: row.public_id || '', sku: row.sku || row.public_id || '—',
      name: row.product_name || '—', category: row.category || '—',
      subcategory: row.subcategory || '—', metal: row.metal || '—',
      weight: row.diamond_weight === null || row.diamond_weight === undefined ? null : Number(row.diamond_weight),
      availability: row.availability || '—', price: row.price === null || row.price === undefined ? null : Number(row.price),
      currency: row.currency || '', featured: !!row.featured, active: row.active !== false,
      updated: String(row.updated_at || row.created_at || '').slice(0, 10) || '—', archivedAt: row.archived_at || null
    };
  }
  async function load() {
    var result = await window.ngdSupabase.from('jewellery').select('*').is('archived_at', null).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []).map(mapRow);
  }
  function matches(row) {
    var q = state.query.trim().toLowerCase();
    if (q && (row.sku + ' ' + row.name).toLowerCase().indexOf(q) === -1) return false;
    if (state.filters.category !== 'all' && row.category !== state.filters.category) return false;
    if (state.filters.availability !== 'all' && row.availability !== state.filters.availability) return false;
    if (state.filters.status === 'active' && !row.active) return false;
    if (state.filters.status === 'inactive' && row.active) return false;
    return true;
  }
  var sorts = {
    'updated-desc': function (a, b) { return b.updated.localeCompare(a.updated); },
    name: function (a, b) { return a.name.localeCompare(b.name); },
    sku: function (a, b) { return a.sku.localeCompare(b.sku); },
    'weight-desc': function (a, b) { return (b.weight || 0) - (a.weight || 0); },
    'weight-asc': function (a, b) { return (a.weight || 0) - (b.weight || 0); }
  };
  function chips(row) {
    return {
      availability: '<span class="ngd-status-chip">' + escapeHtml(row.availability) + '</span>',
      featured: row.featured ? '<span class="ngd-status-chip is-gold">Featured</span>' : '<span class="ngd-status-chip is-dim">—</span>',
      active: row.active ? '<span class="ngd-status-chip is-good">Active</span>' : '<span class="ngd-status-chip is-dim">Inactive</span>'
    };
  }
  function price(row) {
    if (row.price === null || !isFinite(row.price)) return '—';
    return escapeHtml((row.currency ? row.currency + ' ' : '') + row.price.toFixed(2));
  }
  function actionButtons(row) {
    var disabled = state.busy[row.id] ? ' disabled' : '';
    return '<div class="d-flex flex-wrap gap-1">' +
      '<a class="ngd-btn ngd-btn-outline ngd-btn-sm" href="edit-jewellery.html?id=' + encodeURIComponent(row.publicId) + '">Edit</a>' +
      '<button class="ngd-btn ngd-btn-outline ngd-btn-sm" type="button" data-adm-act="featured" data-row-id="' + escapeHtml(row.id) + '"' + disabled + '>' + (row.featured ? 'Unfeature' : 'Feature') + '</button>' +
      '<button class="ngd-btn ngd-btn-outline ngd-btn-sm" type="button" data-adm-act="active" data-row-id="' + escapeHtml(row.id) + '"' + disabled + '>' + (row.active ? 'Deactivate' : 'Reactivate') + '</button>' +
      '<button class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-btn-danger-soft" type="button" data-adm-act="archive" data-row-id="' + escapeHtml(row.id) + '"' + disabled + '>Archive</button></div>';
  }
  function tableHtml(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return '<tr data-adm-row="' + escapeHtml(row.sku) + '">' +
        '<td class="ngd-stock-cell">' + escapeHtml(row.sku) + '</td><td>' + escapeHtml(row.name) +
        '</td><td>' + escapeHtml(row.category) + '</td><td>' + escapeHtml(row.subcategory) +
        '</td><td>' + escapeHtml(row.metal) + '</td><td>' + (row.weight === null ? '—' : row.weight.toFixed(2) + ' ct') +
        '</td><td>' + c.availability + '</td><td>' + price(row) + '</td><td>' + c.featured +
        '</td><td>' + c.active + '</td><td class="text-nowrap">' + escapeHtml(row.updated) + '</td><td>' + actionButtons(row) + '</td></tr>';
    }).join('');
  }
  function cardsHtml(rows) {
    return rows.map(function (row) { var c = chips(row); return '<article class="ngd-req-card"><strong>' +
      escapeHtml(row.name) + '</strong><span class="ngd-text-muted d-block small">' + escapeHtml(row.sku) +
      ' · ' + escapeHtml(row.category) + ' · ' + escapeHtml(row.subcategory) + '</span><div class="mt-2">' +
      escapeHtml(row.metal) + ' · ' + (row.weight === null ? '—' : row.weight.toFixed(2) + ' ct') + ' · ' + price(row) +
      '</div><div class="d-flex flex-wrap gap-2 mt-2">' + c.availability + c.featured + c.active +
      '</div><small class="ngd-text-muted d-block mb-2">Updated ' + escapeHtml(row.updated) + '</small>' + actionButtons(row) + '</article>'; }).join('');
  }
  function paginate(total) {
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var wrap = $('adm-pagination'); wrap.innerHTML = '';
    if (pages <= 1) return;
    for (var i = 1; i <= pages; i++) { var button = document.createElement('button'); button.type = 'button';
      button.className = 'page-link' + (i === state.page ? ' active' : ''); button.textContent = i;
      button.setAttribute('data-adm-page', i); button.addEventListener('click', function () { state.page = Number(this.getAttribute('data-adm-page')); render(); }); wrap.appendChild(button); }
  }
  function render() {
    if (state.ui !== 'rows') return;
    var rows = state.rows.filter(matches).sort(sorts[state.sort] || sorts['updated-desc']);
    var start = (state.page - 1) * PAGE_SIZE; if (start >= rows.length) { state.page = 1; start = 0; }
    var shown = rows.slice(start, start + PAGE_SIZE);
    $('adm-table-body').innerHTML = tableHtml(shown); $('adm-cards-wrap').innerHTML = cardsHtml(shown); paginate(rows.length);
    $('adm-count').textContent = 'Showing ' + (rows.length ? start + 1 : 0) + '–' + Math.min(start + PAGE_SIZE, rows.length) + ' of ' + rows.length + ' (' + state.rows.length + ' total)';
    $('adm-table-card').hidden = shown.length === 0; $('adm-cards-wrap').hidden = shown.length === 0;
    $('adm-no-match').hidden = !(state.rows.length && !rows.length); $('adm-stage-empty').hidden = state.rows.length !== 0;
    var count = Object.keys(state.filters).filter(function (k) { return state.filters[k] !== 'all'; }).length;
    $('adm-filter-count').textContent = count || ''; $('adm-filter-count').classList.toggle('d-none', !count);
  }
  function setUi(ui) {
    state.ui = ui; $('adm-stage-loading').hidden = ui !== 'loading'; $('adm-stage-error').hidden = ui !== 'error';
    $('adm-stage-empty').hidden = ui !== 'empty'; $('adm-table-card').hidden = ui !== 'rows'; $('adm-cards-wrap').hidden = ui !== 'rows';
    if (ui === 'rows') render();
  }
  function resetSelect(id) { while ($(id).options.length > 1) $(id).remove(1); }
  function populate(id, key) { resetSelect(id); var values = []; state.rows.forEach(function (r) { if (r[key] !== '—' && values.indexOf(r[key]) < 0) values.push(r[key]); }); values.sort().forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v; $(id).appendChild(o); }); }
  function toast(type, message) {
    $('adm-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + type + '" role="' + (type === 'success' ? 'status' : 'alert') + '"></div>';
    $('adm-toast').firstChild.textContent = message;
  }
  function findRow(id) { return state.rows.find(function (row) { return String(row.id) === String(id); }); }
  async function updateRow(row, changes, label) {
    state.busy[row.id] = true; render();
    var payload = Object.assign({}, changes, { updated_at: new Date().toISOString() });
    var result = await window.ngdSupabase.from('jewellery').update(payload)
      .eq('id', row.id).eq('public_id', row.publicId).select('id').maybeSingle();
    delete state.busy[row.id];
    if (result.error || !result.data) {
      console.error('[NGD Admin] jewellery action failed:', result.error);
      toast('danger', result.error && (result.error.code === '42501' || /row-level security|permission denied/i.test(result.error.message || '')) ?
        'Only an active admin can change jewellery.' : 'The ' + label.toLowerCase() + ' failed. Nothing was changed.');
      render(); return false;
    }
    Object.keys(changes).forEach(function (key) {
      if (key === 'active' || key === 'featured') row[key] = changes[key];
    });
    row.updated = payload.updated_at.slice(0, 10); toast('success', row.sku + ' was ' + label.toLowerCase() + '.'); render(); return true;
  }
  async function action(event) {
    var button = event.target.closest('[data-adm-act]'); if (!button) return;
    var row = findRow(button.getAttribute('data-row-id')); if (!row || state.busy[row.id]) return;
    var act = button.getAttribute('data-adm-act');
    if (act === 'active') {
      if (row.active && !window.confirm('Deactivate ' + row.sku + '?')) return;
      await updateRow(row, { active: !row.active }, row.active ? 'Deactivated' : 'Reactivated');
    } else if (act === 'featured') {
      await updateRow(row, { featured: !row.featured }, row.featured ? 'Unfeatured' : 'Featured');
    } else if (act === 'archive') {
      if (!window.confirm('Archive ' + row.sku + '? It will be deactivated and removed from this inventory.')) return;
      if (await updateRow(row, { archived_at: new Date().toISOString(), active: false }, 'Archived')) {
        state.rows = state.rows.filter(function (item) { return item.id !== row.id; });
        setUi(state.rows.length ? 'rows' : 'empty');
      }
    }
  }
  function bind() {
    if (state.bound) return; state.bound = true;
    $('adm-search').addEventListener('input', function () { state.query = this.value; state.page = 1; render(); });
    $('adm-sort').addEventListener('change', function () { state.sort = this.value; render(); });
    [['adm-f-category', 'category'], ['adm-f-availability', 'availability'], ['adm-f-status', 'status']].forEach(function (p) { $(p[0]).addEventListener('change', function () { state.filters[p[1]] = this.value; state.page = 1; render(); }); });
    $('adm-clear').addEventListener('click', function () { state.query = ''; $('adm-search').value = ''; Object.keys(state.filters).forEach(function (k) { state.filters[k] = 'all'; }); ['adm-f-category', 'adm-f-availability', 'adm-f-status'].forEach(function (id) { $(id).value = 'all'; }); render(); });
    $('adm-retry').addEventListener('click', reload);
    $('adm-table-body').addEventListener('click', action); $('adm-cards-wrap').addEventListener('click', action);
  }
  async function reload() { setUi('loading'); try { state.rows = await load(); populate('adm-f-category', 'category'); populate('adm-f-availability', 'availability'); setUi(state.rows.length ? 'rows' : 'empty'); } catch (error) { console.error('[NGD Admin] jewellery load failed:', error); setUi('error'); } }
  async function init() { var auth = await window.NGDAuth.requireAdmin(); if (!auth) return; bind(); await reload(); var params = new URLSearchParams(location.search), added = params.get('added'), archived = params.get('archived'); if (added) toast('success', added + ' was added to the inventory.'); else if (archived) toast('success', archived + ' was archived.'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
