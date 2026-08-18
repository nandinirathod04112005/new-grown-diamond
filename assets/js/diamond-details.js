/* ============================================================
   NEW GROWN DIAMOND — DIAMOND DETAILS CONTROLLER
   ------------------------------------------------------------
   Renders one stone from the static demo dataset, resolved via
   ?id=<stock id> (future pattern diamond-details.html?id=DIA-XXXX).

   Supabase-ready: findStone() is the single data seam — the
   future phase swaps it for a `diamonds` table select by id.
   The CTA buttons are frontend UI only: Quote/Inspection link to
   the contact page carrying the stone reference; Favourites is
   pure in-page state (no fake backend success anywhere).
   ============================================================ */
(function () {
  'use strict';

  var product = document.getElementById('dd-product');
  if (!product) return; // details page only

  /* ---------- data ---------- */
  function findStone(id) {
    /* Future: supabase.from('diamonds').select('*').eq('id', id).single() */
    var data = window.NGD_DEMO_DIAMONDS || [];
    var mapped = (window.NGD_LEGACY_IDS || {})[id] || id;
    for (var i = 0; i < data.length; i++) {
      if (data[i].id === mapped) return data[i];
    }
    return null;
  }

  async function renderDetails() {
  var params = new URLSearchParams(window.location.search);
  var requestedId = params.get('id');
  var query = window.ngdSupabase.from('diamonds').select('*').eq('active', true);
  if (requestedId) query = query.or('stock_number.eq.' + requestedId + ',public_id.eq.' + requestedId);
  var result = await query.limit(1);
  var row = !result.error && result.data && result.data[0];
  var stone = row ? { id: row.stock_number || row.public_id, publicId: row.public_id, shape: row.shape,
    carat: Number(row.carat) || 0, colour: row.color, clarity: row.clarity, cut: row.cut,
    polish: row.polish || '—', symmetry: row.symmetry || '—', fluorescence: row.fluorescence || '—',
    lab: row.laboratory, report: row.report_number || row.certificate_number || '—', measurements: row.measurements || '—',
    depthPct: Number(row.depth_percentage) || 0, tablePct: Number(row.table_percentage) || 0, ratio: Number(row.ratio) || 0,
    growth: row.growth_method, availability: row.availability, imagePath: row.image_path || '' } : null;

  if (!stone) {
    product.classList.add('d-none');
    var sticky = document.getElementById('dd-sticky');
    if (sticky) sticky.classList.add('d-none');
    document.getElementById('dd-notfound').classList.remove('d-none');
    document.title = 'Stone not found — New Grown Diamond';
    return;
  }

  var shared = window.NGDDiamondCard;

  /* ---------- gallery views ---------- */
  var SHADE = { bright: '#fdfcf8', mid: '#f2ecdc', deep: '#e9e0c8', dark: '#ded2b0', stroke: 'rgba(148,126,82,0.5)' };

  function profileSvg() {
    return (
      '<svg viewBox="0 0 160 110" aria-hidden="true">' +
      '<g stroke="' + SHADE.stroke + '" stroke-width="0.8" stroke-linejoin="round">' +
      '<polygon points="58,26 102,26 122,44 38,44" fill="' + SHADE.bright + '"/>' +
      '<polygon points="38,44 58,26 44,44" fill="' + SHADE.mid + '"/>' +
      '<polygon points="122,44 102,26 116,44" fill="' + SHADE.mid + '"/>' +
      '<rect x="38" y="44" width="84" height="5" fill="' + SHADE.dark + '"/>' +
      '<polygon points="38,49 122,49 80,92" fill="' + SHADE.deep + '"/>' +
      '<polygon points="60,49 100,49 80,92" fill="' + SHADE.mid + '" opacity="0.8"/>' +
      '<line x1="80" y1="26" x2="80" y2="44" opacity="0.5"/>' +
      '</g>' +
      '<ellipse cx="80" cy="101" rx="32" ry="4.5" fill="rgba(217,192,138,0.18)"/>' +
      '</svg>'
    );
  }

  function certSvg(d) {
    return (
      '<svg viewBox="0 0 160 110" aria-hidden="true">' +
      '<rect x="22" y="10" width="116" height="90" rx="6" fill="#fdfcf8" stroke="rgba(148,126,82,0.55)" stroke-width="1"/>' +
      '<text x="80" y="30" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#8f6d31">' + d.lab + '</text>' +
      '<text x="80" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="5.5" letter-spacing="2" fill="#6e6e76">LABORATORY GROWN DIAMOND REPORT</text>' +
      '<rect x="36" y="52" width="88" height="3" rx="1.5" fill="#e9e0c8"/>' +
      '<rect x="36" y="61" width="72" height="3" rx="1.5" fill="#eee7d6"/>' +
      '<rect x="36" y="70" width="80" height="3" rx="1.5" fill="#e9e0c8"/>' +
      '<rect x="36" y="79" width="60" height="3" rx="1.5" fill="#eee7d6"/>' +
      '<circle cx="122" cy="82" r="9" fill="#d9c08a"/>' +
      '<text x="122" y="85.5" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#17130a">◆</text>' +
      '</svg>'
    );
  }

  var VIEWS = [
    { key: 'top', label: 'Product image', svg: shared.artFor(stone), float: !stone.imagePath },
    { key: 'profile', label: 'Profile view', svg: profileSvg(), float: true },
    { key: 'certificate', label: 'Certificate', svg: certSvg(stone), float: false }
  ];

  var stage = document.getElementById('dd-stage');
  var stageInner = document.getElementById('dd-stage-inner');
  var thumbs = document.getElementById('dd-thumbs');
  var activeView = 'top';

  function renderStage() {
    var view = VIEWS.filter(function (v) { return v.key === activeView; })[0];
    stage.classList.remove('is-zoomed');
    stageInner.style.transformOrigin = '';
    stageInner.innerHTML =
      '<div class="' + (view.float ? 'ngd-detail-float ' : '') + 'w-100 h-100 d-flex align-items-center justify-content-center">' +
      view.svg + '</div>';
    stage.setAttribute('data-view', view.key);
    stage.setAttribute('aria-label', stone.shape + ' diamond — ' + view.label);
    thumbs.querySelectorAll('.ngd-thumb').forEach(function (b) {
      var on = b.getAttribute('data-view') === activeView;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  thumbs.innerHTML = VIEWS.map(function (v) {
    return (
      '<button type="button" class="ngd-thumb" role="tab" data-view="' + v.key + '" ' +
      'aria-label="' + v.label + '" title="' + v.label + '">' + v.svg + '</button>'
    );
  }).join('');

  thumbs.addEventListener('click', function (event) {
    var btn = event.target.closest('.ngd-thumb');
    if (!btn) return;
    activeView = btn.getAttribute('data-view');
    renderStage();
  });

  /* ---------- zoom interaction ---------- */
  stage.addEventListener('click', function () {
    stage.classList.toggle('is-zoomed');
    document.getElementById('dd-zoomhint').textContent =
      stage.classList.contains('is-zoomed') ? 'Click to reset' : 'Click to zoom';
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
  document.title = stone.id + ' · ' + stone.shape + ' ' + stone.carat.toFixed(2) + ' ct — New Grown Diamond';
  document.getElementById('dd-lab-badge').textContent = stone.lab + ' Certified';
  document.getElementById('dd-stock').textContent = stone.id;
  document.getElementById('dd-title').innerHTML =
    stone.shape + ' · <span class="ngd-italic-accent">' + stone.carat.toFixed(2) + ' ct</span>';
  document.getElementById('dd-chips').innerHTML =
    shared.availBadge(stone) +
    '<span class="ngd-badge">' + stone.lab + ' · ' + stone.report + '</span>' +
    '<span class="ngd-badge">' + stone.growth + ' grown</span>';
  document.getElementById('dd-sub').textContent =
    stone.colour + ' colour · ' + stone.clarity + ' clarity · ' + stone.cut +
    ' cut — grown, cut and certified as a ' + stone.growth + ' lab diamond.';

  var SPEC_FIELDS = [
    ['Stock Number', stone.id],
    ['Shape', stone.shape],
    ['Carat', stone.carat.toFixed(2)],
    ['Colour', stone.colour],
    ['Clarity', stone.clarity],
    ['Cut', stone.cut],
    ['Polish', stone.polish],
    ['Symmetry', stone.symmetry],
    ['Fluorescence', stone.fluorescence],
    ['Laboratory', stone.lab],
    ['Report Number', stone.report],
    ['Measurements', stone.measurements, true],
    ['Depth %', stone.depthPct + '%'],
    ['Table %', stone.tablePct + '%'],
    ['Ratio', stone.ratio.toFixed(2)],
    ['Growth Method', stone.growth],
    ['Availability', stone.availability]
  ];

  document.getElementById('dd-specs').innerHTML = SPEC_FIELDS.map(function (f) {
    return '<div' + (f[2] ? ' class="ngd-spec-wide"' : '') + '><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>';
  }).join('');

  /* ---------- CTAs (frontend only — no fake success) ---------- */
  var quoteUrl = 'contact.html?stone=' + encodeURIComponent(stone.id) + '&type=quote';
  var inspectUrl = 'contact.html?stone=' + encodeURIComponent(stone.id) + '&type=inspection';
  document.getElementById('dd-quote').setAttribute('href', quoteUrl);
  document.getElementById('dd-inspect').setAttribute('href', inspectUrl);
  document.getElementById('dd-sticky-quote').setAttribute('href', quoteUrl);

  var favButtons = [document.getElementById('dd-fav'), document.getElementById('dd-sticky-fav')];
  var favActive = false;

  function renderFav() {
    favButtons.forEach(function (btn) {
      if (!btn) return;
      btn.classList.toggle('is-active', favActive);
      btn.setAttribute('aria-pressed', String(favActive));
      var icon = btn.querySelector('.ngd-fav-icon');
      if (icon) icon.textContent = favActive ? '♥' : '♡';
    });
    var label = document.getElementById('dd-fav-label');
    if (label) label.textContent = favActive ? 'In Favourites' : 'Add to Favourites';
  }

  favButtons.forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      favActive = !favActive;
      renderFav();
    });
  });

  /* ---------- certificate card ---------- */
  document.getElementById('dd-cert-lab').textContent = stone.lab + ' Laboratory';
  document.getElementById('dd-cert-no').textContent = stone.report;

  /* ---------- full specification card ---------- */
  var GROUPS = [
    { title: 'Grading', rows: [
      ['Colour', stone.colour], ['Clarity', stone.clarity], ['Cut', stone.cut],
      ['Polish', stone.polish], ['Symmetry', stone.symmetry], ['Fluorescence', stone.fluorescence]
    ] },
    { title: 'Proportions', rows: [
      ['Carat', stone.carat.toFixed(2)], ['Measurements', stone.measurements],
      ['Depth %', stone.depthPct + '%'], ['Table %', stone.tablePct + '%'],
      ['Ratio', stone.ratio.toFixed(2)]
    ] },
    { title: 'Origin & Status', rows: [
      ['Stock Number', stone.id], ['Growth Method', stone.growth],
      ['Laboratory', stone.lab], ['Report Number', stone.report],
      ['Availability', stone.availability]
    ] }
  ];

  document.getElementById('dd-spec-table').innerHTML = GROUPS.map(function (g) {
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

  /* ---------- similar stones ---------- */
  var pool = (window.NGD_DEMO_DIAMONDS || []).filter(function (d) { return d.id !== stone.id; });
  var sameShape = pool.filter(function (d) { return d.shape === stone.shape; });
  var others = pool
    .filter(function (d) { return d.shape !== stone.shape; })
    .sort(function (a, b) {
      return Math.abs(a.carat - stone.carat) - Math.abs(b.carat - stone.carat);
    });
  var similar = sameShape.concat(others).slice(0, 3);

  document.getElementById('dd-similar').innerHTML = similar.map(shared.cardHtml).join('');
  if (window.NGDTilt) window.NGDTilt(document.getElementById('dd-similar'));

  renderStage();
  renderFav();
  }

  renderDetails().catch(function (error) {
    console.error('[NGD Diamond Details] load failed:', error);
    product.classList.add('d-none');
    document.getElementById('dd-notfound').classList.remove('d-none');
  });
})();
