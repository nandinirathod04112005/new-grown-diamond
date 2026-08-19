/* ============================================================
   NEW GROWN DIAMOND — JEWELLERY LISTING CONTROLLER
   ------------------------------------------------------------
   Vanilla-JS listing over the static demo dataset in
   jewellery-data.js: search, category chips, sorting and
   pagination all run client-side.

   Supabase-ready: loadJewellery() is the single data seam —
   the future phase swaps its body for a `jewellery` table
   select without touching the state or rendering logic.
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('jw-grid');
  if (!grid) return; // listing page only

  /* ---------- data source ---------- */
  async function loadJewellery() {
    if (!window.ngdSupabase) return window.NGD_DEMO_JEWELLERY || [];
    var result = await window.ngdSupabase.from('jewellery')
      .select('id,public_id,sku,product_name,category,subcategory,short_description,full_description,metal,metal_karat,metal_colour,gross_weight,diamond_weight,diamond_pieces,diamond_quality,diamond_shape,certificate_number,size,availability,featured,jewellery_images(id,image_path,sort_order,is_primary)')
      .eq('active', true).order('featured', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []).map(function (r) { return {
      dbId: r.id, id: r.public_id || r.sku, sku: r.sku, name: r.product_name,
      category: r.category, subcategory: r.subcategory || '', description: r.short_description || '',
      fullDesc: r.full_description || '', metal: r.metal || '', metalKarat: r.metal_karat || '',
      metalColour: r.metal_colour || '', grossWeight: Number(r.gross_weight || 0),
      weightCt: r.diamond_weight == null ? null : Number(r.diamond_weight), diamondPieces: Number(r.diamond_pieces || 0),
      diamondQuality: r.diamond_quality, diamondShape: r.diamond_shape, certificateNo: r.certificate_number,
      size: r.size || '', availability: r.availability || 'Made to Order', featured: !!r.featured, images: r.jewellery_images || []
    }; });
  }

  var DATA = [];
  var PAGE_SIZE = 8;
  var CATEGORIES = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];

  var state = { search: '', category: '', sort: 'featured', page: 1 };

  var el = {
    search: document.getElementById('jw-search'),
    sort: document.getElementById('jw-sort'),
    chips: document.getElementById('jw-chips'),
    count: document.getElementById('jw-count'),
    grid: grid,
    empty: document.getElementById('jw-empty'),
    pagination: document.getElementById('jw-pagination'),
    results: document.getElementById('jw-results')
  };

  /* ---------- category chips ---------- */
  el.chips.innerHTML = [''].concat(CATEGORIES).map(function (cat) {
    var label = cat === '' ? 'All' : cat;
    return (
      '<button type="button" class="ngd-chip" data-category="' + cat + '" ' +
      'aria-pressed="false">' + label + '</button>'
    );
  }).join('');

  function renderChips() {
    el.chips.querySelectorAll('.ngd-chip').forEach(function (chip) {
      var on = chip.getAttribute('data-category') === state.category;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  }

  el.chips.addEventListener('click', function (event) {
    var chip = event.target.closest('.ngd-chip');
    if (!chip) return;
    state.category = chip.getAttribute('data-category');
    state.page = 1;
    apply();
  });

  /* ---------- filtering / sorting ---------- */
  function matches(p) {
    if (state.category && p.category !== state.category) return false;
    if (state.search) {
      var q = state.search.toLowerCase();
      if (
        p.name.toLowerCase().indexOf(q) === -1 &&
        p.category.toLowerCase().indexOf(q) === -1 &&
        p.id.toLowerCase().indexOf(q) === -1
      ) return false;
    }
    return true;
  }

  var SORTS = {
    'featured': null,
    'name-asc': function (a, b) { return a.name.localeCompare(b.name); },
    'weight-desc': function (a, b) {
      return (b.weightCt === null ? -1 : b.weightCt) - (a.weightCt === null ? -1 : a.weightCt);
    },
    'weight-asc': function (a, b) {
      return (a.weightCt === null ? Infinity : a.weightCt) - (b.weightCt === null ? Infinity : b.weightCt);
    }
  };

  /* ---------- renderers (shared card lives in jewellery-card.js) ---------- */
  var shared = window.NGDJewelCard;
  var cardHtml = shared.cardHtml;

  function renderPagination(totalPages) {
    if (totalPages <= 1) { el.pagination.innerHTML = ''; return; }
    var page = state.page;
    var items = [];

    items.push('<li><button type="button" class="ngd-page-btn" data-page="' + (page - 1) + '"' +
      (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button></li>');

    var shown = [];
    for (var p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) shown.push(p);
    }
    var last = 0;
    shown.forEach(function (p) {
      if (p - last > 1) items.push('<li><span class="ngd-page-gap" aria-hidden="true">…</span></li>');
      items.push('<li><button type="button" class="ngd-page-btn' + (p === page ? ' is-active" aria-current="page' : '') +
        '" data-page="' + p + '">' + p + '</button></li>');
      last = p;
    });

    items.push('<li><button type="button" class="ngd-page-btn" data-page="' + (page + 1) + '"' +
      (page === totalPages ? ' disabled' : '') + ' aria-label="Next page">›</button></li>');

    el.pagination.innerHTML = items.join('');
  }

  function apply(scrollToResults) {
    var filtered = DATA.filter(matches);
    var sorter = SORTS[state.sort];
    if (sorter) filtered = filtered.slice().sort(sorter);

    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    el.count.textContent = total === 0
      ? 'No pieces match your search'
      : 'Showing ' + (start + 1) + '–' + (start + pageItems.length) + ' of ' + total +
        (total === 1 ? ' piece' : ' pieces');

    el.grid.classList.toggle('d-none', total === 0);
    el.empty.classList.toggle('d-none', total !== 0);

    el.grid.innerHTML = pageItems.map(cardHtml).join('');
    if (window.NGDTilt) window.NGDTilt(el.grid);

    renderPagination(totalPages);
    renderChips();

    if (scrollToResults && el.results) {
      el.results.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  /* ---------- events ---------- */
  var searchTimer = null;
  el.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.search = el.search.value.trim();
      state.page = 1;
      apply();
    }, 140);
  });

  el.sort.addEventListener('change', function () {
    state.sort = el.sort.value;
    state.page = 1;
    apply();
  });

  el.pagination.addEventListener('click', function (event) {
    var btn = event.target.closest('.ngd-page-btn');
    if (!btn || btn.disabled) return;
    var page = parseInt(btn.getAttribute('data-page'), 10);
    if (!isNaN(page) && page !== state.page) {
      state.page = page;
      apply(true);
    }
  });

  document.getElementById('jw-empty-clear').addEventListener('click', function () {
    state.search = '';
    state.category = '';
    el.search.value = '';
    state.page = 1;
    apply();
  });

  /* ---------- ?category= deep links (homepage + footer) ---------- */
  var params = new URLSearchParams(window.location.search);
  var catParam = (params.get('category') || '').toLowerCase();
  if (catParam) {
    var match = CATEGORIES.filter(function (c) { return c.toLowerCase() === catParam; })[0];
    if (match) state.category = match;
  }

  loadJewellery().then(function (rows) { DATA = rows; apply(); }).catch(function (error) {
    console.error('[NGD Jewellery] public listing load failed:', error);
    el.count.textContent = 'We couldn’t load jewellery. Please refresh and try again.';
    el.grid.classList.add('d-none'); el.empty.classList.remove('d-none');
  });
})();
