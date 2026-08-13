/* ============================================================
   NEW GROWN DIAMOND — DIAMOND INVENTORY CONTROLLER
   ------------------------------------------------------------
   Vanilla-JS inventory over the static demo dataset in
   diamonds-data.js. Search, filters, sorting, grid/table views,
   pagination and the details modal all run client-side.

   Supabase-ready: loadDiamonds() is the single data source —
   the future phase swaps its body for a `diamonds` table select
   (and can push filtering server-side) without touching the
   rendering or state logic below.
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('inv-grid');
  if (!grid) return; // inventory page only

  /* ---------- data source ---------- */
  function loadDiamonds() {
    /* Future: return supabase.from('diamonds').select('*') … */
    return window.NGD_DEMO_DIAMONDS || [];
  }

  var DATA = loadDiamonds();
  var ART = window.NGD_GEM_ART || {};
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
    pagination: document.getElementById('inv-pagination'),
    viewGrid: document.getElementById('inv-view-grid'),
    viewTable: document.getElementById('inv-view-table'),
    filterHostDesktop: document.getElementById('inv-filter-host'),
    filterHostMobile: document.getElementById('inv-filter-host-mobile'),
    filterBadge: document.getElementById('inv-filter-badge'),
    results: document.getElementById('inv-results'),
    modal: document.getElementById('invDetailModal'),
    modalBody: document.getElementById('inv-modal-body')
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

  /* ---------- renderers ---------- */
  function availBadge(d) {
    var cls = d.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return '<span class="ngd-avail ' + cls + '">' + d.availability + '</span>';
  }

  function artFor(d) {
    return ART[d.shape.toLowerCase()] || ART.round || '';
  }

  function cardHtml(d) {
    return (
      '<div class="col-12 col-md-6 col-xl-4">' +
      '<article class="ngd-card ngd-card-dark ngd-card-3d ngd-diamond-card h-100" data-ngd-tilt data-diamond-id="' + d.id + '">' +
      '<div class="ngd-diamond-media ngd-depth-1">' + artFor(d) + '</div>' +
      '<div class="ngd-diamond-body">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2">' +
      '<h3 class="ngd-diamond-title">' + d.shape + '</h3>' +
      '<span class="ngd-diamond-carat">' + d.carat.toFixed(2) + ' ct</span>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-1">' +
      '<span class="ngd-stock-no">' + d.id + '</span>' + availBadge(d) +
      '</div>' +
      '<dl class="ngd-diamond-specs">' +
      '<div><dt>Shape</dt><dd>' + d.shape + '</dd></div>' +
      '<div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + d.colour + '</dd></div>' +
      '<div><dt>Clarity</dt><dd>' + d.clarity + '</dd></div>' +
      '<div><dt>Cut</dt><dd>' + d.cut + '</dd></div>' +
      '<div><dt>Laboratory</dt><dd>' + d.lab + '</dd></div>' +
      '</dl>' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm ngd-btn-block inv-view-details" ' +
      'href="#" data-diamond-id="' + d.id + '">View Details</a>' +
      '</div></article></div>'
    );
  }

  function rowHtml(d) {
    return (
      '<tr data-diamond-id="' + d.id + '">' +
      '<td class="ngd-stock-cell">' + d.id + '</td>' +
      '<td>' + d.shape + '</td>' +
      '<td>' + d.carat.toFixed(2) + '</td>' +
      '<td>' + d.colour + '</td>' +
      '<td>' + d.clarity + '</td>' +
      '<td>' + d.cut + '</td>' +
      '<td>' + d.lab + '</td>' +
      '<td>' + d.growth + '</td>' +
      '<td>' + availBadge(d) + '</td>' +
      '<td class="text-end"><a class="ngd-link small inv-view-details" href="#" ' +
      'data-diamond-id="' + d.id + '">View</a></td>' +
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
    el.count.textContent = total === 0
      ? 'No stones match your filters'
      : 'Showing ' + (start + 1) + '–' + (start + pageItems.length) + ' of ' + total +
        (total === 1 ? ' stone' : ' stones');

    /* views */
    var isGrid = state.view === 'grid';
    el.grid.classList.toggle('d-none', !isGrid || total === 0);
    el.tableWrap.classList.toggle('d-none', isGrid || total === 0);
    el.empty.classList.toggle('d-none', total !== 0);
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

  /* ---------- details modal ---------- */
  function openDetails(id) {
    var d = null;
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) { d = DATA[i]; break; }
    if (!d || !el.modal) return;

    el.modalBody.innerHTML =
      '<div class="ngd-diamond-media ngd-modal-media">' + artFor(d) + '</div>' +
      '<div class="p-4">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2">' +
      '<h3 class="ngd-diamond-title fs-4">' + d.shape + ' · ' + d.carat.toFixed(2) + ' ct</h3>' +
      availBadge(d) +
      '</div>' +
      '<p class="ngd-stock-no mt-1 mb-3">' + d.id + '</p>' +
      '<dl class="ngd-diamond-specs mb-4">' +
      '<div><dt>Shape</dt><dd>' + d.shape + '</dd></div>' +
      '<div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + d.colour + '</dd></div>' +
      '<div><dt>Clarity</dt><dd>' + d.clarity + '</dd></div>' +
      '<div><dt>Cut</dt><dd>' + d.cut + '</dd></div>' +
      '<div><dt>Laboratory</dt><dd>' + d.lab + '</dd></div>' +
      '<div><dt>Growth</dt><dd>' + d.growth + '</dd></div>' +
      '<div><dt>Availability</dt><dd>' + d.availability + '</dd></div>' +
      '</dl>' +
      '<div class="d-grid gap-2">' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-block" href="contact.html">Enquire about this stone</a>' +
      '</div></div>';

    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el.modal).show();
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

  document.addEventListener('click', function (event) {
    var link = event.target.closest('.inv-view-details');
    if (link) {
      event.preventDefault();
      openDetails(link.getAttribute('data-diamond-id'));
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

  apply(false);

  var idParam = params.get('id');
  if (idParam) {
    var mapped = (window.NGD_LEGACY_IDS || {})[idParam] || idParam;
    openDetails(mapped);
  }
})();
