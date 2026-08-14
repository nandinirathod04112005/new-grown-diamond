/* ============================================================
   NEW GROWN DIAMOND — CUSTOMER FAVOURITES (STEP 21 UI)
   ------------------------------------------------------------
   Guarded by requireCustomer(). DEMO ONLY beyond the guard:
   no favourites backend exists, so this page renders a sample
   list resolved from the public demo catalogue and says so in
   the on-page notice. Removing an item updates ONLY this
   in-memory preview (with Undo); nothing is stored or deleted
   anywhere and the samples return on reload.

   FUTURE SUPABASE SEAM
   --------------------
   Replace loadFavourites() with a select from a `favourites`
   table (user_id, item_type, item_id, created_at) joined to the
   catalogue, and removeFavourite() with the matching delete.
   The rendering, tabs, search and sort need no changes.
   ============================================================ */
(function () {
  'use strict';

  /* Saved order = recency (first item is the most recent save). */
  var DEMO_FAVOURITES = [
    { type: 'diamond', id: 'NGD-1007' },
    { type: 'jewellery', id: 'JW-1003' },
    { type: 'diamond', id: 'NGD-1015' },
    { type: 'diamond', id: 'NGD-1003' },
    { type: 'jewellery', id: 'JW-1008' },
    { type: 'diamond', id: 'NGD-1022' },
    { type: 'jewellery', id: 'JW-1012' }
  ];

  var state = {
    items: [],        /* resolved favourites, saved order */
    tab: 'all',
    query: '',
    sort: 'recent',
    lastRemoved: null /* { entry, index } for Undo */
  };

  function $(id) {
    return document.getElementById(id);
  }

  /** Future-backend seam: today resolves the demo list. */
  function loadFavourites() {
    var diamonds = window.NGD_DEMO_DIAMONDS || [];
    var pieces = window.NGD_DEMO_JEWELLERY || [];
    return DEMO_FAVOURITES.map(function (fav, i) {
      var record = fav.type === 'diamond'
        ? diamonds.find(function (d) { return d.id === fav.id; })
        : pieces.find(function (p) { return p.id === fav.id; });
      return record ? { type: fav.type, record: record, savedIndex: i } : null;
    }).filter(Boolean);
  }

  /** Future-backend seam: today it only edits the in-memory preview. */
  function removeFavourite(item) {
    var index = state.items.indexOf(item);
    if (index === -1) return;
    state.items.splice(index, 1);
    state.lastRemoved = { entry: item, index: index };
    showToast(item);
    apply();
  }

  function restoreLast() {
    var last = state.lastRemoved;
    if (!last) return;
    state.items.splice(Math.min(last.index, state.items.length), 0, last.entry);
    state.lastRemoved = null;
    clearToast();
    apply();
  }

  /* ---------------- toast ---------------- */

  function showToast(item) {
    var box = $('fav-toast');
    if (!box) return;
    var label = item.type === 'diamond' ? item.record.id : item.record.name;
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-info d-flex flex-wrap align-items-center gap-2';
    div.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.textContent = label +
      ' removed from this demo preview — nothing was saved or deleted on any server.';
    var undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'ngd-link btn btn-link p-0 border-0 align-baseline';
    undo.id = 'fav-undo';
    undo.textContent = 'Undo';
    undo.addEventListener('click', restoreLast);
    div.appendChild(text);
    div.appendChild(undo);
    box.appendChild(div);
  }

  function clearToast() {
    var box = $('fav-toast');
    if (box) box.innerHTML = '';
  }

  /* ---------------- filtering + sorting ---------------- */

  function haystack(item) {
    var r = item.record;
    return item.type === 'diamond'
      ? [r.id, r.shape, r.colour, r.clarity, r.lab].join(' ').toLowerCase()
      : [r.id, r.name, r.category].join(' ').toLowerCase();
  }

  function caratOf(item) {
    return item.type === 'diamond'
      ? item.record.carat
      : (item.record.weightCt || 0);
  }

  function nameOf(item) {
    return item.type === 'diamond' ? item.record.id : item.record.name;
  }

  var SORTS = {
    recent: function (a, b) { return a.savedIndex - b.savedIndex; },
    name: function (a, b) { return nameOf(a).localeCompare(nameOf(b)); },
    'carat-desc': function (a, b) { return caratOf(b) - caratOf(a); },
    'carat-asc': function (a, b) { return caratOf(a) - caratOf(b); }
  };

  function visibleItems() {
    var q = state.query.trim().toLowerCase();
    return state.items
      .filter(function (item) {
        if (state.tab !== 'all' && item.type !== state.tab) return false;
        return !q || haystack(item).indexOf(q) !== -1;
      })
      .sort(SORTS[state.sort] || SORTS.recent);
  }

  /* ---------------- rendering ---------------- */

  var COL = 'col-12 col-sm-6 col-xl-4 col-xxl-3';

  function diamondCard(item) {
    var d = item.record;
    var art = (window.NGD_GEM_ART || {})[d.shape.toLowerCase()] || '';
    var availCls = d.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return (
      '<div class="' + COL + '">' +
      '<article class="ngd-card ngd-card-dark ngd-card-3d ngd-diamond-card ngd-fav-card h-100" data-ngd-tilt ' +
      'data-fav-type="diamond" data-fav-id="' + d.id + '">' +
      '<div class="ngd-diamond-media ngd-depth-1">' +
      '<span class="ngd-demo-chip ngd-fav-chip">Demo</span>' + art + '</div>' +
      '<div class="ngd-diamond-body">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2">' +
      '<h2 class="ngd-diamond-title">' + d.shape + '</h2>' +
      '<span class="ngd-diamond-carat">' + d.carat.toFixed(2) + ' ct</span>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-1">' +
      '<span class="ngd-stock-no">' + d.id + '</span>' +
      '<span class="ngd-avail ' + availCls + '">' + d.availability + '</span>' +
      '</div>' +
      '<dl class="ngd-diamond-specs">' +
      '<div><dt>Shape</dt><dd>' + d.shape + '</dd></div>' +
      '<div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + d.colour + '</dd></div>' +
      '<div><dt>Clarity</dt><dd>' + d.clarity + '</dd></div>' +
      '<div><dt>Laboratory</dt><dd>' + d.lab + '</dd></div>' +
      '<div><dt>Growth</dt><dd>' + d.growth + '</dd></div>' +
      '</dl>' +
      '<div class="ngd-fav-actions mt-3">' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm" href="../diamond-details.html?id=' +
        encodeURIComponent(d.id) + '">View Details</a>' +
      '<button type="button" class="ngd-btn ngd-btn-ghost ngd-btn-sm" data-fav-remove>' +
      'Remove</button>' +
      '</div>' +
      '</div></article></div>'
    );
  }

  function jewelleryCard(item) {
    var p = item.record;
    var art = (window.NGD_JEWEL_ART || {})[p.category.toLowerCase()] || '';
    var availCls = p.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    var weight = p.weightCt != null
      ? '<span class="ngd-weight-chip">' + p.weightCt.toFixed(2) + ' ct diamonds</span>'
      : '';
    return (
      '<div class="' + COL + '">' +
      '<article class="ngd-card ngd-card-3d ngd-jewel-card ngd-fav-card h-100" data-ngd-tilt ' +
      'data-fav-type="jewellery" data-fav-id="' + p.id + '">' +
      '<div class="ngd-jewel-media">' +
      '<span class="ngd-demo-chip ngd-fav-chip">Demo</span>' +
      '<div class="ngd-jewel-figure">' + art + '</div>' +
      '</div>' +
      '<div class="ngd-jewel-body">' +
      '<p class="ngd-jewel-cat">' + p.category + '</p>' +
      '<h2 class="ngd-jewel-name">' + p.name + '</h2>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3">' +
      '<span class="ngd-avail ' + availCls + '">' + p.availability + '</span>' + weight +
      '</div>' +
      '<div class="ngd-fav-actions mt-auto">' +
      '<a class="ngd-btn ngd-btn-outline ngd-btn-sm" href="../jewellery-details.html?id=' +
        encodeURIComponent(p.id) + '">View Details</a>' +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-fav-remove>' +
      'Remove</button>' +
      '</div>' +
      '</div></article></div>'
    );
  }

  function apply() {
    var grid = $('fav-grid');
    var visible = visibleItems();
    var total = state.items.length;

    grid.innerHTML = visible.map(function (item) {
      return item.type === 'diamond' ? diamondCard(item) : jewelleryCard(item);
    }).join('');

    if (window.NGDTilt) window.NGDTilt(grid);

    grid.querySelectorAll('[data-fav-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('[data-fav-id]');
        var match = state.items.find(function (item) {
          return item.type === card.getAttribute('data-fav-type') &&
            item.record.id === card.getAttribute('data-fav-id');
        });
        if (match) removeFavourite(match);
      });
    });

    var diamonds = state.items.filter(function (i) { return i.type === 'diamond'; }).length;
    $('fav-count').textContent = total === 0
      ? 'No favourites'
      : 'Showing ' + visible.length + ' of ' + total +
        ' — ' + diamonds + ' diamonds · ' + (total - diamonds) + ' jewellery';

    $('fav-empty').hidden = total !== 0;
    $('fav-no-match').hidden = !(total > 0 && visible.length === 0);
    grid.hidden = visible.length === 0;
  }

  /* ---------------- wiring ---------------- */

  function initToolbar() {
    document.querySelectorAll('[data-fav-tab]').forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        state.tab = tabBtn.getAttribute('data-fav-tab');
        document.querySelectorAll('[data-fav-tab]').forEach(function (b) {
          var on = b === tabBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        apply();
      });
    });

    $('fav-search').addEventListener('input', function () {
      state.query = this.value;
      apply();
    });

    $('fav-sort').addEventListener('change', function () {
      state.sort = this.value;
      apply();
    });

    $('fav-clear-search').addEventListener('click', function () {
      state.query = '';
      $('fav-search').value = '';
      apply();
    });
  }

  function fill(field, value) {
    document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  async function init() {
    var res = await window.NGDAuth.requireCustomer();
    if (!res) return; // a redirect is already happening

    var fullName = (res.profile.full_name || '').trim();
    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');

    state.items = loadFavourites();
    initToolbar();
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
