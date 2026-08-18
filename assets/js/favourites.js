/* Customer favourites backed by public.favourites and Supabase Auth. */
(function () {
  'use strict';
  var state = { items: [], tab: 'all', query: '', sort: 'recent', user: null };
  function $(id) { return document.getElementById(id); }
  function esc(value) {
    var el = document.createElement('span');
    el.textContent = value == null ? '' : String(value);
    return el.innerHTML;
  }
  function first(row, names, fallback) {
    for (var i = 0; i < names.length; i++) if (row && row[names[i]] != null) return row[names[i]];
    return fallback;
  }
  function mapFavourite(favourite, index) {
    var type = favourite.product_type;
    var source = type === 'diamond' ? favourite.diamonds : favourite.jewellery;
    if (!source) return null;
    var record;
    if (type === 'diamond') {
      record = {
        uuid: source.id,
        id: first(source, ['stock_number', 'public_id'], source.id),
        shape: first(source, ['shape'], 'Diamond'), carat: Number(source.carat) || 0,
        colour: first(source, ['color', 'colour'], '—'), clarity: first(source, ['clarity'], '—'),
        lab: first(source, ['laboratory', 'lab'], '—'), growth: first(source, ['growth_method', 'growth'], '—'),
        availability: first(source, ['availability'], 'Available'),
        image: first(source, ['image_url', 'primary_image_url', 'thumbnail_url'], '')
      };
    } else {
      record = {
        uuid: source.id, id: first(source, ['sku', 'public_id'], source.id),
        name: first(source, ['product_name', 'name'], 'Jewellery'),
        category: first(source, ['category', 'product_type'], 'Jewellery'),
        availability: first(source, ['availability'], 'Available'),
        weightCt: source.diamond_weight != null ? Number(source.diamond_weight) :
          (source.total_diamond_weight != null ? Number(source.total_diamond_weight) :
            (source.weight_ct != null ? Number(source.weight_ct) : null)),
        image: first(source, ['image_url', 'primary_image_url', 'thumbnail_url'], '')
      };
    }
    return { id: favourite.id, type: type, record: record, savedIndex: index, createdAt: favourite.created_at };
  }
  async function loadFavourites() {
    var response = await window.ngdSupabase.from('favourites')
      .select('id,product_type,diamond_id,jewellery_id,created_at,diamonds(*),jewellery(*)')
      .eq('user_id', state.user.id).order('created_at', { ascending: false });
    if (response.error) throw response.error;
    return (response.data || []).map(mapFavourite).filter(Boolean);
  }
  function toast(message, type) {
    $('fav-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + (type || 'info') + '" role="status">' + esc(message) + '</div>';
  }
  async function removeFavourite(item, button) {
    button.disabled = true;
    var response = await window.ngdSupabase.from('favourites').delete()
      .eq('id', item.id).eq('user_id', state.user.id);
    if (response.error) {
      button.disabled = false;
      toast('We could not remove that favourite. Please try again.', 'error');
      return;
    }
    state.items = state.items.filter(function (entry) { return entry.id !== item.id; });
    toast((item.type === 'diamond' ? item.record.id : item.record.name) + ' removed from favourites.');
    apply();
  }
  function imageHtml(record, fallback) {
    return record.image
      ? '<img src="' + esc(record.image) + '" alt="" loading="lazy">'
      : fallback;
  }
  function diamondCard(item) {
    var d = item.record;
    var art = (window.NGD_GEM_ART || {})[String(d.shape).toLowerCase()] || '';
    return '<div class="col-12 col-sm-6 col-xl-4 col-xxl-3"><article class="ngd-card ngd-card-dark ngd-diamond-card ngd-fav-card h-100" data-fav-id="' + esc(item.id) + '">' +
      '<div class="ngd-diamond-media ngd-depth-1">' + imageHtml(d, art) + '</div><div class="ngd-diamond-body">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2"><h2 class="ngd-diamond-title">' + esc(d.shape) + '</h2><span class="ngd-diamond-carat">' + d.carat.toFixed(2) + ' ct</span></div>' +
      '<div class="d-flex justify-content-between align-items-center mt-1"><span class="ngd-stock-no">' + esc(d.id) + '</span><span class="ngd-avail">' + esc(d.availability) + '</span></div>' +
      '<dl class="ngd-diamond-specs"><div><dt>Shape</dt><dd>' + esc(d.shape) + '</dd></div><div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div><div><dt>Colour</dt><dd>' + esc(d.colour) + '</dd></div><div><dt>Clarity</dt><dd>' + esc(d.clarity) + '</dd></div><div><dt>Laboratory</dt><dd>' + esc(d.lab) + '</dd></div><div><dt>Growth</dt><dd>' + esc(d.growth) + '</dd></div></dl>' +
      '<div class="ngd-fav-actions mt-3"><a class="ngd-btn ngd-btn-gold ngd-btn-sm" href="../diamond-details.html?id=' + encodeURIComponent(d.id) + '">View Details</a><button type="button" class="ngd-btn ngd-btn-ghost ngd-btn-sm" data-fav-remove>Remove from Favourites</button></div></div></article></div>';
  }
  function jewelleryCard(item) {
    var p = item.record;
    var art = (window.NGD_JEWEL_ART || {})[String(p.category).toLowerCase()] || '';
    var weight = p.weightCt == null ? '' : '<span class="ngd-weight-chip">' + p.weightCt.toFixed(2) + ' ct diamonds</span>';
    return '<div class="col-12 col-sm-6 col-xl-4 col-xxl-3"><article class="ngd-card ngd-jewel-card ngd-fav-card h-100" data-fav-id="' + esc(item.id) + '">' +
      '<div class="ngd-jewel-media"><div class="ngd-jewel-figure">' + imageHtml(p, art) + '</div></div><div class="ngd-jewel-body">' +
      '<p class="ngd-jewel-cat">' + esc(p.category) + '</p><h2 class="ngd-jewel-name">' + esc(p.name) + '</h2><p class="ngd-stock-no">SKU ' + esc(p.id) + '</p>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3"><span class="ngd-avail">' + esc(p.availability) + '</span>' + weight + '</div>' +
      '<div class="ngd-fav-actions mt-auto"><a class="ngd-btn ngd-btn-outline ngd-btn-sm" href="../jewellery-details.html?id=' + encodeURIComponent(p.id) + '">View Details</a><button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-fav-remove>Remove from Favourites</button></div></div></article></div>';
  }
  function nameOf(item) { return item.type === 'diamond' ? item.record.id : item.record.name; }
  function visibleItems() {
    var q = state.query.trim().toLowerCase();
    var rows = state.items.filter(function (item) {
      if (state.tab !== 'all' && item.type !== state.tab) return false;
      return !q || JSON.stringify(item.record).toLowerCase().indexOf(q) !== -1;
    });
    if (state.sort === 'name') rows.sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b)); });
    if (state.sort.indexOf('carat') === 0) rows.sort(function (a, b) {
      var av = a.type === 'diamond' ? a.record.carat : (a.record.weightCt || 0);
      var bv = b.type === 'diamond' ? b.record.carat : (b.record.weightCt || 0);
      return state.sort === 'carat-desc' ? bv - av : av - bv;
    });
    return rows;
  }
  function apply() {
    var visible = visibleItems();
    $('fav-grid').innerHTML = visible.map(function (item) { return item.type === 'diamond' ? diamondCard(item) : jewelleryCard(item); }).join('');
    $('fav-grid').querySelectorAll('[data-fav-remove]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.closest('[data-fav-id]').getAttribute('data-fav-id');
        var item = state.items.find(function (entry) { return entry.id === id; });
        if (item) removeFavourite(item, button);
      });
    });
    var diamonds = state.items.filter(function (item) { return item.type === 'diamond'; }).length;
    $('fav-count').textContent = state.items.length ? 'Showing ' + visible.length + ' of ' + state.items.length + ' — ' + diamonds + ' diamonds · ' + (state.items.length - diamonds) + ' jewellery' : 'No favourites';
    $('fav-empty').hidden = state.items.length !== 0;
    $('fav-no-match').hidden = !(state.items.length && !visible.length);
    $('fav-grid').hidden = !visible.length;
  }
  function bindToolbar() {
    document.querySelectorAll('[data-fav-tab]').forEach(function (button) { button.addEventListener('click', function () {
      state.tab = button.getAttribute('data-fav-tab');
      document.querySelectorAll('[data-fav-tab]').forEach(function (other) { other.classList.toggle('is-active', other === button); other.setAttribute('aria-pressed', String(other === button)); }); apply();
    }); });
    $('fav-search').addEventListener('input', function () { state.query = this.value; apply(); });
    $('fav-sort').addEventListener('change', function () { state.sort = this.value; apply(); });
    $('fav-clear-search').addEventListener('click', function () { state.query = ''; $('fav-search').value = ''; apply(); });
  }
  async function init() {
    var auth = await window.NGDAuth.requireCustomer();
    if (!auth) return;
    state.user = auth.user;
    var name = String(auth.profile.full_name || '').trim();
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) { el.textContent = name ? name.split(/\s+/)[0] : 'there'; });
    bindToolbar();
    try { state.items = await loadFavourites(); apply(); }
    catch (error) { console.error('[NGD Favourites] Load failed:', error); toast('We could not load your favourites. Please try again.', 'error'); apply(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
