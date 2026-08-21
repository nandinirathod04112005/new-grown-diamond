/* ============================================================
   NEW GROWN DIAMOND — compare page (LIVE)
   ------------------------------------------------------------
   Renders compare-diamonds.html from the shared selection
   (assets/js/diamond-compare.js — public ids only). Every visit
   re-fetches those ids from public.diamonds through the shared
   Supabase client — ACTIVE, non-archived stones only — so the
   page always shows current truth, never stale localStorage
   objects. Ids that are no longer available are removed from
   the selection with an honest notice. Rows where stones differ
   are tinted; no stone is ever claimed "better". Favourites and
   quote requests reuse the existing services.
   ============================================================ */
(function () {
  'use strict';

  var dash = '—';
  var shared = window.NGDDiamondCard;
  var compare = window.NGDDiamondCompare;
  var esc = shared.esc;

  /* Storefront columns only — the same public set the details page
     reads; internal_notes / created_by never leave the database. */
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
      publicId: (d.public_id || '').toUpperCase(),
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

  var el = {};
  ['status', 'loading', 'empty', 'error', 'wrap', 'head', 'rows', 'note', 'retry', 'clear']
    .forEach(function (key) { el[key] = document.getElementById('cmp-' + key); });

  function showOnly(stage) {
    el.loading.classList.toggle('d-none', stage !== 'loading');
    el.empty.classList.toggle('d-none', stage !== 'empty');
    el.error.classList.toggle('d-none', stage !== 'error');
    el.wrap.classList.toggle('d-none', stage !== 'wrap');
  }

  function notice(kind, text) {
    el.status.innerHTML = text
      ? '<div class="ngd-alert ngd-alert-' + kind + '" role="status">' + esc(text) + '</div>'
      : '';
  }

  function pct(value) { return value === null ? dash : value + '%'; }
  function priceText(stone) {
    return stone.price !== undefined && isFinite(stone.price)
      ? (stone.currency ? stone.currency + ' ' : '') + stone.price.toLocaleString('en-US')
      : 'Price on Request';
  }

  /* Only fields the public schema actually carries — nothing invented. */
  var ROWS = [
    { label: 'Stock / ID', value: function (s) { return s.id; } },
    { label: 'Shape', diff: true, value: function (s) { return s.shape; } },
    { label: 'Carat', diff: true, value: function (s) { return s.carat ? s.carat.toFixed(2) + ' ct' : dash; } },
    { label: 'Colour', diff: true, value: function (s) { return s.colour; } },
    { label: 'Clarity', diff: true, value: function (s) { return s.clarity; } },
    { label: 'Cut', diff: true, value: function (s) { return s.cut; } },
    { label: 'Polish', diff: true, value: function (s) { return s.polish; } },
    { label: 'Symmetry', diff: true, value: function (s) { return s.symmetry; } },
    { label: 'Fluorescence', diff: true, value: function (s) { return s.fluorescence; } },
    { label: 'Laboratory', diff: true, value: function (s) { return s.lab; } },
    { label: 'Certificate No.', value: function (s) { return s.report; } },
    { label: 'Measurements', value: function (s) { return s.measurements; } },
    { label: 'Table %', diff: true, value: function (s) { return pct(s.tablePct); } },
    { label: 'Depth %', diff: true, value: function (s) { return pct(s.depthPct); } },
    { label: 'Ratio', diff: true, value: function (s) { return s.ratio === null ? dash : s.ratio.toFixed(2); } },
    { label: 'Growth', diff: true, value: function (s) { return s.growth; } },
    { label: 'Availability', diff: true, value: function (s) { return s.availability; } },
    { label: 'Price', diff: true, value: priceText }
  ];

  function headerCell(stone) {
    return '<th scope="col" class="ngd-cmp-col">' +
      '<div class="ngd-cmp-media">' + shared.artFor(stone) + '</div>' +
      '<p class="ngd-cmp-name">' + esc(stone.shape) + ' · ' + stone.carat.toFixed(2) + ' ct</p>' +
      '<p class="ngd-cmp-id">' + esc(stone.id) + '</p>' +
      shared.availBadge(stone) +
      '<div class="ngd-cmp-actions">' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm" href="' + shared.detailsUrl(stone) + '">View Details</a>' +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-fav-btn" data-cmp-fav="' + esc(stone.publicId) + '" aria-pressed="false">' +
      '<span class="ngd-fav-icon" aria-hidden="true">♡</span> Favourite</button>' +
      '<a class="ngd-btn ngd-btn-outline ngd-btn-sm" href="#" data-cmp-quote="' + esc(stone.publicId) + '">Request Quote</a>' +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-cmp-remove-col="' + esc(stone.publicId) + '">Remove</button>' +
      '</div></th>';
  }

  function distinct(values) {
    var seen = {};
    values.forEach(function (value) { seen[String(value)] = true; });
    return Object.keys(seen).length;
  }

  function render(stones) {
    if (!stones.length) {
      showOnly('empty');
      return;
    }
    el.head.innerHTML = '<tr><th scope="col" class="ngd-cmp-corner"><span class="visually-hidden">Attribute</span></th>' +
      stones.map(headerCell).join('') + '</tr>';
    el.rows.innerHTML = ROWS.map(function (row) {
      var values = stones.map(row.value);
      var differs = !!row.diff && stones.length > 1 && distinct(values) > 1;
      return '<tr' + (differs ? ' class="is-diff"' : '') + '>' +
        '<th scope="row">' + esc(row.label) +
        (differs ? ' <span class="ngd-cmp-diff-dot" title="Values differ" aria-label="Values differ"></span>' : '') +
        '</th>' +
        values.map(function (value) { return '<td>' + esc(value) + '</td>'; }).join('') +
        '</tr>';
    }).join('');
    el.note.textContent = stones.length === 1
      ? 'Add at least one more diamond to compare.'
      : stones.length + ' of ' + compare.MAX + ' diamonds — rows with a gold mark differ between stones.';

    /* actions: reuse the existing services, never duplicate their logic */
    stones.forEach(function (stone) {
      var favButton = el.head.querySelector('[data-cmp-fav="' + stone.publicId + '"]');
      if (favButton && window.NGDFavourites && stone.rowId) {
        window.NGDFavourites.bind([favButton], 'diamond', stone.rowId)
          .catch(function (error) { console.error('[NGD Favourites]', error); });
      }
      var quoteButton = el.head.querySelector('[data-cmp-quote="' + stone.publicId + '"]');
      if (quoteButton && window.NGDBindQuoteButtons) {
        window.NGDBindQuoteButtons([quoteButton], {
          type: 'diamond', reference: stone.id,
          title: stone.shape + ' · ' + stone.carat.toFixed(2) + ' ct'
        });
      }
    });
    el.head.querySelectorAll('[data-cmp-remove-col]').forEach(function (button) {
      button.onclick = function () { compare.remove(button.getAttribute('data-cmp-remove-col')); };
    });
    showOnly('wrap');
  }

  var cache = {};
  var busy = false;

  async function load() {
    var ids = compare.list();
    if (!ids.length) {
      showOnly('empty');
      return;
    }
    showOnly('loading');
    busy = true;
    try {
      var res = await window.ngdSupabase.from('diamonds').select(COLUMNS)
        .in('public_id', ids).eq('active', true).is('archived_at', null);
      if (res.error) throw res.error;
      cache = {};
      (res.data || []).forEach(function (row) {
        var stone = mapStone(row);
        if (stone.publicId) cache[stone.publicId] = stone;
      });
      var found = ids.filter(function (id) { return cache[id]; });
      var missing = ids.filter(function (id) { return !cache[id]; });
      if (missing.length) {
        missing.forEach(function (id) { compare.remove(id); });
        notice('info', missing.length === 1
          ? 'One selected diamond is no longer available and was removed from your comparison.'
          : missing.length + ' selected diamonds are no longer available and were removed from your comparison.');
      }
      render(found.map(function (id) { return cache[id]; }));
    } catch (error) {
      console.error('[NGD Compare] load failed:', error);
      showOnly('error');
    } finally {
      busy = false;
    }
  }

  function onSelectionChange() {
    if (busy) return;
    var ids = compare.list();
    if (!ids.length) {
      showOnly('empty');
      return;
    }
    if (ids.every(function (id) { return cache[id]; })) {
      render(ids.map(function (id) { return cache[id]; }));
    } else {
      load();
    }
  }

  function init() {
    if (!shared || !compare) return;
    if (!window.ngdSupabase) {
      showOnly('error');
      return;
    }
    el.retry.addEventListener('click', load);
    el.clear.addEventListener('click', function () { compare.clear(); });
    compare.onChange(onSelectionChange);
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
