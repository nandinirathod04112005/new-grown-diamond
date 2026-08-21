/* ============================================================
   NEW GROWN DIAMOND — JEWELLERY DETAILS CONTROLLER (LIVE)
   ------------------------------------------------------------
   Loads ONE piece from public.jewellery by its immutable
   public_id (jewellery-details.html?id=JEW-XXXXXXXX) through the
   shared Supabase client — active, non-archived pieces only,
   with an explicit storefront column list (no internal notes, no
   creator ids). Its photos come from public.jewellery_images:
   the primary image first, the rest in sort_order; pieces
   without photos keep the category artwork views. Unknown,
   inactive, archived or malformed ids land on the clean
   not-available state; network failures get Retry. Price shows
   only when price_visible allows it — otherwise the page says
   "Price on Request" and the hidden price never enters page
   state. Similar pieces load live too. CTAs stay frontend UI:
   Quote opens the live quote flow, Enquire links to the contact
   page, Favourites is in-page state.
   ============================================================ */
(function () {
  'use strict';

  var product = document.getElementById('jd-product');
  if (!product) return; // jewellery details page only

  var shared = window.NGDJewelCard;
  var esc = shared.esc;
  var dash = '—';

  var stickyBar = document.getElementById('jd-sticky');
  var notfound = document.getElementById('jd-notfound');
  var loading = document.getElementById('jd-loading');
  var errorBox = document.getElementById('jd-error');

  function showOnly(stage) {
    product.classList.toggle('d-none', stage !== 'product');
    if (stickyBar) stickyBar.classList.toggle('d-none', stage !== 'product');
    notfound.classList.toggle('d-none', stage !== 'notfound');
    loading.classList.toggle('d-none', stage !== 'loading');
    errorBox.classList.toggle('d-none', stage !== 'error');
  }

  /* ---------- live data ---------- */

  var AVAIL_LABELS = { available: 'In Stock', made_to_order: 'Made to Order', sold: 'Sold' };

  /* Storefront columns only — internal_notes / created_by are never
     requested by the public pages. */
  var COLUMNS = 'id,public_id,sku,product_name,category,subcategory,short_description,' +
    'description,metal,metal_karat,metal_color,gross_weight,diamond_weight,diamond_pieces,' +
    'diamond_quality,diamond_shape,certificate_number,size,price,currency,price_visible,availability';

  function num(value) {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  function mapPiece(p) {
    var piece = {
      id: p.sku || p.public_id || dash,
      publicId: p.public_id || '',
      rowId: p.id,
      sku: p.sku || p.public_id || dash,
      name: p.product_name || dash,
      category: p.category || 'Other',
      subcategory: p.subcategory || '',
      description: p.short_description || '',
      fullDesc: p.description || '',
      metal: p.metal || dash,
      metalKarat: p.metal_karat || '',
      metalColour: p.metal_color || '',
      weightCt: num(p.diamond_weight),
      diamondPieces: num(p.diamond_pieces) || 0,
      diamondQuality: p.diamond_quality || null,
      diamondShape: p.diamond_shape || null,
      certificateNo: p.certificate_number || null,
      grossWeight: num(p.gross_weight),
      size: p.size || null,
      availability: AVAIL_LABELS[p.availability] || p.availability || 'On Request',
      images: []
    };
    /* a hidden price never enters page state, let alone the HTML */
    if (p.price_visible && num(p.price) !== null) {
      piece.price = num(p.price);
      piece.currency = p.currency || '';
    }
    return piece;
  }

  async function loadPiece(publicId) {
    var res = await window.ngdSupabase.from('jewellery').select(COLUMNS)
      .eq('public_id', publicId).eq('active', true).is('archived_at', null).limit(2);
    if (res.error) throw res.error;
    if (!res.data || res.data.length !== 1) return null;
    var piece = mapPiece(res.data[0]);
    /* the gallery: primary first, the rest in sort_order */
    try {
      var imgs = await window.ngdSupabase.from('jewellery_images')
        .select('image_path,sort_order,is_primary')
        .eq('jewellery_id', piece.rowId)
        .order('sort_order', { ascending: true });
      if (imgs.error) throw imgs.error;
      piece.images = (imgs.data || []).slice().sort(function (a, b) {
        return ((b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)) ||
          ((a.sort_order || 0) - (b.sort_order || 0));
      });
      piece.image_path = piece.images.length ? piece.images[0].image_path : null;
    } catch (err) {
      /* photos are an enhancement — the piece still renders with art */
      console.warn('[NGD Jewellery Details] images unavailable:', err);
    }
    return piece;
  }

  /** Best-effort: an empty Similar row must never break the page. */
  async function loadSimilar(piece) {
    try {
      var res = await window.ngdSupabase.from('jewellery')
        .select('id,public_id,sku,product_name,category,short_description,diamond_weight,availability')
        .eq('active', true).is('archived_at', null)
        .neq('public_id', piece.publicId)
        .order('created_at', { ascending: false })
        .limit(24);
      if (res.error) throw res.error;
      var pool = (res.data || []).map(function (row) {
        return {
          id: row.sku || row.public_id || dash,
          publicId: row.public_id || '',
          rowId: row.id,
          name: row.product_name || dash,
          category: row.category || 'Other',
          description: row.short_description || '',
          weightCt: num(row.diamond_weight),
          availability: AVAIL_LABELS[row.availability] || row.availability || 'On Request',
          image_path: null
        };
      });
      try {
        var imgs = await window.ngdSupabase.from('jewellery_images')
          .select('jewellery_id,image_path').eq('is_primary', true);
        if (!imgs.error) {
          var byId = {};
          (imgs.data || []).forEach(function (img) { byId[img.jewellery_id] = img.image_path; });
          pool.forEach(function (row) { row.image_path = byId[row.rowId] || null; });
        }
      } catch (ignored) { /* art fallback */ }
      var sameCat = pool.filter(function (p) { return p.category === piece.category; });
      var others = pool.filter(function (p) { return p.category !== piece.category; });
      return sameCat.concat(others).slice(0, 3);
    } catch (err) {
      console.warn('[NGD Jewellery Details] similar pieces unavailable:', err);
      return [];
    }
  }

  /* ---------- render one verified piece ---------- */
  function render(piece) {
    /* ----- gallery views ----- */
    function svgInner(svg) {
      return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    }

    var baseArt = (window.NGD_JEWEL_ART || {})[piece.category.toLowerCase()] || '';
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

    /* Real photos (primary first, then sort_order) when the piece has
       them; category artwork views otherwise. */
    function photoViews() {
      var views = [];
      for (var i = 0; i < piece.images.length; i++) {
        var path = piece.images[i] && piece.images[i].image_path;
        var url = path && window.ngdStorageUrl ? window.ngdStorageUrl('jewellery-images', path) : '';
        if (!url) continue;
        views.push({
          key: 'photo-' + (i + 1),
          label: 'Photo ' + (i + 1),
          svg: '<img class="ngd-media-photo" src="' + esc(url) + '" alt="' +
            esc(piece.name) + ' — photo ' + (i + 1) + '">'
        });
      }
      return views;
    }

    var livePhotos = photoViews();
    var VIEWS = livePhotos.length
      ? livePhotos.concat([{ key: 'spin', label: '360° view (coming soon)', spin: true }])
      : [
        { key: 'front', label: 'Front view', svg: baseArt },
        { key: 'detail', label: 'Setting detail', svg: detailArt() },
        { key: 'profile', label: 'Alternate angle', svg: profileArt() },
        { key: 'spin', label: '360° view (coming soon)', spin: true }
      ];

    var stage = document.getElementById('jd-stage');
    var stageInner = document.getElementById('jd-stage-inner');
    var thumbs = document.getElementById('jd-thumbs');
    var zoomHint = document.getElementById('jd-zoomhint');
    var activeView = VIEWS[0].key;

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
        'aria-label="' + esc(v.label) + '" title="' + esc(v.label) + '">' + inner + '</button>'
      );
    }).join('');

    thumbs.addEventListener('click', function (event) {
      var btn = event.target.closest('.ngd-thumb');
      if (!btn) return;
      activeView = btn.getAttribute('data-view');
      renderStage();
    });

    /* ----- zoom interaction (not on the 360° slot) ----- */
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

    /* ----- information column ----- */
    function val(v) { return v === null || v === undefined || v === '' ? dash : v; }
    var grossWeightText = piece.grossWeight === null ? dash : piece.grossWeight.toFixed(2) + ' g';
    var catLabel = [piece.category, piece.subcategory].filter(Boolean).join(' · ');

    document.title = piece.name + ' · ' + piece.id + ' — New Grown Diamond';
    document.getElementById('jd-sku').textContent = piece.sku;
    document.getElementById('jd-name').textContent = piece.name;
    document.getElementById('jd-chips').innerHTML =
      shared.availBadge(piece) +
      '<span class="ngd-badge">' + esc(catLabel) + '</span>' +
      (piece.weightCt !== null
        ? '<span class="ngd-weight-chip">' + piece.weightCt.toFixed(2) + ' ct diamonds</span>'
        : '');
    document.getElementById('jd-short').textContent = piece.description;
    document.getElementById('jd-fulldesc').textContent = piece.fullDesc;

    /* price respects price_visible — a hidden price is simply not here */
    var priceEl = document.getElementById('jd-price');
    if (priceEl) {
      if (piece.price !== undefined && isFinite(piece.price)) {
        priceEl.textContent = (piece.currency ? piece.currency + ' ' : '') +
          piece.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        priceEl.classList.remove('ngd-text-muted');
      } else {
        priceEl.textContent = 'Price on Request';
        priceEl.classList.add('ngd-text-muted');
      }
    }

    var metalName = piece.metal === 'Platinum'
      ? 'Platinum 950'
      : [piece.metalKarat, piece.metalColour, piece.metal === dash ? '' : piece.metal]
        .filter(Boolean).join(' ') || 'precious metal';

    var SPEC_FIELDS = [
      ['Product Name', piece.name, true],
      ['SKU', piece.sku],
      ['Category', piece.category],
      ['Subcategory', val(piece.subcategory)],
      ['Metal', piece.metal],
      ['Metal Karat', val(piece.metalKarat)],
      ['Metal Colour', val(piece.metalColour)],
      ['Diamond Weight', piece.weightCt === null ? dash : piece.weightCt.toFixed(2) + ' ct'],
      ['Diamond Pieces', piece.diamondPieces === 0 ? dash : String(piece.diamondPieces)],
      ['Diamond Quality', val(piece.diamondQuality)],
      ['Diamond Shape', val(piece.diamondShape)],
      ['Certificate Number', val(piece.certificateNo)],
      ['Gross Weight', grossWeightText],
      ['Size', val(piece.size), true],
      ['Availability', piece.availability]
    ];

    document.getElementById('jd-specs').innerHTML = SPEC_FIELDS.map(function (f) {
      return '<div' + (f[2] ? ' class="ngd-spec-wide"' : '') + '><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
    }).join('');

    /* ----- CTAs — quote + hold open the live request flows, favourites
       is the RLS-backed favourites service keyed by the row uuid ----- */
    var enquireUrl = 'contact.html?piece=' + encodeURIComponent(piece.id) + '&type=enquiry';
    document.getElementById('jd-enquire').setAttribute('href', enquireUrl);
    window.NGDBindQuoteButtons(
      [document.getElementById('jd-quote'), document.getElementById('jd-sticky-quote')],
      { type: 'jewellery', reference: piece.id, title: piece.name }
    );
    window.NGDBindHoldButtons(
      [document.getElementById('jd-hold'), document.getElementById('jd-sticky-hold')],
      { type: 'jewellery', reference: piece.publicId, title: piece.name }
    );

    var favButtons = [document.getElementById('jd-fav'), document.getElementById('jd-sticky-fav')];
    window.NGDFavourites.bind(
      favButtons, 'jewellery', piece.rowId, document.getElementById('jd-fav-label')
    ).catch(function (error) { console.error('[NGD Favourites]', error); });

    /* ----- certificate / quality ----- */
    var certText = document.getElementById('jd-cert-text');
    if (piece.certificateNo) {
      certText.innerHTML =
        'Stones graded ' + esc(val(piece.diamondQuality)) + ' · Report <strong>' + esc(piece.certificateNo) + '</strong>';
    } else {
      certText.textContent = 'An all-metal piece — hallmarked ' + metalName + ', no diamond certificate applies.';
      document.getElementById('jd-cert-btn').classList.add('d-none');
    }

    /* ----- full specification card ----- */
    var GROUPS = [
      { title: 'The Piece', rows: [
        ['SKU', piece.sku], ['Category', piece.category], ['Subcategory', val(piece.subcategory)],
        ['Size', val(piece.size)], ['Gross Weight', grossWeightText],
        ['Availability', piece.availability]
      ] },
      { title: 'The Metal', rows: [
        ['Metal', piece.metal], ['Karat', val(piece.metalKarat)], ['Colour', val(piece.metalColour)]
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
        '<h3 class="ngd-spec-group-title">' + esc(g.title) + '</h3>' +
        '<dl class="mb-0">' +
        g.rows.map(function (r) {
          return '<div class="ngd-spec-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join('') +
        '</dl></div>'
      );
    }).join('');

    /* ----- similar pieces — live, best effort ----- */
    loadSimilar(piece).then(function (similar) {
      document.getElementById('jd-similar').innerHTML = similar.map(shared.cardHtml).join('');
      if (window.NGDTilt) window.NGDTilt(document.getElementById('jd-similar'));
    });

    renderStage();

  }

  /* ---------- boot ---------- */
  async function boot() {
    var requestedId = (new URLSearchParams(window.location.search).get('id') || '').trim();
    showOnly('loading');
    if (!/^JEW-[A-Z0-9]{8}$/i.test(requestedId)) {
      showOnly('notfound');
      document.title = 'Piece not available — New Grown Diamond';
      return;
    }
    var piece;
    try {
      piece = await loadPiece(requestedId);
    } catch (err) {
      /* customers never see raw Supabase internals */
      console.error('[NGD Jewellery Details] load failed:', err);
      showOnly('error');
      document.title = 'Jewellery Details — New Grown Diamond';
      return;
    }
    if (!piece) {
      showOnly('notfound');
      document.title = 'Piece not available — New Grown Diamond';
      return;
    }
    showOnly('product');
    render(piece);
    /* WhatsApp enquiry: public facts + the current page URL only —
       the shared helper owns the number, encoding and analytics. */
    var whatsappCta = document.getElementById('jd-whatsapp');
    if (whatsappCta && window.NGDWhatsApp) {
      window.NGDWhatsApp.bind(whatsappCta, {
        productType: 'jewellery',
        productId: piece.publicId,
        message: window.NGDWhatsApp.buildJewelleryMessage({
          name: piece.name, sku: piece.sku, category: piece.category,
          url: window.location.href
        })
      });
    }
    /* Public facts go to the SEO engine — a saved admin override still
       wins; without one the page's tags are generated from this piece. */
    if (window.NGDSeo && window.NGDSeo.applyProduct) {
      var seoVal = function (v) { return v && v !== dash ? v : ''; };
      window.NGDSeo.applyProduct({
        type: 'jewellery', publicId: piece.publicId,
        name: seoVal(piece.name), category: seoVal(piece.category),
        description: seoVal(piece.description), weightCt: piece.weightCt,
        availability: seoVal(piece.availability),
        image: piece.image_path && window.ngdStorageUrl
          ? window.ngdStorageUrl('jewellery-images', piece.image_path) : ''
      });
    }
  }

  document.getElementById('jd-retry').addEventListener('click', boot);

  boot();
})();
