/* ============================================================
   NEW GROWN DIAMOND — JEWELLERY LISTING CONTROLLER (LIVE)
   ------------------------------------------------------------
   The public collection reads the REAL public.jewellery table
   through the shared Supabase client: only active, non-archived
   pieces, selected with an explicit storefront column list (no
   internal notes, no creator ids — RLS remains the enforcement),
   each carrying its PRIMARY photo from public.jewellery_images.
   Search, category chips, sorting and pagination run client-side
   over the loaded rows; loading / empty / error states are real
   and Retry re-queries. Demo data is gone.
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('jw-grid');
  if (!grid) return; // listing page only

  /* ---------- live data source ---------- */

  var AVAIL_LABELS = { available: 'In Stock', made_to_order: 'Made to Order', sold: 'Sold' };

  /* Storefront columns only — internal_notes / created_by are never
     requested by the public pages. */
  var COLUMNS = 'id,public_id,sku,product_name,category,subcategory,short_description,' +
    'diamond_weight,availability,featured,created_at';

  function mapRow(p) {
    return {
      id: p.sku || p.public_id || '—',
      publicId: p.public_id || '',
      rowId: p.id,
      name: p.product_name || '—',
      category: p.category || 'Other',
      subcategory: p.subcategory || '',
      description: p.short_description || '',
      weightCt: p.diamond_weight === null || p.diamond_weight === undefined
        ? null : Number(p.diamond_weight),
      availability: AVAIL_LABELS[p.availability] || p.availability || 'On Request',
      image_path: null,
      featured: !!p.featured
    };
  }

  /** Only what the storefront may show: active, never archived — each
      piece with its primary photo (category art when it has none). */
  async function loadJewellery() {
    var res = await window.ngdSupabase.from('jewellery').select(COLUMNS)
      .eq('active', true).is('archived_at', null)
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    var rows = (res.data || []).map(mapRow);
    if (rows.length) {
      try {
        var imgs = await window.ngdSupabase.from('jewellery_images')
          .select('jewellery_id,image_path').eq('is_primary', true);
        if (imgs.error) throw imgs.error;
        var byId = {};
        (imgs.data || []).forEach(function (img) { byId[img.jewellery_id] = img.image_path; });
        rows.forEach(function (row) { row.image_path = byId[row.rowId] || null; });
      } catch (err) {
        /* photos are an enhancement — the collection still renders */
        console.warn('[NGD Jewellery] primary images unavailable:', err);
      }
    }
    return rows;
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
    none: document.getElementById('jw-none'),
    loading: document.getElementById('jw-loading'),
    error: document.getElementById('jw-error'),
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

    var catalogueEmpty = DATA.length === 0;
    el.count.textContent = catalogueEmpty
      ? 'No pieces in the collection yet'
      : total === 0
        ? 'No pieces match your search'
        : 'Showing ' + (start + 1) + '–' + (start + pageItems.length) + ' of ' + total +
          (total === 1 ? ' piece' : ' pieces');

    el.grid.classList.toggle('d-none', total === 0);
    el.none.classList.toggle('d-none', !catalogueEmpty);
    el.empty.classList.toggle('d-none', catalogueEmpty || total !== 0);

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

  /* ---------- real load lifecycle ---------- */
  function setStage(stage) {
    el.loading.classList.toggle('d-none', stage !== 'loading');
    el.error.classList.toggle('d-none', stage !== 'error');
    if (stage !== 'ready') {
      el.grid.classList.add('d-none');
      el.empty.classList.add('d-none');
      el.none.classList.add('d-none');
      el.pagination.innerHTML = '';
      el.count.textContent = stage === 'loading'
        ? 'Loading the collection…'
        : 'The collection could not be loaded';
      renderChips();
    }
  }

  async function boot() {
    setStage('loading');
    try {
      DATA = await loadJewellery();
    } catch (err) {
      /* customers never see raw Supabase internals */
      console.error('[NGD Jewellery] load failed:', err);
      setStage('error');
      return;
    }
    setStage('ready');
    apply();
  }

  document.getElementById('jw-retry').addEventListener('click', boot);

  boot();
})();
