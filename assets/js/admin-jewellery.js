/* Admin jewellery inventory backed by public.jewellery.
   Rows load live (archived pieces excluded); the feature / active /
   archive actions write through Supabase with verification and the
   list re-reads after every successful change. Archive is a soft
   delete: archived_at + inactive — rows are never hard-deleted.
   Each row shows its PRIMARY photo from public.jewellery_images
   (jewellery-images bucket), falling back to the category art. */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var state = {
    rows: [], query: '', page: 1, sort: 'updated-desc', ui: 'loading', bound: false,
    mutating: false,
    filters: { category: 'all', availability: 'all', status: 'all' }
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
      imagePath: null,
      updated: String(row.updated_at || row.created_at || '').slice(0, 10) || '—'
    };
  }
  async function load() {
    var columns = 'id,public_id,sku,product_name,category,subcategory,metal,diamond_weight,availability,price,currency,featured,active,updated_at,created_at';
    var result = await window.ngdSupabase.from('jewellery').select(columns)
      .is('archived_at', null).order('updated_at', { ascending: false });
    if (result.error) throw result.error;
    var rows = (result.data || []).map(mapRow);
    await attachPrimaryImages(rows);
    return rows;
  }
  /** Primary photo per piece from public.jewellery_images. A missing table
      must never break the inventory — failures only fall back to art. */
  async function attachPrimaryImages(rows) {
    if (!rows.length) return;
    try {
      var res = await window.ngdSupabase.from('jewellery_images')
        .select('jewellery_id,image_path').eq('is_primary', true);
      if (res.error) throw res.error;
      var byId = {};
      (res.data || []).forEach(function (img) { byId[img.jewellery_id] = img.image_path; });
      rows.forEach(function (row) { row.imagePath = byId[row.id] || null; });
    } catch (err) {
      console.warn('[NGD Admin] jewellery primary images unavailable:', err);
    }
  }

  /* ---------------- live mutations ---------------- */

  function toast(message, type) {
    var box = $('adm-toast');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + (type || 'info');
    div.setAttribute('role', 'status');
    div.textContent = message;
    box.appendChild(div);
  }
  function safeMutationError(err) {
    console.error('[NGD Admin] jewellery update failed:', err);
    return 'The inventory change could not be saved. Check your connection and try again.';
  }
  async function mutateRow(row, changes, success) {
    if (state.mutating) return;
    state.mutating = true;
    try {
      changes.updated_at = new Date().toISOString();
      var res = await window.ngdSupabase.from('jewellery').update(changes)
        .eq('public_id', row.publicId).eq('id', row.id).select('id');
      if (res.error) throw res.error;
      if (!res.data || res.data.length !== 1) throw new Error('record verification failed');
      await reload();
      toast(row.sku + ' ' + success + '.', 'success');
    } catch (err) {
      toast(safeMutationError(err), 'danger');
    } finally {
      state.mutating = false;
    }
  }
  function toggleFeatured(row) {
    return mutateRow(row, { featured: !row.featured }, row.featured ? 'was unfeatured' : 'is now featured');
  }
  function toggleActive(row) {
    if (row.active && !window.confirm('Deactivate ' + row.sku + '? It will no longer be visible to customers.')) return;
    return mutateRow(row, { active: !row.active }, row.active ? 'was deactivated' : 'was activated');
  }
  function archiveRow(row) {
    if (!window.confirm('Archive ' + row.sku + '? It will be deactivated and removed from this list.')) return;
    return mutateRow(row, { archived_at: new Date().toISOString(), active: false }, 'was archived');
  }

  /* ---------------- filtering + rendering ---------------- */

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
    'updated-desc': function (a, b) { return b.updated.localeCompare(a.updated) || a.sku.localeCompare(b.sku); },
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
  function art(row) {
    return (window.NGD_JEWEL_ART || {})[String(row.category).toLowerCase()] || '';
  }
  /** The real primary photo from Storage when one exists, category art otherwise. */
  function thumbHtml(row) {
    if (row.imagePath && window.ngdStorageUrl) {
      var url = window.ngdStorageUrl('jewellery-images', row.imagePath);
      if (url) return '<img class="ngd-media-photo" src="' + escapeHtml(url) + '" alt="" loading="lazy">';
    }
    return art(row);
  }
  var ICONS = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="m13.5 6.5 3 3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1 0 11.4 0"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>'
  };
  function actionsHtml(row) {
    return '<div class="ngd-adm-actions">' +
      '<a class="ngd-icon-btn" href="edit-jewellery.html?id=' + encodeURIComponent(row.publicId) + '"' +
      ' title="Edit" aria-label="Edit ' + escapeHtml(row.sku) + '" data-adm-act="edit">' + ICONS.edit + '</a>' +
      '<button type="button" class="ngd-icon-btn' + (row.featured ? ' is-on' : '') + '"' +
      ' title="' + (row.featured ? 'Unfeature' : 'Feature') + '"' +
      ' aria-label="' + (row.featured ? 'Unfeature ' : 'Feature ') + escapeHtml(row.sku) + '"' +
      ' aria-pressed="' + row.featured + '" data-adm-act="feature">' + ICONS.star + '</button>' +
      '<button type="button" class="ngd-icon-btn' + (row.active ? '' : ' is-off') + '"' +
      ' title="' + (row.active ? 'Deactivate' : 'Activate') + '"' +
      ' aria-label="' + (row.active ? 'Deactivate ' : 'Activate ') + escapeHtml(row.sku) + '"' +
      ' aria-pressed="' + row.active + '" data-adm-act="active">' + ICONS.power + '</button>' +
      '<button type="button" class="ngd-icon-btn is-danger" title="Archive (never permanently deletes)"' +
      ' aria-label="Archive ' + escapeHtml(row.sku) + '" data-adm-act="archive">' + ICONS.archive + '</button>' +
      '</div>';
  }
  function tableHtml(rows) {
    return rows.map(function (row) {
      var c = chips(row);
      return '<tr data-adm-row="' + escapeHtml(row.sku) + '"' + (row.active ? '' : ' class="is-inactive"') + '>' +
        '<td><span class="ngd-req-thumb">' + thumbHtml(row) + '</span></td>' +
        '<td class="ngd-stock-cell">' + escapeHtml(row.sku) + '</td><td>' + escapeHtml(row.name) +
        '</td><td>' + escapeHtml(row.category) + '</td><td>' + escapeHtml(row.subcategory) +
        '</td><td>' + escapeHtml(row.metal) + '</td><td>' + (row.weight === null ? '—' : row.weight.toFixed(2) + ' ct') +
        '</td><td>' + c.availability + '</td><td>' + price(row) + '</td><td>' + c.featured +
        '</td><td>' + c.active + '</td><td class="text-nowrap">' + escapeHtml(row.updated) +
        '</td><td>' + actionsHtml(row) + '</td></tr>';
    }).join('');
  }
  function cardsHtml(rows) {
    return rows.map(function (row) { var c = chips(row); return '<article class="ngd-req-card" data-adm-row="' + escapeHtml(row.sku) + '">' +
      '<div class="d-flex align-items-center gap-3"><span class="ngd-req-thumb">' + thumbHtml(row) + '</span>' +
      '<div class="flex-grow-1 min-w-0"><strong>' +
      escapeHtml(row.name) + '</strong><span class="ngd-text-muted d-block small">' + escapeHtml(row.sku) +
      ' · ' + escapeHtml(row.category) + ' · ' + escapeHtml(row.subcategory) + '</span></div></div><div class="mt-2">' +
      escapeHtml(row.metal) + ' · ' + (row.weight === null ? '—' : row.weight.toFixed(2) + ' ct') + ' · ' + price(row) +
      '</div><div class="d-flex flex-wrap gap-2 mt-2">' + c.availability + c.featured + c.active +
      '</div><small class="ngd-text-muted">Updated ' + escapeHtml(row.updated) + '</small>' +
      '<div class="mt-2">' + actionsHtml(row) + '</div></article>'; }).join('');
  }
  function bindActions(root) {
    root.querySelectorAll('[data-adm-act]').forEach(function (el) {
      var act = el.getAttribute('data-adm-act');
      if (act === 'edit') return; /* real navigation */
      el.addEventListener('click', function () {
        var sku = el.closest('[data-adm-row]').getAttribute('data-adm-row');
        var row = state.rows.find(function (r) { return r.sku === sku; });
        if (!row) return;
        if (act === 'feature') toggleFeatured(row);
        else if (act === 'active') toggleActive(row);
        else if (act === 'archive') archiveRow(row);
      });
    });
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
    bindActions($('adm-table-body')); bindActions($('adm-cards-wrap'));
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
  function bind() {
    if (state.bound) return; state.bound = true;
    $('adm-search').addEventListener('input', function () { state.query = this.value; state.page = 1; render(); });
    $('adm-sort').addEventListener('change', function () { state.sort = this.value; render(); });
    [['adm-f-category', 'category'], ['adm-f-availability', 'availability'], ['adm-f-status', 'status']].forEach(function (p) { $(p[0]).addEventListener('change', function () { state.filters[p[1]] = this.value; state.page = 1; render(); }); });
    $('adm-clear').addEventListener('click', function () { state.query = ''; $('adm-search').value = ''; Object.keys(state.filters).forEach(function (k) { state.filters[k] = 'all'; }); ['adm-f-category', 'adm-f-availability', 'adm-f-status'].forEach(function (id) { $(id).value = 'all'; }); render(); });
    $('adm-retry').addEventListener('click', reload);
  }
  async function reload() { setUi('loading'); try { state.rows = await load(); populate('adm-f-category', 'category'); populate('adm-f-availability', 'availability'); setUi(state.rows.length ? 'rows' : 'empty'); } catch (error) { console.error('[NGD Admin] jewellery load failed:', error); setUi('error'); } }
  async function init() {
    var auth = await window.NGDAuth.requireAdmin(); if (!auth) return;
    bind(); await reload();
    var params = new URLSearchParams(location.search);
    var added = params.get('added');
    if (added && state.ui === 'rows') toast(added + ' was added to the inventory.', 'success');
    var updated = params.get('updated');
    if (updated && state.ui === 'rows') toast(updated + ' was updated successfully.', 'success');
    var archived = params.get('archived');
    if (archived) toast(archived + ' was archived and removed from the normal inventory.', 'success');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
