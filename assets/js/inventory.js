/* ============================================================
   NEW GROWN DIAMOND — DIAMOND INVENTORY CONTROLLER (LIVE)
   ------------------------------------------------------------
   The public inventory reads the REAL public.diamonds table
   through the shared Supabase client: only active, non-archived
   stones, selected with an explicit storefront column list (no
   internal notes, no creator ids — RLS remains the enforcement).
   Search, filters, sorting, grid/table views and pagination run
   client-side over the loaded rows; loading / empty / error
   states are real and Retry re-queries. Demo data is gone.
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('inv-grid');
  if (!grid) return; // inventory page only

  /* Legacy deep links (old bookmarks): diamonds.html?id=… now
     lives on the details page. */
  var earlyParams = new URLSearchParams(window.location.search);
  var earlyId = earlyParams.get('id');
  if (earlyId) {
    window.location.replace('diamond-details.html?id=' + encodeURIComponent(earlyId));
    return;
  }

  /* ---------- live data source ---------- */

  /* Storefront columns only — internal_notes / created_by are never
     requested by the public pages. */
  var COLUMNS = 'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,' +
    'growth_method,availability,image_path,featured,created_at';

  function mapRow(d) {
    return {
      id: d.stock_number || d.public_id || '—',
      publicId: d.public_id || '',
      shape: d.shape || '—',
      carat: Number(d.carat) || 0,
      colour: d.color || '—',
      clarity: d.clarity || '—',
      cut: d.cut || '—',
      lab: d.laboratory || '—',
      growth: d.growth_method || '—',
      availability: d.availability || 'On Request',
      image_path: d.image_path || null,
      featured: !!d.featured
    };
  }

  /** Only what the storefront may show: active, never archived. */
  async function loadDiamonds() {
    var res = await window.ngdSupabase.from('diamonds').select(COLUMNS)
      .eq('active', true).is('archived_at', null)
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapRow);
  }

  var DATA = [];
  var PAGE_SIZE = 9;

  var FILTER_GROUPS = [
    { key: 'shape', label: 'Shape', options: ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise'] },
    { key: 'carat', label: 'Carat range', type: 'range' },
    { key: 'colour', label: 'Colour', options: ['D', 'E', 'F', 'G', 'H'] },
    { key: 'clarity', label: 'Clarity', options: ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'] },
    { key: 'cut', label: 'Cut', options: ['Ideal', 'Excellent', 'Very Good'] },
    { key: 'lab', label: 'Laboratory', options: ['IGI', 'GIA'] },
    { key: 'growth', label: 'Growth Method', options: ['CVD', 'HPHT'] },
    { key: 'availability', label: 'Availability', options: ['In Stock', 'On Request'] }
  ];

  var state = {
    search: '',
    picks: {},      // key → Set of selected option values
    caratMin: null,
    caratMax: null,
    sort: 'featured',
    view: 'grid',
    page: 1
  };
  FILTER_GROUPS.forEach(function (g) { if (g.options) state.picks[g.key] = new Set(); });

  /* ---------- element handles ---------- */
  var el = {
    search: document.getElementById('inv-search'),
    sort: document.getElementById('inv-sort'),
    count: document.getElementById('inv-count'),
    grid: grid,
    tableWrap: document.getElementById('inv-table-wrap'),
    tableBody: document.getElementById('inv-table-body'),
    empty: document.getElementById('inv-empty'),
    none: document.getElementById('inv-none'),
    loading: document.getElementById('inv-loading'),
    error: document.getElementById('inv-error'),
    pagination: document.getElementById('inv-pagination'),
    viewGrid: document.getElementById('inv-view-grid'),
    viewTable: document.getElementById('inv-view-table'),
    filterHostDesktop: document.getElementById('inv-filter-host'),
    filterHostMobile: document.getElementById('inv-filter-host-mobile'),
    filterBadge: document.getElementById('inv-filter-badge'),
    results: document.getElementById('inv-results')
  };

  /* ---------- build the (single) filter form ---------- */
  var form = document.createElement('form');
  form.id = 'inv-filters';
  form.className = 'ngd-form';
  form.setAttribute('novalidate', '');

  form.innerHTML = FILTER_GROUPS.map(function (g) {
    if (g.type === 'range') {
      return (
        '<fieldset class="ngd-filter-group">' +
        '<legend class="ngd-filter-legend">' + g.label + '</legend>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<input type="number" class="form-control form-control-sm" id="inv-carat-min" ' +
        'min="0" step="0.01" inputmode="decimal" placeholder="Min" aria-label="Minimum carat">' +
        '<span class="ngd-text-muted small">—</span>' +
        '<input type="number" class="form-control form-control-sm" id="inv-carat-max" ' +
        'min="0" step="0.01" inputmode="decimal" placeholder="Max" aria-label="Maximum carat">' +
        '</div></fieldset>'
      );
    }
    return (
      '<fieldset class="ngd-filter-group">' +
      '<legend class="ngd-filter-legend">' + g.label + '</legend>' +
      g.options.map(function (opt) {
        var id = 'inv-f-' + g.key + '-' + opt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return (
          '<div class="form-check">' +
          '<input class="form-check-input" type="checkbox" id="' + id + '" ' +
          'data-filter-key="' + g.key + '" value="' + opt + '">' +
          '<label class="form-check-label small" for="' + id + '">' + opt + '</label>' +
          '</div>'
        );
      }).join('') +
      '</fieldset>'
    );
  }).join('') +
  '<div class="pt-3"><button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-btn-block" id="inv-clear">Clear all filters</button></div>';

  /* One form, relocated between the desktop sidebar and the
     mobile offcanvas so state never needs syncing. */
  var desktopMQ = window.matchMedia('(min-width: 992px)');
  function placeForm() {
    var host = desktopMQ.matches ? el.filterHostDesktop : el.filterHostMobile;
    if (host && form.parentElement !== host) host.appendChild(form);
  }
  placeForm();
  if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', placeForm);

  /* ---------- filtering / sorting ---------- */
  function matches(d) {
    if (state.search) {
      var q = state.search.toLowerCase();
      if (d.id.toLowerCase().indexOf(q) === -1 && d.shape.toLowerCase().indexOf(q) === -1) {
        return false;
      }
    }
    for (var key in state.picks) {
      var set = state.picks[key];
      if (set.size && !set.has(d[key])) return false;
    }
    if (state.caratMin !== null && d.carat < state.caratMin) return false;
    if (state.caratMax !== null && d.carat > state.caratMax) return false;
    return true;
  }

  var SORTS = {
    'featured': null,
    'carat-desc': function (a, b) { return b.carat - a.carat; },
    'carat-asc': function (a, b) { return a.carat - b.carat; },
    'colour': function (a, b) { return a.colour.localeCompare(b.colour) || b.carat - a.carat; },
    'stock': function (a, b) { return a.id.localeCompare(b.id); }
  };

  function activeFilterCount() {
    var n = 0;
    for (var key in state.picks) n += state.picks[key].size;
    if (state.caratMin !== null) n += 1;
    if (state.caratMax !== null) n += 1;
    return n;
  }

  /* ---------- renderers (shared card lives in diamond-card.js) ---------- */
  var shared = window.NGDDiamondCard;
  var availBadge = shared.availBadge;
  var cardHtml = shared.cardHtml;

  var esc = shared.esc;

  function rowHtml(d) {
    return (
      '<tr data-diamond-id="' + esc(d.id) + '">' +
      '<td class="ngd-stock-cell">' + esc(d.id) + '</td>' +
      '<td>' + esc(d.shape) + '</td>' +
      '<td>' + d.carat.toFixed(2) + '</td>' +
      '<td>' + esc(d.colour) + '</td>' +
      '<td>' + esc(d.clarity) + '</td>' +
      '<td>' + esc(d.cut) + '</td>' +
      '<td>' + esc(d.lab) + '</td>' +
      '<td>' + esc(d.growth) + '</td>' +
      '<td>' + availBadge(d) + '</td>' +
      '<td class="text-end"><a class="ngd-link small" href="' + shared.detailsUrl(d) + '">View</a></td>' +
      '</tr>'
    );
  }

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

    /* count */
    var catalogueEmpty = DATA.length === 0;
    el.count.textContent = catalogueEmpty
      ? 'No stones in the inventory yet'
      : total === 0
        ? 'No stones match your filters'
        : 'Showing ' + (start + 1) + '–' + (start + pageItems.length) + ' of ' + total +
          (total === 1 ? ' stone' : ' stones');

    /* views */
    var isGrid = state.view === 'grid';
    el.grid.classList.toggle('d-none', !isGrid || total === 0);
    el.tableWrap.classList.toggle('d-none', isGrid || total === 0);
    el.none.classList.toggle('d-none', !catalogueEmpty);
    el.empty.classList.toggle('d-none', catalogueEmpty || total !== 0);
    el.viewGrid.classList.toggle('is-active', isGrid);
    el.viewGrid.setAttribute('aria-pressed', String(isGrid));
    el.viewTable.classList.toggle('is-active', !isGrid);
    el.viewTable.setAttribute('aria-pressed', String(!isGrid));

    if (isGrid) {
      el.grid.innerHTML = pageItems.map(cardHtml).join('');
      if (window.NGDTilt) window.NGDTilt(el.grid);
    } else {
      el.tableBody.innerHTML = pageItems.map(rowHtml).join('');
    }

    renderPagination(totalPages);

    /* mobile filter badge */
    var n = activeFilterCount();
    el.filterBadge.textContent = n ? String(n) : '';
    el.filterBadge.classList.toggle('d-none', n === 0);

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
      apply(false);
    }, 140);
  });

  el.sort.addEventListener('change', function () {
    state.sort = el.sort.value;
    state.page = 1;
    apply(false);
  });

  el.viewGrid.addEventListener('click', function () {
    if (state.view !== 'grid') { state.view = 'grid'; apply(false); }
  });
  el.viewTable.addEventListener('click', function () {
    if (state.view !== 'table') { state.view = 'table'; apply(false); }
  });

  form.addEventListener('change', function (event) {
    var t = event.target;
    if (t.matches('input[type="checkbox"][data-filter-key]')) {
      var set = state.picks[t.getAttribute('data-filter-key')];
      if (t.checked) set.add(t.value); else set.delete(t.value);
      state.page = 1;
      apply(false);
    }
  });

  form.addEventListener('input', function (event) {
    if (event.target.id === 'inv-carat-min' || event.target.id === 'inv-carat-max') {
      var min = parseFloat(form.querySelector('#inv-carat-min').value);
      var max = parseFloat(form.querySelector('#inv-carat-max').value);
      state.caratMin = isNaN(min) ? null : min;
      state.caratMax = isNaN(max) ? null : max;
      state.page = 1;
      apply(false);
    }
  });

  function clearFilters() {
    for (var key in state.picks) state.picks[key].clear();
    state.caratMin = null;
    state.caratMax = null;
    state.search = '';
    el.search.value = '';
    form.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    form.querySelector('#inv-carat-min').value = '';
    form.querySelector('#inv-carat-max').value = '';
    state.page = 1;
    apply(false);
  }
  form.addEventListener('click', function (event) {
    if (event.target.id === 'inv-clear') clearFilters();
  });
  document.getElementById('inv-empty-clear').addEventListener('click', clearFilters);

  el.pagination.addEventListener('click', function (event) {
    var btn = event.target.closest('.ngd-page-btn');
    if (!btn || btn.disabled) return;
    var page = parseInt(btn.getAttribute('data-page'), 10);
    if (!isNaN(page) && page !== state.page) {
      state.page = page;
      apply(true);
    }
  });

  /* ---------- URL params from the homepage ---------- */
  var params = new URLSearchParams(window.location.search);
  var shapeParam = (params.get('shape') || '').toLowerCase();
  if (shapeParam) {
    var box = form.querySelector('input[data-filter-key="shape"][value="' +
      shapeParam.charAt(0).toUpperCase() + shapeParam.slice(1) + '"]');
    if (box) {
      box.checked = true;
      state.picks.shape.add(box.value);
    }
  }

  /* ---------- real load lifecycle ---------- */
  function setStage(stage) {
    el.loading.classList.toggle('d-none', stage !== 'loading');
    el.error.classList.toggle('d-none', stage !== 'error');
    if (stage !== 'ready') {
      el.grid.classList.add('d-none');
      el.tableWrap.classList.add('d-none');
      el.empty.classList.add('d-none');
      el.none.classList.add('d-none');
      el.pagination.innerHTML = '';
      el.count.textContent = stage === 'loading'
        ? 'Loading the inventory…'
        : 'The inventory could not be loaded';
    }
  }

  async function boot() {
    setStage('loading');
    try {
      DATA = await loadDiamonds();
    } catch (err) {
      /* customers never see raw Supabase internals */
      console.error('[NGD Inventory] load failed:', err);
      setStage('error');
      return;
    }
    setStage('ready');
    apply(false);
  }

  document.getElementById('inv-retry').addEventListener('click', boot);

  boot();
})();
