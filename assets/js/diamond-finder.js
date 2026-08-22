/* ============================================================
   NEW GROWN DIAMOND — Smart Diamond Finder
   ------------------------------------------------------------
   A guided, deterministic selector over the LIVE public.diamonds
   table (active, non-archived stones only — the same storefront
   rules as the inventory). No AI, no new tables: focused Supabase
   queries keep the candidate set small, then JavaScript ranks it.

   Preferences (all optional):
     shape (single) · carat min/max · colour multi · clarity
     multi · cut multi · budget min/max ("Optional — applies only
     where a price is public": a hidden price NEVER enters page
     state, and stones without a public price are never judged
     against a budget).

   Candidate tiers (≤ 3 queries per search):
     1. every chosen hard filter (shape + carat range)
     2. the same shape, any carat (or a widened carat window
        when no shape was chosen)
     3. the newest active stones, nearest by carat client-side

   Scoring (preference weights, not gemological judgements):
     shape +30 · carat in range +20 · colour nearest selected
     grade exact +20 / 1 off +10 / 2 off +4 · clarity the same
     ladder · cut selected +10 · public price within budget +10.
     Unknown grades score nothing. Ties break by carat closeness,
     then public id — fully deterministic.

   Labels stay neutral: Best Match (every set preference met),
   Close Match (tier 1, some preference missed), Similar Option
   (relaxed tiers). Never "better/best diamond", never invented
   percentages. Cards reuse the shared NGDDiamondCard renderer,
   so Compare / View Details keep working unchanged.
   ============================================================ */
