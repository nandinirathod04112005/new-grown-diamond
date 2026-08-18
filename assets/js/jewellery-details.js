/* ============================================================
   NEW GROWN DIAMOND — JEWELLERY DETAILS CONTROLLER
   ------------------------------------------------------------
   Renders one piece from the static demo dataset, resolved via
   ?id=<sku> (future pattern jewellery-details.html?id=JEW-XXXX).

   Supabase-ready: findPiece() is the single data seam — the
   future phase swaps it for a `jewellery` table select by id.
   CTAs are frontend UI only (Quote/Enquire link to the contact
   page with the piece reference; Favourites is in-page state).
   The 360° gallery view is prepared UI structure only.
   ============================================================ */
(function () {
  'use strict';

  var product = document.getElementById('jd-product');
  if (!product) return; // jewellery details page only

  /* ---------- data ---------- */
  function findPiece(id) {
    /* Future: supabase.from('jewellery').select('*').eq('id', id).single() */
    var data = window.NGD_DEMO_JEWELLERY || [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].id === id) return data[i];
    }
    return null;
  }

  var params = new URLSearchParams(window.location.search);
  var requestedId = params.get('id');
  var piece = requestedId ? findPiece(requestedId) : (window.NGD_DEMO_JEWELLERY || [])[0];

  if (!piece) {
    product.classList.add('d-none');
    var stickyBar = document.getElementById('jd-sticky');
    if (stickyBar) stickyBar.classList.add('d-none');
    document.getElementById('jd-notfound').classList.remove('d-none');
    document.title = 'Piece not found — New Grown Diamond';
    return;
  }

  var shared = window.NGDJewelCard;

  /* ---------- gallery views ---------- */
  function svgInner(svg) {
    return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  }

  var baseArt = shared.artFor(piece);
  var SVG_OPEN = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

  /* Focal point of each category drawing for the "detail" crop */
  var FOCAL = {
    rings: { x: 60, y: 38 }, earrings: { x: 46, y: 58 }, pendants: { x: 60, y: 80 },
    necklaces: { x: 60, y: 68 }, bracelets: { x: 92, y: 60 }, bangles: { x: 49, y: 32 }
  };

  function detailArt() {
    var f = FOCAL[piece.category.toLowerCase()] || { x: 60, y: 60 };
    var s = 1.75;
    var tx = 60 - s * f.x;
    var ty = 60 - s * f.y;
    return SVG_OPEN +
      '<g transform="translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ') scale(' + s + ')">' +
      svgInner(baseArt) + '</g></svg>';
  }

  function profileArt() {
    return SVG_OPEN +
      '<g transform="translate(120 0) scale(-1 1)">' + svgInner(baseArt) + '</g></svg>';
  }

  var SPIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 8 16 8"/>' +
    '<ellipse cx="12" cy="12" rx="4" ry="6.5" opacity="0.55"/></svg>';

  var VIEWS = [
    { key: 'front', label: 'Front view', svg: baseArt },
    { key: 'detail', label: 'Setting detail', svg: detailArt() },
    { key: 'profile', label: 'Alternate angle', svg: profileArt() },
    { key: 'spin', label: '360° view (coming soon)', spin: true }
  ];

  var stage = document.getElementById('jd-stage');
  var stageInner = document.getElementById('jd-stage-inner');
  var thumbs = document.getElementById('jd-thumbs');
  var zoomHint = document.getElementById('jd-zoomhint');
  var activeView = 'front';

  function renderStage() {
    var view = VIEWS.filter(function (v) { return v.key === activeView; })[0];
    stage.classList.remove('is-zoomed');
    stage.classList.toggle('is-static', !!view.spin);
    stageInner.style.transformOrigin = '';
    if (view.spin) {
      /* Prepared UI slot — real 360° imagery arrives with live data */
      stageInner.innerHTML =
        '<div class="ngd-jd-360">' + SPIN_ICON +
        '<p class="small mb-0">360° spin view arrives with live product imagery.</p>' +
        '<span class="ngd-badge">Coming soon</span></div>';
      zoomHint.textContent = '';
    } else {
      stageInner.innerHTML =
        '<div class="w-100 h-100 d-flex align-items-center justify-content-center">' +
        view.svg + '</div>';
      zoomHint.textContent = 'Click to zoom';
    }
    stage.setAttribute('data-view', view.key);
    stage.setAttribute('aria-label', piece.name + ' — ' + view.label);
    thumbs.querySelectorAll('.ngd-thumb').forEach(function (b) {
      var on = b.getAttribute('data-view') === activeView;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  thumbs.innerHTML = VIEWS.map(function (v) {
    var inner = v.spin ? SPIN_ICON + '<span class="ngd-thumb-tag">Soon</span>' : v.svg;
    return (
      '<button type="button" class="ngd-thumb ngd-thumb-light" role="tab" data-view="' + v.key + '" ' +
      'aria-label="' + v.label + '" title="' + v.label + '">' + inner + '</button>'
    );
  }).join('');

  thumbs.addEventListener('click', function (event) {
    var btn = event.target.closest('.ngd-thumb');
    if (!btn) return;
    activeView = btn.getAttribute('data-view');
    renderStage();
  });

  /* ---------- zoom interaction (not on the 360° slot) ---------- */
  stage.addEventListener('click', function () {
    if (stage.classList.contains('is-static')) return;
    stage.classList.toggle('is-zoomed');
    zoomHint.textContent = stage.classList.contains('is-zoomed') ? 'Click to reset' : 'Click to zoom';
    if (!stage.classList.contains('is-zoomed')) stageInner.style.transformOrigin = '';
  });

  stage.addEventListener('pointermove', function (event) {
    if (!stage.classList.contains('is-zoomed')) return;
    var rect = stage.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;
    stageInner.style.transformOrigin = x.toFixed(1) + '% ' + y.toFixed(1) + '%';
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && stage.classList.contains('is-zoomed')) {
      stage.classList.remove('is-zoomed');
      stageInner.style.transformOrigin = '';
    }
  });

  /* ---------- information column ---------- */
  var dash = '—';
  function val(v) { return v === null || v === undefined || v === '' ? dash : v; }

  document.title = piece.name + ' · ' + piece.id + ' — New Grown Diamond';
  document.getElementById('jd-sku').textContent = piece.sku;
  document.getElementById('jd-name').textContent = piece.name;
  document.getElementById('jd-chips').innerHTML =
    shared.availBadge(piece) +
    '<span class="ngd-badge">' + piece.category + ' · ' + piece.subcategory + '</span>' +
    (piece.weightCt !== null
      ? '<span class="ngd-weight-chip">' + piece.weightCt.toFixed(2) + ' ct diamonds</span>'
      : '');
  document.getElementById('jd-short').textContent = piece.description;
  document.getElementById('jd-fulldesc').textContent = piece.fullDesc;

  var metalName = piece.metal === 'Platinum'
    ? 'Platinum 950'
    : piece.metalKarat + ' ' + piece.metalColour + ' Gold';

  var SPEC_FIELDS = [
    ['Product Name', piece.name, true],
    ['SKU', piece.sku],
    ['Category', piece.category],
    ['Subcategory', piece.subcategory],
    ['Metal', piece.metal],
    ['Metal Karat', piece.metalKarat],
    ['Metal Colour', piece.metalColour],
    ['Diamond Weight', piece.weightCt === null ? dash : piece.weightCt.toFixed(2) + ' ct'],
    ['Diamond Pieces', piece.diamondPieces === 0 ? dash : String(piece.diamondPieces)],
    ['Diamond Quality', val(piece.diamondQuality)],
    ['Diamond Shape', val(piece.diamondShape)],
    ['Certificate Number', val(piece.certificateNo)],
    ['Gross Weight', piece.grossWeight.toFixed(2) + ' g'],
    ['Size', piece.size, true],
    ['Availability', piece.availability]
  ];

  document.getElementById('jd-specs').innerHTML = SPEC_FIELDS.map(function (f) {
    return '<div' + (f[2] ? ' class="ngd-spec-wide"' : '') + '><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>';
  }).join('');

  /* ---------- CTAs (frontend only — no fake success) ---------- */
  var quoteUrl = 'contact.html?piece=' + encodeURIComponent(piece.id) + '&type=quote';
  var enquireUrl = 'contact.html?piece=' + encodeURIComponent(piece.id) + '&type=enquiry';
  document.getElementById('jd-quote').setAttribute('href', quoteUrl);
  /* Inspection CTA is connected by inspection-request.js. */
  document.getElementById('jd-sticky-quote').setAttribute('href', quoteUrl);

  var favButtons = [document.getElementById('jd-fav'), document.getElementById('jd-sticky-fav')];
  var favActive = false;

  function renderFav() {
    favButtons.forEach(function (btn) {
      if (!btn) return;
      btn.classList.toggle('is-active', favActive);
      btn.setAttribute('aria-pressed', String(favActive));
      var icon = btn.querySelector('.ngd-fav-icon');
      if (icon) icon.textContent = favActive ? '♥' : '♡';
    });
    var label = document.getElementById('jd-fav-label');
    if (label) label.textContent = favActive ? 'In Favourites' : 'Add to Favourites';
  }

  favButtons.forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      favActive = !favActive;
      renderFav();
    });
  });

  /* ---------- certificate / quality ---------- */
  var certText = document.getElementById('jd-cert-text');
  if (piece.certificateNo) {
    certText.innerHTML =
      'Stones graded ' + piece.diamondQuality + ' · Report <strong>' + piece.certificateNo + '</strong>';
  } else {
    certText.textContent = 'An all-metal piece — hallmarked ' + metalName + ', no diamond certificate applies.';
    document.getElementById('jd-cert-btn').classList.add('d-none');
  }

  /* ---------- full specification card ---------- */
  var GROUPS = [
    { title: 'The Piece', rows: [
      ['SKU', piece.sku], ['Category', piece.category], ['Subcategory', piece.subcategory],
      ['Size', piece.size], ['Gross Weight', piece.grossWeight.toFixed(2) + ' g'],
      ['Availability', piece.availability]
    ] },
    { title: 'The Metal', rows: [
      ['Metal', piece.metal], ['Karat', piece.metalKarat], ['Colour', piece.metalColour]
    ] },
    { title: 'The Diamonds', rows: [
      ['Total Weight', piece.weightCt === null ? dash : piece.weightCt.toFixed(2) + ' ct'],
      ['Pieces', piece.diamondPieces === 0 ? dash : String(piece.diamondPieces)],
      ['Quality', val(piece.diamondQuality)],
      ['Shape', val(piece.diamondShape)],
      ['Certificate', val(piece.certificateNo)]
    ] }
  ];

  document.getElementById('jd-spec-table').innerHTML = GROUPS.map(function (g) {
    return (
      '<div class="col-md-4">' +
      '<h3 class="ngd-spec-group-title">' + g.title + '</h3>' +
      '<dl class="mb-0">' +
      g.rows.map(function (r) {
        return '<div class="ngd-spec-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('') +
      '</dl></div>'
    );
  }).join('');

  /* ---------- similar pieces ---------- */
  var pool = (window.NGD_DEMO_JEWELLERY || []).filter(function (p) { return p.id !== piece.id; });
  var sameCat = pool.filter(function (p) { return p.category === piece.category; });
  var others = pool.filter(function (p) { return p.category !== piece.category; });
  var similar = sameCat.concat(others).slice(0, 3);

  document.getElementById('jd-similar').innerHTML = similar.map(shared.cardHtml).join('');
  if (window.NGDTilt) window.NGDTilt(document.getElementById('jd-similar'));

  renderStage();
  renderFav();
})();
