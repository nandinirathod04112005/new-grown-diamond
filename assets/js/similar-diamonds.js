/* ============================================================
   NEW GROWN DIAMOND — Similar Diamonds engine
   ------------------------------------------------------------
   Upgrades the details page's original "similar stones" row
   (previously a newest-24 sample inside diamond-details.js)
   into a shared, deterministic recommendation engine
   (window.NGDSimilarDiamonds). No AI — similarity only, and
   never a "better/best" claim.

   Candidates come from focused Supabase queries (public,
   ACTIVE, non-archived stones only — never the current one),
   relaxing tier by tier until reasonable alternatives exist:

     1. the same shape (strongest signal — one query, ranked
        in JavaScript by carat/colour/clarity/cut/lab closeness)
     2. other shapes within a close carat window
     3. the newest active stones, any specification

   Scoring (similarity weights, not gemological judgements):
     same shape +100 · carat closeness up to +40 (±0.25 ct
     floor, widening for larger stones) · colour exact +20 /
     1 grade off +10 / 2 off +4 · clarity the same ladder ·
     same cut +10 · same laboratory +5. Unknown grades score
     nothing rather than guessing. Ties break by carat
     distance, then public id, so results are deterministic.

   Cards reuse the shared NGDDiamondCard renderer (Compare
   toggles ride along via the shared compare state) plus a
   small neutral label — "Same Shape", "Similar Carat" or
   "Alternative". Zero candidates show an honest message with
   a Browse All Diamonds path; a failed lookup hides the
   section and never breaks the details page. Only public
   storefront columns are ever selected — no prices, notes or
   admin metadata.
   ============================================================ */
(function () {
  'use strict';

  var LIMIT = 6;
  var dash = '—';
  var COLUMNS = 'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,availability,image_path';
  var COLOR_ORDER = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  var CLARITY_ORDER = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];

  function mapStone(d) {
    return {
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
  }

  function gradeDistance(order, a, b) {
    var ia = order.indexOf(String(a || '').toUpperCase());
    var ib = order.indexOf(String(b || '').toUpperCase());
    return ia === -1 || ib === -1 ? null : Math.abs(ia - ib); // unknown grades: no claim
  }

  function caratBand(current) {
    return Math.max(0.25, (Number(current.carat) || 0) * 0.2);
  }

  function caratScore(current, candidate) {
    var diff = Math.abs((Number(candidate.carat) || 0) - (Number(current.carat) || 0));
    var span = caratBand(current) * 2;
    return diff >= span ? 0 : Math.round(40 * (1 - diff / span));
  }

  function scoreCandidate(current, candidate) {
    var score = 0;
    if (candidate.shape !== dash && candidate.shape === current.shape) score += 100;
    score += caratScore(current, candidate);
    var colour = gradeDistance(COLOR_ORDER, current.colour, candidate.colour);
    if (colour === 0) score += 20; else if (colour === 1) score += 10; else if (colour === 2) score += 4;
    var clarity = gradeDistance(CLARITY_ORDER, current.clarity, candidate.clarity);
    if (clarity === 0) score += 20; else if (clarity === 1) score += 10; else if (clarity === 2) score += 4;
    if (candidate.cut !== dash && candidate.cut === current.cut) score += 10;
    if (candidate.lab !== dash && candidate.lab === current.lab) score += 5;
    return score;
  }

  /* One small, always-true fact per card — never a percentage, never "better". */
  function matchLabel(current, candidate) {
    if (candidate.shape !== dash && candidate.shape === current.shape) return 'Same Shape';
    if (caratScore(current, candidate) > 0) return 'Similar Carat';
    return 'Alternative';
  }

  async function fetchCandidates(current) {
    var seen = {};
    var out = [];
    function absorb(rows) {
      (rows || []).forEach(function (row) {
        if (row.public_id && !seen[row.public_id]) {
          seen[row.public_id] = true;
          out.push(row);
        }
      });
    }
    function base() {
      return window.ngdSupabase.from('diamonds').select(COLUMNS)
        .eq('active', true).is('archived_at', null)
        .neq('public_id', current.publicId);
    }
    /* tier 1–3: the same shape carries the strongest signal */
    if (current.shape && current.shape !== dash) {
      var same = await base().eq('shape', current.shape)
        .order('created_at', { ascending: false }).limit(40);
      if (same.error) throw same.error;
      absorb(same.data);
    }
    /* tier 4: widen to other shapes in a close carat window */
    if (out.length < LIMIT) {
      var carat = Number(current.carat) || 0;
      var near = base().order('created_at', { ascending: false }).limit(24);
      if (carat > 0) near = near.gte('carat', Math.max(0, carat - 0.75)).lte('carat', carat + 0.75);
      var nearRes = await near;
      if (nearRes.error) throw nearRes.error;
      absorb(nearRes.data);
    }
    /* last resort: the newest active stones, any specification */
    if (out.length < LIMIT) {
      var any = await base().order('created_at', { ascending: false }).limit(24);
      if (any.error) throw any.error;
      absorb(any.data);
    }
    return out.map(mapStone);
  }

  async function getSimilar(current, limit) {
    var max = limit || LIMIT;
    var candidates = await fetchCandidates(current);
    return candidates.map(function (candidate) {
      return {
        stone: candidate,
        score: scoreCandidate(current, candidate),
        label: matchLabel(current, candidate)
      };
    }).sort(function (a, b) {
      return (b.score - a.score) ||
        (Math.abs(a.stone.carat - current.carat) - Math.abs(b.stone.carat - current.carat)) ||
        (a.stone.publicId < b.stone.publicId ? -1 : 1);
    }).slice(0, max);
  }

  /* ---- the details-page section ---- */
  async function render(current) {
    var wrap = document.getElementById('dd-similar-wrap');
    var grid = document.getElementById('dd-similar');
    var empty = document.getElementById('dd-similar-empty');
    if (!wrap || !grid) return;
    wrap.hidden = false;
    if (empty) empty.hidden = true;
    grid.innerHTML = '<div class="col-12" data-sim-loading>' +
      '<span class="ngd-skeleton d-block w-100 mb-3"></span>' +
      '<span class="ngd-skeleton d-block w-75"></span></div>';
    try {
      if (!window.ngdSupabase || !window.NGDDiamondCard) throw new Error('unavailable');
      var picks = await getSimilar(current, LIMIT);
      if (!picks.length) {
        grid.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
      }
      grid.innerHTML = picks.map(function (pick) {
        return window.NGDDiamondCard.cardHtml(pick.stone);
      }).join('');
      picks.forEach(function (pick, index) {
        var column = grid.children[index];
        var media = column && column.querySelector('.ngd-diamond-media');
        if (media) {
          var chip = document.createElement('span');
          chip.className = 'ngd-sim-label';
          chip.textContent = pick.label;
          media.appendChild(chip);
        }
      });
      if (window.NGDTilt) window.NGDTilt(grid);
    } catch (error) {
      /* recommendations are a bonus — the details page never suffers */
      console.warn('[NGD Similar] similar stones unavailable:', error);
      grid.innerHTML = '';
      wrap.hidden = true;
    }
  }

  window.NGDSimilarDiamonds = {
    LIMIT: LIMIT,
    fetchCandidates: fetchCandidates,
    scoreCandidate: scoreCandidate,
    matchLabel: matchLabel,
    getSimilar: getSimilar,
    render: render
  };
})();
