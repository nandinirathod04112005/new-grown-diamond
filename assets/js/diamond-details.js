/* ============================================================
   NEW GROWN DIAMOND — DIAMOND DETAILS CONTROLLER (LIVE)
   ------------------------------------------------------------
   Loads ONE stone from public.diamonds by its immutable
   public_id (diamond-details.html?id=DIA-XXXXXXXX) through the
   shared Supabase client — active, non-archived stones only,
   with an explicit storefront column list (no internal notes,
   no creator ids). Inactive, archived, unknown or malformed ids
   all land on the clean "Diamond not available" state; network
   failures get an honest error state with Retry. Price shows
   only when price_visible allows it — otherwise the page says
   "Price on Request" and the hidden price never enters page
   state. Similar stones load live too. The CTA buttons remain
   frontend UI: Quote opens the live quote flow, Inspection links
   to the contact page, Favourites is in-page state.
   ============================================================ */
(function () {
  'use strict';

  var product = document.getElementById('dd-product');
  if (!product) return; // details page only

  var shared = window.NGDDiamondCard;
  var esc = shared.esc;
  var dash = '—';

  var sticky = document.getElementById('dd-sticky');
  var notfound = document.getElementById('dd-notfound');
  var loading = document.getElementById('dd-loading');
  var errorBox = document.getElementById('dd-error');

  function showOnly(stage) {
    product.classList.toggle('d-none', stage !== 'product');
    if (sticky) sticky.classList.toggle('d-none', stage !== 'product');
    notfound.classList.toggle('d-none', stage !== 'notfound');
    loading.classList.toggle('d-none', stage !== 'loading');
    errorBox.classList.toggle('d-none', stage !== 'error');
  }

  /* ---------- live data ---------- */

  /* Storefront columns only — internal_notes / created_by are never
     requested by the public pages. */
  var COLUMNS = 'id,public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,' +
    'fluorescence,laboratory,report_number,certificate_number,measurements,' +
    'depth_percentage,table_percentage,ratio,growth_method,availability,image_path,' +
    'total_price,price_per_carat,currency,price_visible';

  function num(value) {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  function mapStone(d) {
    var stone = {
      id: d.stock_number || d.public_id || dash,
      publicId: d.public_id || '',
      rowId: d.id || null,
      shape: d.shape || dash,
      carat: Number(d.carat) || 0,
      colour: d.color || dash,
      clarity: d.clarity || dash,
      cut: d.cut || dash,
      polish: d.polish || dash,
      symmetry: d.symmetry || dash,
      fluorescence: d.fluorescence || dash,
      lab: d.laboratory || dash,
      report: d.report_number || d.certificate_number || dash,
      measurements: d.measurements || dash,
      depthPct: num(d.depth_percentage),
      tablePct: num(d.table_percentage),
      ratio: num(d.ratio),
      growth: d.growth_method || dash,
      availability: d.availability || 'On Request',
      image_path: d.image_path || null
    };
    /* a hidden price never enters page state, let alone the HTML */
    if (d.price_visible && num(d.total_price) !== null) {
      stone.price = num(d.total_price);
      stone.currency = d.currency || '';
    }
    return stone;
  }

  async function loadStone(publicId) {
    var res = await window.ngdSupabase.from('diamonds').select(COLUMNS)
      .eq('public_id', publicId).eq('active', true).is('archived_at', null).limit(2);
    if (res.error) throw res.error;
    return res.data && res.data.length === 1 ? mapStone(res.data[0]) : null;
  }

  /** Best-effort: an empty Similar row must never break the page. */
  async function loadSimilar(stone) {
    try {
      var res = await window.ngdSupabase.from('diamonds')
        .select('public_id,stock_number,shape,carat,color,clarity,cut,laboratory,availability,image_path')
        .eq('active', true).is('archived_at', null)
        .neq('public_id', stone.publicId)
        .order('created_at', { ascending: false })
        .limit(24);
      if (res.error) throw res.error;
      var pool = (res.data || []).map(mapStone);
      var sameShape = pool.filter(function (d) { return d.shape === stone.shape; });
      var others = pool
        .filter(function (d) { return d.shape !== stone.shape; })
        .sort(function (a, b) {
          return Math.abs(a.carat - stone.carat) - Math.abs(b.carat - stone.carat);
        });
      return sameShape.concat(others).slice(0, 3);
    } catch (err) {
      console.warn('[NGD Details] similar stones unavailable:', err);
      return [];
    }
  }

  /* ---------- gallery art ---------- */
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
      '<text x="80" y="30" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#8f6d31">' + esc(d.lab) + '</text>' +
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

  /* ---------- render one verified stone ---------- */
  function render(stone) {
    var VIEWS = [
      { key: 'top', label: 'Top view', svg: shared.artFor(stone), float: true },
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
        'aria-label="' + esc(v.label) + '" title="' + esc(v.label) + '">' + v.svg + '</button>'
      );
    }).join('');

    thumbs.addEventListener('click', function (event) {
      var btn = event.target.closest('.ngd-thumb');
      if (!btn) return;
      activeView = btn.getAttribute('data-view');
      renderStage();
    });

    /* zoom interaction */
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

    /* information column */
    document.title = stone.id + ' · ' + stone.shape + ' ' + stone.carat.toFixed(2) + ' ct — New Grown Diamond';
    document.getElementById('dd-lab-badge').textContent = stone.lab + ' Certified';
    document.getElementById('dd-stock').textContent = stone.id;
    document.getElementById('dd-title').innerHTML =
      esc(stone.shape) + ' · <span class="ngd-italic-accent">' + stone.carat.toFixed(2) + ' ct</span>';
    document.getElementById('dd-chips').innerHTML =
      shared.availBadge(stone) +
      '<span class="ngd-badge">' + esc(stone.lab) + ' · ' + esc(stone.report) + '</span>' +
      '<span class="ngd-badge">' + esc(stone.growth) + ' grown</span>';
    document.getElementById('dd-sub').textContent =
      stone.colour + ' colour · ' + stone.clarity + ' clarity · ' + stone.cut +
      ' cut — grown, cut and certified as a ' + stone.growth + ' lab diamond.';

    /* price respects price_visible — a hidden price is simply not here */
    var priceEl = document.getElementById('dd-price');
    if (priceEl) {
      if (stone.price !== undefined && isFinite(stone.price)) {
        priceEl.textContent = (stone.currency ? stone.currency + ' ' : '') +
          stone.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        priceEl.classList.remove('ngd-text-muted');
      } else {
        priceEl.textContent = 'Price on Request';
        priceEl.classList.add('ngd-text-muted');
      }
    }

    var pct = function (v) { return v === null ? dash : v + '%'; };
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
      ['Depth %', pct(stone.depthPct)],
      ['Table %', pct(stone.tablePct)],
      ['Ratio', stone.ratio === null ? dash : stone.ratio.toFixed(2)],
      ['Growth Method', stone.growth],
      ['Availability', stone.availability]
    ];

    document.getElementById('dd-specs').innerHTML = SPEC_FIELDS.map(function (f) {
      return '<div' + (f[2] ? ' class="ngd-spec-wide"' : '') + '><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
    }).join('');

    /* CTAs — quote, hold and inspection open the live request flows,
       favourites is the RLS-backed favourites service keyed by the
       row uuid */
    window.NGDBindInspectionButtons(
      [document.getElementById('dd-inspect')],
      { type: 'diamond', reference: stone.publicId, title: stone.shape + ' · ' + stone.carat.toFixed(2) + ' ct' }
    );
    window.NGDBindQuoteButtons(
      [document.getElementById('dd-quote'), document.getElementById('dd-sticky-quote')],
      { type: 'diamond', reference: stone.id, title: stone.shape + ' · ' + stone.carat.toFixed(2) + ' ct' }
    );
    window.NGDBindHoldButtons(
      [document.getElementById('dd-hold'), document.getElementById('dd-sticky-hold')],
      { type: 'diamond', reference: stone.publicId, title: stone.shape + ' · ' + stone.carat.toFixed(2) + ' ct' }
    );

    var favButtons = [document.getElementById('dd-fav'), document.getElementById('dd-sticky-fav')];
    window.NGDFavourites.bind(
      favButtons, 'diamond', stone.rowId, document.getElementById('dd-fav-label')
    ).catch(function (error) { console.error('[NGD Favourites]', error); });

    /* certificate card */
    document.getElementById('dd-cert-lab').textContent = stone.lab + ' Laboratory';
    document.getElementById('dd-cert-no').textContent = stone.report;

    /* full specification card */
    var GROUPS = [
      { title: 'Grading', rows: [
        ['Colour', stone.colour], ['Clarity', stone.clarity], ['Cut', stone.cut],
        ['Polish', stone.polish], ['Symmetry', stone.symmetry], ['Fluorescence', stone.fluorescence]
      ] },
      { title: 'Proportions', rows: [
        ['Carat', stone.carat.toFixed(2)], ['Measurements', stone.measurements],
        ['Depth %', pct(stone.depthPct)], ['Table %', pct(stone.tablePct)],
        ['Ratio', stone.ratio === null ? dash : stone.ratio.toFixed(2)]
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
        '<h3 class="ngd-spec-group-title">' + esc(g.title) + '</h3>' +
        '<dl class="mb-0">' +
        g.rows.map(function (r) {
          return '<div class="ngd-spec-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join('') +
        '</dl></div>'
      );
    }).join('');

    /* similar stones — live, best effort */
    loadSimilar(stone).then(function (similar) {
      document.getElementById('dd-similar').innerHTML = similar.map(shared.cardHtml).join('');
      if (window.NGDTilt) window.NGDTilt(document.getElementById('dd-similar'));
    });

    renderStage();

  }

  /* ---------- boot ---------- */
  async function boot() {
    var requestedId = (new URLSearchParams(window.location.search).get('id') || '').trim();
    showOnly('loading');
    if (!/^DIA-[A-Z0-9]{8}$/i.test(requestedId)) {
      showOnly('notfound');
      document.title = 'Diamond not available — New Grown Diamond';
      return;
    }
    var stone;
    try {
      stone = await loadStone(requestedId);
    } catch (err) {
      /* customers never see raw Supabase internals */
      console.error('[NGD Details] load failed:', err);
      showOnly('error');
      document.title = 'Diamond Details — New Grown Diamond';
      return;
    }
    if (!stone) {
      showOnly('notfound');
      document.title = 'Diamond not available — New Grown Diamond';
      return;
    }
    showOnly('product');
    render(stone);
    /* Public facts go to the SEO engine — a saved admin override still
       wins; without one the page's tags are generated from this stone. */
    if (window.NGDSeo && window.NGDSeo.applyProduct) {
      var seoVal = function (v) { return v && v !== dash ? v : ''; };
      window.NGDSeo.applyProduct({
        type: 'diamond', publicId: stone.publicId,
        shape: seoVal(stone.shape), carat: stone.carat,
        colour: seoVal(stone.colour), clarity: seoVal(stone.clarity),
        cut: seoVal(stone.cut), lab: seoVal(stone.lab), growth: seoVal(stone.growth),
        availability: seoVal(stone.availability),
        image: stone.image_path && window.ngdStorageUrl
          ? window.ngdStorageUrl('diamond-images', stone.image_path) : ''
      });
    }
  }

  document.getElementById('dd-retry').addEventListener('click', boot);

  boot();
})();
