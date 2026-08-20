/* Customer favourites page backed by Supabase and protected by RLS. */
(function () {
  'use strict';
  var state = { items: [], tab: 'all', query: '', sort: 'recent' };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (value) { var el = document.createElement('span'); el.textContent = value == null ? '' : String(value); return el.innerHTML; };

  function value(row, names, fallback) {
    for (var i = 0; i < names.length; i++) if (row[names[i]] != null) return row[names[i]];
    return fallback;
  }

  function normalize(row) {
    var type = row.product_type;
    var record = type === 'diamond' ? row.diamonds : row.jewellery;
    if (!record) return null;
    return { id: row.id, type: type, productId: type === 'diamond' ? row.diamond_id : row.jewellery_id,
      createdAt: row.created_at, record: record };
  }

  async function loadFavourites(user) {
    var result = await window.ngdSupabase.from('favourites')
      .select('id,product_type,diamond_id,jewellery_id,created_at,diamonds(*),jewellery(*)')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []).map(normalize).filter(Boolean);
  }

  async function removeFavourite(item) {
    var button = document.querySelector('[data-fav-row="' + item.id + '"] [data-fav-remove]');
    if (button) button.disabled = true;
    try {
      await window.NGDFavourites.remove(item.type, item.productId);
      state.items = state.items.filter(function (entry) { return entry.id !== item.id; });
      apply();
    } catch (error) {
      if (button) button.disabled = false;
      console.error('[NGD Favourites]', error);
      showError('We could not remove that favourite. Please try again.');
    }
  }

  function showError(message) {
    $('fav-toast').innerHTML = '<div class="ngd-alert ngd-alert-danger" role="alert">' + esc(message) + '</div>';
  }

  function visibleItems() {
    var q = state.query.trim().toLowerCase();
    return state.items.filter(function (item) {
      if (state.tab !== 'all' && state.tab !== item.type) return false;
      var r = item.record;
      var text = item.type === 'diamond'
        ? [value(r, ['stock_number', 'stock_no', 'id'], ''), r.shape, r.colour, r.clarity].join(' ')
        : [value(r, ['sku', 'id'], ''), value(r, ['product_name', 'name'], ''), r.category].join(' ');
      return !q || text.toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      if (state.sort === 'recent') return String(b.createdAt).localeCompare(String(a.createdAt));
      var ar = a.record, br = b.record;
      if (state.sort === 'name') return name(a).localeCompare(name(b));
      var aw = Number(value(ar, ['carat', 'diamond_weight', 'weight_ct'], 0));
      var bw = Number(value(br, ['carat', 'diamond_weight', 'weight_ct'], 0));
      return state.sort === 'carat-desc' ? bw - aw : aw - bw;
    });
  }

  function name(item) {
    return item.type === 'diamond'
      ? value(item.record, ['stock_number', 'stock_no', 'id'], 'Diamond')
      : value(item.record, ['product_name', 'name', 'sku'], 'Jewellery');
  }

  function media(r, fallback) {
    var url = value(r, ['image_url', 'primary_image_url', 'image'], '');
    return url ? '<img src="' + esc(url) + '" alt="" loading="lazy">' : fallback;
  }

  function card(item) {
    var r = item.record;
    var diamond = item.type === 'diamond';
    var ref = diamond ? value(r, ['stock_number', 'stock_no', 'id'], '') : value(r, ['sku', 'id'], '');
    var title = diamond ? [value(r, ['shape'], 'Diamond'), value(r, ['carat'], '') ? Number(r.carat).toFixed(2) + ' ct' : ''].join(' · ') : value(r, ['product_name', 'name'], 'Jewellery');
    var category = diamond ? value(r, ['diamond_type', 'type', 'shape'], 'Diamond') : value(r, ['category', 'type'], 'Jewellery');
    var art = diamond ? ((window.NGD_GEM_ART || {})[String(r.shape || '').toLowerCase()] || '') : ((window.NGD_JEWEL_ART || {})[String(r.category || '').toLowerCase()] || '');
    /* The details pages resolve only immutable DIA-/JEW- public ids. */
    var details = diamond ? '../diamond-details.html?id=' : '../jewellery-details.html?id=';
    var detailsRef = value(r, ['public_id'], '') || ref || item.productId;
    return '<div class="col-12 col-sm-6 col-xl-4 col-xxl-3"><article class="ngd-card ngd-fav-card h-100" data-fav-row="' + esc(item.id) + '">' +
      '<div class="' + (diamond ? 'ngd-diamond-media' : 'ngd-jewel-media') + '">' + media(r, art) + '</div>' +
      '<div class="' + (diamond ? 'ngd-diamond-body' : 'ngd-jewel-body') + '"><p class="ngd-jewel-cat">' + esc(category) + '</p>' +
      '<h2 class="ngd-title fs-5">' + esc(title) + '</h2><p class="ngd-stock-no">' + esc(ref) + '</p>' +
      '<div class="ngd-fav-actions mt-3"><a class="ngd-btn ngd-btn-gold ngd-btn-sm" href="' + details + encodeURIComponent(detailsRef) + '">View Details</a>' +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-fav-remove aria-label="Remove from favourites">Remove</button></div></div></article></div>';
  }

  function apply() {
    var visible = visibleItems(), total = state.items.length;
    $('fav-grid').innerHTML = visible.map(card).join('');
    $('fav-grid').hidden = visible.length === 0;
    $('fav-empty').hidden = total !== 0;
    $('fav-no-match').hidden = !(total && !visible.length);
    var diamonds = state.items.filter(function (x) { return x.type === 'diamond'; }).length;
    $('fav-count').textContent = total ? 'Showing ' + visible.length + ' of ' + total + ' — ' + diamonds + ' diamonds · ' + (total - diamonds) + ' jewellery' : 'No favourites';
    document.querySelectorAll('[data-fav-remove]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.closest('[data-fav-row]').getAttribute('data-fav-row');
        var item = state.items.find(function (x) { return x.id === id; });
        if (item) removeFavourite(item);
      });
    });
  }

  function wire() {
    document.querySelectorAll('[data-fav-tab]').forEach(function (button) { button.addEventListener('click', function () {
      state.tab = button.getAttribute('data-fav-tab');
      document.querySelectorAll('[data-fav-tab]').forEach(function (b) { b.classList.toggle('is-active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); apply();
    }); });
    $('fav-search').addEventListener('input', function () { state.query = this.value; apply(); });
    $('fav-sort').addEventListener('change', function () { state.sort = this.value; apply(); });
    $('fav-clear-search').addEventListener('click', function () { state.query = ''; $('fav-search').value = ''; apply(); });
  }

  async function init() {
    var auth = await window.NGDAuth.requireCustomer();
    if (!auth) return;
    var fullName = String(auth.profile.full_name || '').trim();
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) { el.textContent = fullName ? fullName.split(/\s+/)[0] : 'there'; });
    wire();
    try { state.items = await loadFavourites(auth.user); apply(); }
    catch (error) { console.error('[NGD Favourites]', error); showError('We could not load your favourites. Please try again.'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