(function () {
  'use strict';

  var LIMIT = 6;
  var MIN_POOL = 6;
  var dash = '—';

  /* Storefront columns only — internal notes / creator ids never leave
     the database for public pages. Price columns are gated below. */
  var COLUMNS = 'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,' +
    'availability,image_path,total_price,currency,price_visible,created_at';

  /* The supported inventory vocabulary (mirrors the admin form). */
  var SHAPES = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise'];
  var COLOURS = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
  var CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'];
  var CUTS = ['Ideal', 'Excellent', 'Very Good', 'Good'];
  var COLOR_ORDER = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  var CLARITY_ORDER = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];

  function emptyPrefs() {
    return {
      shape: null, caratMin: null, caratMax: null,
      colours: [], clarities: [], cuts: [],
      budgetMin: null, budgetMax: null
    };
  }

  function hasAnyPref(prefs) {
    return !!(prefs.shape || prefs.caratMin !== null || prefs.caratMax !== null ||
      prefs.colours.length || prefs.clarities.length || prefs.cuts.length ||
      prefs.budgetMin !== null || prefs.budgetMax !== null);
  }

  function mapStone(d) {
    var stone = {
      id: d.stock_number || d.public_id || dash,
      publicId: (d.public_id || '').toUpperCase(),
      shape: d.shape || dash,
      carat: Number(d.carat) || 0,
      colour: d.color || dash,
      clarity: d.clarity || dash,
      cut: d.cut || dash,
      lab: d.laboratory || dash,
      availability: d.availability || 'On Request',
      image_path: d.image_path || null
    };
    /* a hidden price never enters page state, let alone the HTML */
    if (d.price_visible && isFinite(Number(d.total_price)) && d.total_price !== null) {
      stone.price = Number(d.total_price);
      stone.currency = d.currency || '';
    }
    return stone;
  }

  /* ---------- shareable URL (plain preferences only) ---------- */

  function num(value) {
    var n = parseFloat(value);
    return isFinite(n) && n >= 0 ? n : null;
  }

  function pickList(csv, vocab) {
    return String(csv || '').split(',').map(function (v) { return v.trim(); })
      .filter(function (v, i, all) { return vocab.indexOf(v) !== -1 && all.indexOf(v) === i; });
  }

  function readParams(search) {
    var params = new URLSearchParams(search || '');
    var prefs = emptyPrefs();
    var shape = (params.get('shape') || '').trim();
    SHAPES.forEach(function (s) { if (s.toLowerCase() === shape.toLowerCase()) prefs.shape = s; });
    prefs.caratMin = num(params.get('minCarat'));
    prefs.caratMax = num(params.get('maxCarat'));
    prefs.colours = pickList((params.get('colour') || '').toUpperCase(), COLOURS);
    prefs.clarities = pickList((params.get('clarity') || '').toUpperCase(), CLARITIES);
    prefs.cuts = pickList(params.get('cut'), CUTS);
    prefs.budgetMin = num(params.get('minBudget'));
    prefs.budgetMax = num(params.get('maxBudget'));
    return prefs;
  }

  function buildParams(prefs) {
    var params = new URLSearchParams();
    if (prefs.shape) params.set('shape', prefs.shape);
    if (prefs.caratMin !== null) params.set('minCarat', String(prefs.caratMin));
    if (prefs.caratMax !== null) params.set('maxCarat', String(prefs.caratMax));
    if (prefs.colours.length) params.set('colour', prefs.colours.join(','));
    if (prefs.clarities.length) params.set('clarity', prefs.clarities.join(','));
    if (prefs.cuts.length) params.set('cut', prefs.cuts.join(','));
    if (prefs.budgetMin !== null) params.set('minBudget', String(prefs.budgetMin));
    if (prefs.budgetMax !== null) params.set('maxBudget', String(prefs.budgetMax));
    return params.toString();
  }

  /* ---------- deterministic matching ---------- */

  function nearestGrade(order, selected, value) {
    var iv = order.indexOf(String(value || '').toUpperCase());
    if (iv === -1 || !selected.length) return null;
    var best = null;
    selected.forEach(function (pick) {
      var ip = order.indexOf(pick);
      if (ip === -1) return;
      var d = Math.abs(iv - ip);
      if (best === null || d < best) best = d;
    });
    return best;
  }

  function caratMid(prefs) {
    if (prefs.caratMin !== null && prefs.caratMax !== null) return (prefs.caratMin + prefs.caratMax) / 2;
    if (prefs.caratMin !== null) return prefs.caratMin;
    if (prefs.caratMax !== null) return prefs.caratMax;
    return null;
  }

  function caratInRange(prefs, stone) {
    if (prefs.caratMin === null && prefs.caratMax === null) return null; // no claim
    if (prefs.caratMin !== null && stone.carat < prefs.caratMin) return false;
    if (prefs.caratMax !== null && stone.carat > prefs.caratMax) return false;
    return true;
  }

  function budgetVerdict(prefs, stone) {
    if (prefs.budgetMin === null && prefs.budgetMax === null) return null; // not asked
    if (stone.price === undefined) return 'unknown'; // price not public — no claim either way
    if (prefs.budgetMin !== null && stone.price < prefs.budgetMin) return false;
    if (prefs.budgetMax !== null && stone.price > prefs.budgetMax) return false;
    return true;
  }

  function scoreStone(prefs, stone) {
    var score = 0;
    if (prefs.shape && stone.shape === prefs.shape) score += 30;
    if (caratInRange(prefs, stone) === true) score += 20;
    var colour = nearestGrade(COLOR_ORDER, prefs.colours, stone.colour);
    if (colour === 0) score += 20; else if (colour === 1) score += 10; else if (colour === 2) score += 4;
    var clarity = nearestGrade(CLARITY_ORDER, prefs.clarities, stone.clarity);
    if (clarity === 0) score += 20; else if (clarity === 1) score += 10; else if (clarity === 2) score += 4;
    if (prefs.cuts.length && prefs.cuts.indexOf(stone.cut) !== -1) score += 10;
    if (budgetVerdict(prefs, stone) === true) score += 10;
    return score;
  }

  /** Best Match = every preference the customer actually set is met.
      A budget can only be verified against a PUBLIC price. */
  function isExactMatch(prefs, stone) {
    if (prefs.shape && stone.shape !== prefs.shape) return false;
    if (caratInRange(prefs, stone) === false) return false;
    if (prefs.colours.length && prefs.colours.indexOf(stone.colour) === -1) return false;
    if (prefs.clarities.length && prefs.clarities.indexOf(stone.clarity) === -1) return false;
    if (prefs.cuts.length && prefs.cuts.indexOf(stone.cut) === -1) return false;
    var budget = budgetVerdict(prefs, stone);
    if (budget === false || budget === 'unknown') return false;
    return true;
  }

  /* Factual, neutral reasons — never percentages, never "better". */
  function matchReasons(prefs, stone) {
    var reasons = [];
    if (prefs.shape && stone.shape === prefs.shape) reasons.push('Matches your ' + prefs.shape + ' preference');
    if (caratInRange(prefs, stone) === true) reasons.push('Within your selected carat range');
    if (prefs.colours.length && prefs.colours.indexOf(stone.colour) !== -1) reasons.push('Selected colour');
    if (prefs.clarities.length && prefs.clarities.indexOf(stone.clarity) !== -1) reasons.push('Selected clarity');
    if (prefs.cuts.length && prefs.cuts.indexOf(stone.cut) !== -1) reasons.push('Selected cut');
    if (budgetVerdict(prefs, stone) === true) reasons.push('Within your budget');
    return reasons.slice(0, 2);
  }

  /* ---------- candidates (≤ 3 focused queries, never one per stone) ---------- */

  async function fetchCandidates(prefs) {
    var seen = {};
    var pool = [];
    function absorb(rows, tier) {
      (rows || []).forEach(function (row) {
        if (row.public_id && !seen[row.public_id]) {
          seen[row.public_id] = true;
          pool.push({ stone: mapStone(row), tier: tier });
        }
      });
    }
    function base() {
      return window.ngdSupabase.from('diamonds').select(COLUMNS)
        .eq('active', true).is('archived_at', null);
    }

    /* tier 1 — every hard filter the customer chose */
    var exact = base();
    if (prefs.shape) exact = exact.eq('shape', prefs.shape);
    if (prefs.caratMin !== null) exact = exact.gte('carat', prefs.caratMin);
    if (prefs.caratMax !== null) exact = exact.lte('carat', prefs.caratMax);
    var res = await exact.order('created_at', { ascending: false }).limit(60);
    if (res.error) throw res.error;
    absorb(res.data, 1);
    var tier1Count = pool.length;

    /* tier 2 — relax the carat range (keep the shape signal) */
    if (pool.length < MIN_POOL && (prefs.shape || prefs.caratMin !== null || prefs.caratMax !== null)) {
      var wide = base();
      if (prefs.shape) {
        wide = wide.eq('shape', prefs.shape);
      } else {
        var mid = caratMid(prefs);
        if (mid !== null) wide = wide.gte('carat', Math.max(0, mid - 0.75)).lte('carat', mid + 0.75);
      }
      var wideRes = await wide.order('created_at', { ascending: false }).limit(40);
      if (wideRes.error) throw wideRes.error;
      absorb(wideRes.data, 2);
    }

    /* tier 3 — the newest active stones, ranked by carat closeness client-side */
    if (pool.length < MIN_POOL) {
      var any = await base().order('created_at', { ascending: false }).limit(24);
      if (any.error) throw any.error;
      absorb(any.data, 3);
    }

    return { pool: pool, tier1Count: tier1Count };
  }

  /** The whole search: fetch tiers, score, split into Best / Close. */
  async function runSearch(prefs) {
    var fetched = await fetchCandidates(prefs);
    var mid = caratMid(prefs);
    var ranked = fetched.pool.map(function (entry) {
      return {
        stone: entry.stone,
        tier: entry.tier,
        score: scoreStone(prefs, entry.stone),
        exact: entry.tier === 1 && isExactMatch(prefs, entry.stone),
        reasons: matchReasons(prefs, entry.stone)
      };
    }).sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      if (mid !== null) {
        var da = Math.abs(a.stone.carat - mid);
        var db = Math.abs(b.stone.carat - mid);
        if (da !== db) return da - db;
      } else if (a.stone.carat !== b.stone.carat) {
        return b.stone.carat - a.stone.carat;
      }
      return a.stone.publicId < b.stone.publicId ? -1 : 1;
    });

    ranked.forEach(function (entry) {
      entry.label = entry.exact ? 'Best Match' : (entry.tier === 1 ? 'Close Match' : 'Similar Option');
    });

    var best = ranked.filter(function (e) { return e.exact; }).slice(0, LIMIT);
    var close = ranked.filter(function (e) { return !e.exact; }).slice(0, LIMIT);
    return { best: best, close: close, total: fetched.pool.length, tier1Count: fetched.tier1Count };
  }

  window.NGDDiamondFinder = {
    LIMIT: LIMIT,
    SHAPES: SHAPES, COLOURS: COLOURS, CLARITIES: CLARITIES, CUTS: CUTS,
    emptyPrefs: emptyPrefs,
    readParams: readParams,
    buildParams: buildParams,
    scoreStone: scoreStone,
    isExactMatch: isExactMatch,
    matchReasons: matchReasons,
    fetchCandidates: fetchCandidates,
    runSearch: runSearch
  };

  /* ============================================================
     Page controller — only on diamond-finder.html
     ============================================================ */
  var app = document.getElementById('df-app');
  if (!app) return;

  var STEPS = [
    { key: 'shape', label: 'Shape' },
    { key: 'carat', label: 'Carat' },
    { key: 'colour', label: 'Colour' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'cut', label: 'Cut' },
    { key: 'budget', label: 'Budget' }
  ];
  var CARAT_PRESETS = [
    { label: 'Under 1 ct', min: null, max: 0.99 },
    { label: '1–1.49 ct', min: 1, max: 1.49 },
    { label: '1.5–1.99 ct', min: 1.5, max: 1.99 },
    { label: '2–2.99 ct', min: 2, max: 2.99 },
    { label: '3 ct+', min: 3, max: null }
  ];

  var prefs = emptyPrefs();
  var step = 0;
  var searching = false;

  function $(id) { return document.getElementById(id); }

  /* ---- build the option buttons from the single vocabulary ---- */
  function optionButton(key, value) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ngd-find-opt';
    btn.setAttribute('data-find-key', key);
    btn.setAttribute('value', value);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = value;
    return btn;
  }

  function buildOptions() {
    var hosts = {
      shape: { el: $('df-opts-shape'), values: SHAPES },
      colour: { el: $('df-opts-colour'), values: COLOURS },
      clarity: { el: $('df-opts-clarity'), values: CLARITIES },
      cut: { el: $('df-opts-cut'), values: CUTS }
    };
    Object.keys(hosts).forEach(function (key) {
      var host = hosts[key];
      if (!host.el) return;
      host.values.forEach(function (value) { host.el.appendChild(optionButton(key, value)); });
    });
    var presets = $('df-carat-presets');
    if (presets) {
      CARAT_PRESETS.forEach(function (preset, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ngd-find-opt';
        btn.setAttribute('data-carat-preset', String(index));
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = preset.label;
        presets.appendChild(btn);
      });
    }
  }

  /* ---- keep the controls honest against the prefs state ---- */
  function pressed(btn, on) {
    btn.setAttribute('aria-pressed', String(!!on));
    btn.classList.toggle('is-on', !!on);
  }

  function syncControls() {
    app.querySelectorAll('[data-find-key]').forEach(function (btn) {
      var key = btn.getAttribute('data-find-key');
      var value = btn.getAttribute('value');
      if (key === 'shape') pressed(btn, prefs.shape === value);
      else if (key === 'colour') pressed(btn, prefs.colours.indexOf(value) !== -1);
      else if (key === 'clarity') pressed(btn, prefs.clarities.indexOf(value) !== -1);
      else if (key === 'cut') pressed(btn, prefs.cuts.indexOf(value) !== -1);
    });
    app.querySelectorAll('[data-carat-preset]').forEach(function (btn) {
      var preset = CARAT_PRESETS[parseInt(btn.getAttribute('data-carat-preset'), 10)];
      pressed(btn, !!preset && prefs.caratMin === preset.min && prefs.caratMax === preset.max);
    });
    $('df-carat-min').value = prefs.caratMin === null ? '' : String(prefs.caratMin);
    $('df-carat-max').value = prefs.caratMax === null ? '' : String(prefs.caratMax);
    $('df-budget-min').value = prefs.budgetMin === null ? '' : String(prefs.budgetMin);
    $('df-budget-max').value = prefs.budgetMax === null ? '' : String(prefs.budgetMax);
  }

  function renderStepper() {
    var host = $('df-steps');
    host.innerHTML = '';
    STEPS.forEach(function (s, index) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ngd-find-step' + (index === step ? ' is-active' : '') + (index < step ? ' is-done' : '');
      chip.setAttribute('data-find-step', String(index));
      if (index === step) chip.setAttribute('aria-current', 'step');
      chip.innerHTML = '<em>' + (index + 1) + '</em> ' + s.label;
      host.appendChild(chip);
    });
    STEPS.forEach(function (s, index) {
      var panel = $('df-panel-' + s.key);
      if (panel) panel.hidden = index !== step;
    });
    $('df-prev').hidden = step === 0;
    $('df-next').hidden = step === STEPS.length - 1;
    $('df-search').classList.toggle('ngd-btn-gold', step === STEPS.length - 1);
    $('df-search').classList.toggle('ngd-btn-outline', step !== STEPS.length - 1);
  }

  function goto(next) {
    step = Math.max(0, Math.min(STEPS.length - 1, next));
    renderStepper();
  }

  /* ---- results ---- */
  function setStage(stage) {
    $('df-loading').hidden = stage !== 'loading';
    $('df-error').hidden = stage !== 'error';
    $('df-results').hidden = stage !== 'ready';
    $('df-empty').hidden = true;
  }

  function decorate(grid, entries) {
    entries.forEach(function (entry, index) {
      var column = grid.children[index];
      if (!column) return;
      var media = column.querySelector('.ngd-diamond-media');
      if (media) {
        var chip = document.createElement('span');
        chip.className = 'ngd-find-label' + (entry.exact ? ' is-best' : '');
        chip.textContent = entry.label;
        media.appendChild(chip);
      }
      if (entry.reasons.length) {
        var body = column.querySelector('.ngd-diamond-body');
        var note = document.createElement('p');
        note.className = 'ngd-find-reasons';
        note.textContent = entry.reasons.join(' · ');
        if (body) body.appendChild(note);
      }
    });
  }

  function renderResults(result) {
    var cardHtml = window.NGDDiamondCard.cardHtml;
    var bestWrap = $('df-best');
    var closeWrap = $('df-close');
    var bestGrid = $('df-best-grid');
    var closeGrid = $('df-close-grid');

    bestWrap.hidden = result.best.length === 0;
    bestGrid.innerHTML = result.best.map(function (e) { return cardHtml(e.stone); }).join('');
    decorate(bestGrid, result.best);

    closeWrap.hidden = result.close.length === 0;
    $('df-close-title').textContent = result.best.length ? 'Close Matches' : 'Close alternatives';
    closeGrid.innerHTML = result.close.map(function (e) { return cardHtml(e.stone); }).join('');
    decorate(closeGrid, result.close);

    $('df-noexact').hidden = !(result.best.length === 0 && result.close.length > 0);
    $('df-empty').hidden = !(result.best.length === 0 && result.close.length === 0);

    var shown = result.best.length + result.close.length;
    $('df-summary').textContent = shown
      ? 'Showing ' + shown + ' of ' + result.total + ' matching stones from the live inventory.'
      : '';

    if (window.NGDTilt) {
      window.NGDTilt(bestGrid);
      window.NGDTilt(closeGrid);
    }
    if (window.NGDDiamondCompare) window.NGDDiamondCompare.refresh();
  }

  async function search() {
    if (searching) return;
    searching = true;
    setStage('loading');

    /* the shareable URL mirrors the current preferences — never auth
       data, never product JSON */
    var qs = buildParams(prefs);
    window.history.replaceState(null, '', 'diamond-finder.html' + (qs ? '?' + qs : ''));

    /* lightweight analytics — preferences only, never identity */
    window.dispatchEvent(new CustomEvent('ngd:diamond-finder-search', {
      detail: {
        shape: prefs.shape,
        minCarat: prefs.caratMin,
        maxCarat: prefs.caratMax,
        colours: prefs.colours.slice(),
        clarities: prefs.clarities.slice(),
        cuts: prefs.cuts.slice(),
        hasBudget: prefs.budgetMin !== null || prefs.budgetMax !== null
      }
    }));

    try {
      var result = await runSearch(prefs);
      setStage('ready');
      renderResults(result);
      $('df-results').scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch (error) {
      /* customers never see raw Supabase internals */
      console.error('[NGD Finder] search failed:', error);
      setStage('error');
    }
    searching = false;
  }

  function startOver() {
    prefs = emptyPrefs();
    syncControls();
    goto(0);
    window.history.replaceState(null, '', 'diamond-finder.html');
    $('df-results').hidden = true;
    $('df-loading').hidden = true;
    $('df-error').hidden = true;
    $('df-empty').hidden = true;
    $('df-wizard').scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  /* ---- events ---- */
  function toggleFromList(list, value) {
    var at = list.indexOf(value);
    if (at === -1) list.push(value); else list.splice(at, 1);
  }

  app.addEventListener('click', function (event) {
    var opt = event.target.closest('[data-find-key]');
    if (opt) {
      var key = opt.getAttribute('data-find-key');
      var value = opt.getAttribute('value');
      if (key === 'shape') prefs.shape = prefs.shape === value ? null : value;
      else if (key === 'colour') toggleFromList(prefs.colours, value);
      else if (key === 'clarity') toggleFromList(prefs.clarities, value);
      else if (key === 'cut') toggleFromList(prefs.cuts, value);
      syncControls();
      return;
    }
    var preset = event.target.closest('[data-carat-preset]');
    if (preset) {
      var pick = CARAT_PRESETS[parseInt(preset.getAttribute('data-carat-preset'), 10)];
      if (pick) {
        var already = prefs.caratMin === pick.min && prefs.caratMax === pick.max;
        prefs.caratMin = already ? null : pick.min;
        prefs.caratMax = already ? null : pick.max;
        syncControls();
      }
      return;
    }
    var chip = event.target.closest('[data-find-step]');
    if (chip) goto(parseInt(chip.getAttribute('data-find-step'), 10));
  });

  function bindRange(minId, maxId, minKey, maxKey) {
    ['input', 'change'].forEach(function (evt) {
      [$(minId), $(maxId)].forEach(function (input) {
        input.addEventListener(evt, function () {
          prefs[minKey] = num($(minId).value);
          prefs[maxKey] = num($(maxId).value);
          app.querySelectorAll('[data-carat-preset]').forEach(function (btn) {
            var preset = CARAT_PRESETS[parseInt(btn.getAttribute('data-carat-preset'), 10)];
            pressed(btn, !!preset && prefs.caratMin === preset.min && prefs.caratMax === preset.max);
          });
        });
      });
    });
  }

  function init() {
    buildOptions();
    bindRange('df-carat-min', 'df-carat-max', 'caratMin', 'caratMax');
    bindRange('df-budget-min', 'df-budget-max', 'budgetMin', 'budgetMax');
    $('df-prev').addEventListener('click', function () { goto(step - 1); });
    $('df-next').addEventListener('click', function () { goto(step + 1); });
    $('df-search').addEventListener('click', search);
    $('df-retry').addEventListener('click', search);
    $('df-reset').addEventListener('click', startOver);

    /* a shared link restores its selections — and runs the search */
    var fromUrl = readParams(window.location.search);
    if (hasAnyPref(fromUrl)) {
      prefs = fromUrl;
      syncControls();
      goto(0);
      search();
    } else {
      syncControls();
      renderStepper();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
