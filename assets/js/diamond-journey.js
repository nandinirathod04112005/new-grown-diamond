/* ============================================================
   NEW GROWN DIAMOND — FROM CARBON TO BRILLIANCE (journey scenes)
   ------------------------------------------------------------
   Scroll-driven 2D-canvas scenes layered over the six existing
   manufacturing-story stages on the homepage. The original SVG
   artwork stays in the DOM underneath as the permanent fallback
   (and the whole experience for prefers-reduced-motion or when
   canvas is unavailable) — content never depends on animation.

   Every scene is a pure function of scroll progress p ∈ [0,1]
   (via NGDCinematic.onProgress → GSAP ScrollTrigger when
   available). Nothing animates on a timer: reversing the scroll
   reverses the scene, fast scrolling just draws the new state,
   and an off-screen stage draws nothing at all.

     01 growth      seed plate → plasma glow → carbon deposition
                    → rough crystal grown (visual concept only —
                    no reactor physics claims)
     02 rough       raw crystal turning, light sweeping across,
                    inner potential glinting awake
     03 cutting     scanning grid → planning lines → laser pass →
                    silhouette morphs toward the planned brilliant
                    (labels: Scanning · Planning · Precision
                    Cutting — no invented accuracy figures)
     04 polishing   facets appear one by one and brighten over a
                    turning scaife wheel
     05 inspection  loupe sweep with Cut / Colour / Clarity /
                    Carat labels (educational only — no grades),
                    then a neutral "Independent Laboratory
                    Certification" card
     06 finished    the polished stone lowers into a rising ring
                    setting, prongs secure it, the finished ring
                    turns and sparkles — then ring · pendant ·
                    earrings variations of the same stone

   Mobile uses a lower DPR cap and lighter particle counts.
   Test surface: window.NGDDiamondJourney.state / .force().
   ============================================================ */
(function () {
  'use strict';

  var GOLD = '217, 192, 138';
  var WHITE = '250, 248, 242';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  var state = {
    mounted: 0,
    profile: isMobile ? 'mobile' : 'desktop',
    reduced: reduced,
    progress: {}
  };
  window.NGDDiamondJourney = {
    state: state,
    force: function (slug, p) {
      var scene = scenes[slug];
      if (scene) scene.draw(p);
    }
  };

  var scenes = {};

  /* ---------------- tiny maths / drawing helpers ---------------- */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /** progress within a sub-band of p — 0 before, 1 after */
  function band(p, a, b) { return clamp01((p - a) / (b - a)); }
  /** deterministic pseudo-random stream (same every visit) */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function poly(ctx, pts, close) {
    ctx.beginPath();
    pts.forEach(function (pt, i) {
      if (i === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
    if (close !== false) ctx.closePath();
  }
  function mix(a, b, t) {
    return a.map(function (pt, i) { return [lerp(pt[0], b[i][0], t), lerp(pt[1], b[i][1], t)]; });
  }

  /* Shared silhouettes on the 160×110 design grid (matches the SVGs) */
  var ROUGH = [[80, 14], [110, 34], [118, 64], [94, 92], [56, 88], [42, 56], [56, 28]];
  var BRILLIANT = [[57, 38], [103, 38], [118, 52], [80, 92], [42, 52], [46, 42], [57, 38]];
  var ROUGH7 = [[80, 14], [110, 34], [118, 64], [94, 92], [56, 88], [42, 56], [56, 28]];
  var PLAN7 = [[80, 30], [110, 44], [114, 56], [80, 92], [46, 56], [42, 48], [57, 36]];

  function gold(alpha) { return 'rgba(' + GOLD + ',' + alpha + ')'; }
  function white(alpha) { return 'rgba(' + WHITE + ',' + alpha + ')'; }

  function drawBrilliant(ctx, cx, cy, s, opts) {
    opts = opts || {};
    var facetAlpha = opts.facetAlpha === undefined ? 0.55 : opts.facetAlpha;
    var fillAlpha = opts.fillAlpha === undefined ? 0.22 : opts.fillAlpha;
    ctx.save();
    ctx.translate(cx, cy);
    if (opts.rotate) ctx.rotate(opts.rotate);
    ctx.scale(s, s);
    /* crown */
    poly(ctx, [[-23, -22], [23, -22], [38, -8], [-38, -8]]);
    ctx.fillStyle = white(fillAlpha + 0.16);
    ctx.fill();
    /* pavilion */
    poly(ctx, [[-38, -8], [38, -8], [0, 32]]);
    ctx.fillStyle = gold(fillAlpha);
    ctx.fill();
    ctx.strokeStyle = white(facetAlpha);
    ctx.lineWidth = 1.4 / s;
    var facets = [
      [[-23, -22], [-12, -8]], [[23, -22], [12, -8]], [[-12, -8], [12, -8]],
      [[-12, -8], [0, 32]], [[12, -8], [0, 32]], [[0, -22], [0, -8]],
      [[-38, -8], [-12, -8]], [[38, -8], [12, -8]]
    ];
    var shown = opts.facetCount === undefined ? facets.length
      : Math.round(clamp01(opts.facetCount) * facets.length);
    for (var i = 0; i < shown; i++) {
      ctx.beginPath();
      ctx.moveTo(facets[i][0][0], facets[i][0][1]);
      ctx.lineTo(facets[i][1][0], facets[i][1][1]);
      ctx.stroke();
    }
    poly(ctx, [[-23, -22], [23, -22], [38, -8], [0, 32], [-38, -8]]);
    ctx.stroke();
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.strokeStyle = white(alpha);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
    ctx.restore();
  }

  function label(ctx, text, x, y, alpha, alignRight) {
    ctx.save();
    ctx.font = '600 7px Inter, sans-serif';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillStyle = gold(alpha);
    var pad = 3;
    var w = ctx.measureText(text).width;
    var bx = alignRight ? x - w - pad * 2 : x;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = gold(0.5);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(bx, y - 8, w + pad * 2, 11);
    ctx.fillText(text, alignRight ? x - pad : x + pad, y);
    ctx.restore();
  }

  /* ---------------- the six scenes ---------------- */

  var DRAWERS = {

    /* 01 · growth — seed plate, plasma glow, carbon fall, crystal rise */
    growth: function (ctx, p, rand) {
      var seedY = 86;
      /* chamber */
      ctx.strokeStyle = white(0.5);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(38, 12, 84, 86);
      /* seed plate */
      ctx.strokeStyle = gold(0.85);
      ctx.beginPath(); ctx.moveTo(58, seedY); ctx.lineTo(102, seedY); ctx.stroke();
      /* plasma glow appears with deposition */
      var plasma = band(p, 0.15, 0.5);
      if (plasma > 0) {
        var glow = ctx.createRadialGradient(80, 44, 2, 80, 44, 34);
        glow.addColorStop(0, gold(0.35 * plasma));
        glow.addColorStop(1, gold(0));
        ctx.fillStyle = glow;
        ctx.fillRect(40, 14, 80, 70);
        ctx.strokeStyle = gold(0.4 * plasma);
        ctx.beginPath(); ctx.ellipse(80, 40, 26, 9, 0, 0, Math.PI * 2); ctx.stroke();
      }
      /* carbon particles descend toward the seed (scroll-driven) */
      var particles = isMobile ? 14 : 26;
      var fall = band(p, 0.2, 0.95);
      if (fall > 0) {
        for (var i = 0; i < particles; i++) {
          var px = 52 + rand[i * 2] * 56;
          var phase = (rand[i * 2 + 1] + fall * 2.2) % 1;
          var py = lerp(20, seedY - 3, phase);
          ctx.fillStyle = white(0.7 * (1 - phase * 0.55) * fall);
          ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      /* deposition film on the seed */
      var film = band(p, 0.2, 0.6);
      if (film > 0) {
        ctx.fillStyle = gold(0.3 * film);
        ctx.fillRect(66, seedY - 3 * film, 28, 3 * film);
      }
      /* crystal grows upward */
      var grow = band(p, 0.6, 0.98);
      if (grow > 0) {
        ctx.save();
        ctx.translate(80, seedY);
        ctx.scale(lerp(0.3, 1, grow), lerp(0.12, 1, grow));
        poly(ctx, [[0, -40], [15, -30], [19, -13], [10, 0], [-10, 0], [-19, -14], [-14, -31]]);
        ctx.fillStyle = gold(0.14 + 0.14 * grow);
        ctx.fill();
        ctx.strokeStyle = white(0.5 + 0.3 * grow);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }
      if (p > 0.97) sparkle(ctx, 96, 46, 5, 0.8);
    },

    /* 02 · rough — turning crystal, light sweep, inner potential */
    rough: function (ctx, p) {
      ctx.save();
      ctx.translate(80, 55);
      ctx.rotate(lerp(-0.35, 0.55, p));
      ctx.translate(-80, -55);
      poly(ctx, ROUGH);
      ctx.fillStyle = gold(0.14);
      ctx.fill();
      ctx.strokeStyle = white(0.65);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      /* internal ridges */
      ctx.strokeStyle = white(0.35);
      ctx.lineWidth = 1.1;
      poly(ctx, [[80, 14], [74, 56], [42, 56]], false); ctx.stroke();
      poly(ctx, [[110, 34], [74, 56], [94, 92]], false); ctx.stroke();
      /* the light within — reveals with scroll */
      var glow = band(p, 0.35, 0.9);
      if (glow > 0) {
        var g = ctx.createRadialGradient(78, 56, 2, 78, 56, 30);
        g.addColorStop(0, white(0.5 * glow));
        g.addColorStop(0.5, gold(0.22 * glow));
        g.addColorStop(1, gold(0));
        poly(ctx, ROUGH);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
      /* light sweep across the surface */
      var sweepX = lerp(30, 130, p);
      var grad = ctx.createLinearGradient(sweepX - 12, 0, sweepX + 12, 0);
      grad.addColorStop(0, white(0));
      grad.addColorStop(0.5, white(0.2));
      grad.addColorStop(1, white(0));
      ctx.save();
      poly(ctx, ROUGH);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 160, 110);
      ctx.restore();
      if (p > 0.85) sparkle(ctx, 96, 40, 4, (p - 0.85) * 6);
    },

    /* 03 · cutting — scan grid, plan lines, laser pass, silhouette morph */
    cutting: function (ctx, p) {
      var morph = band(p, 0.66, 1);
      var shape = mix(ROUGH7, PLAN7, morph);
      poly(ctx, shape);
      ctx.fillStyle = gold(0.12 + 0.08 * morph);
      ctx.fill();
      ctx.strokeStyle = white(0.6);
      ctx.lineWidth = 1.6;
      ctx.stroke();

      /* phase 1 — scanning grid sweeps down the stone */
      var scan = band(p, 0.02, 0.33);
      if (scan > 0 && scan < 1) {
        var sy = lerp(10, 96, scan);
        ctx.strokeStyle = gold(0.7);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(30, sy); ctx.lineTo(130, sy); ctx.stroke();
        ctx.strokeStyle = gold(0.2);
        for (var gx = 40; gx <= 120; gx += 10) {
          ctx.beginPath(); ctx.moveTo(gx, sy - 5); ctx.lineTo(gx, sy + 5); ctx.stroke();
        }
        label(ctx, 'SCANNING', 32, 22, 1 - scan * 0.4);
      }
      /* phase 2 — planning lines draw in */
      var plan = band(p, 0.33, 0.66);
      if (plan > 0) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = gold(0.75 * Math.min(1, plan * 1.4));
        ctx.lineWidth = 1.1;
        var planned = [[[57, 38], [103, 38]], [[42, 52], [118, 52]], [[57, 38], [42, 52]],
          [[103, 38], [118, 52]], [[42, 52], [80, 92]], [[118, 52], [80, 92]]];
        var lines = Math.ceil(plan * planned.length);
        for (var i = 0; i < lines; i++) {
          ctx.beginPath();
          ctx.moveTo(planned[i][0][0], planned[i][0][1]);
          ctx.lineTo(planned[i][1][0], planned[i][1][1]);
          ctx.stroke();
        }
        ctx.restore();
        if (plan < 1) label(ctx, 'PLANNING', 128, 22, Math.min(1, plan * 2), true);
      }
      /* phase 3 — the laser travels the marked line */
      if (morph > 0 && morph < 1) {
        var lx = lerp(42, 118, morph);
        ctx.strokeStyle = white(0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(lx, 18); ctx.lineTo(lx, 52); ctx.stroke();
        var burst = ctx.createRadialGradient(lx, 52, 0, lx, 52, 9);
        burst.addColorStop(0, white(0.9));
        burst.addColorStop(1, white(0));
        ctx.fillStyle = burst;
        ctx.beginPath(); ctx.arc(lx, 52, 9, 0, Math.PI * 2); ctx.fill();
        label(ctx, 'PRECISION CUTTING', 32, 100, morph);
      }
    },

    /* 04 · polishing — facets appear and brighten over a turning scaife */
    polishing: function (ctx, p) {
      /* the scaife wheel below (fades away once the stone is done) */
      var wheelAlpha = 0.5 * (1 - band(p, 0.8, 1));
      if (wheelAlpha > 0.01) {
        ctx.strokeStyle = white(wheelAlpha);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(80, 88, 52, 11, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.save();
        ctx.translate(80, 88);
        var spin = p * 6;
        for (var i = 0; i < 3; i++) {
          var a = spin + i * (Math.PI / 1.5);
          ctx.strokeStyle = gold(wheelAlpha * 0.8);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * -46, Math.sin(a) * -9);
          ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 9);
          ctx.stroke();
        }
        ctx.restore();
      }
      /* stone: facets + brightness follow the scroll */
      var facetCount = band(p, 0.05, 0.85);
      drawBrilliant(ctx, 80, 52, 1.05, {
        facetCount: facetCount,
        facetAlpha: 0.35 + 0.45 * p,
        fillAlpha: 0.14 + 0.2 * p
      });
      /* reflective sweep once mostly polished */
      var shine = band(p, 0.7, 1);
      if (shine > 0) {
        var sx = lerp(46, 114, shine);
        ctx.save();
        poly(ctx, [[57, 30], [103, 30], [118, 44], [80, 84], [42, 44]]);
        ctx.clip();
        var grad = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0);
        grad.addColorStop(0, white(0));
        grad.addColorStop(0.5, white(0.35 * shine));
        grad.addColorStop(1, white(0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 160, 110);
        ctx.restore();
        sparkle(ctx, 103, 34, 5, shine);
      }
    },

    /* 05 · inspection — loupe sweep, the four Cs, a neutral certificate */
    inspection: function (ctx, p) {
      drawBrilliant(ctx, 66, 52, 0.9, { facetAlpha: 0.6, fillAlpha: 0.2 });
      /* moving loupe */
      var sweep = band(p, 0.02, 0.7);
      if (sweep > 0 && sweep < 1) {
        var angle = lerp(-0.9, 0.9, sweep);
        var lx2 = 66 + Math.sin(angle) * 26;
        var ly = 48 + Math.cos(angle) * 8;
        ctx.strokeStyle = white(0.8);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(lx2, ly, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx2 + 11, ly + 11); ctx.lineTo(lx2 + 22, ly + 22);
        ctx.stroke();
        var mag = ctx.createRadialGradient(lx2, ly, 1, lx2, ly, 16);
        mag.addColorStop(0, white(0.25));
        mag.addColorStop(1, white(0));
        ctx.fillStyle = mag;
        ctx.beginPath(); ctx.arc(lx2, ly, 16, 0, Math.PI * 2); ctx.fill();
      }
      /* the four Cs — educational labels only, never grades */
      var cs = ['CUT', 'COLOUR', 'CLARITY', 'CARAT'];
      cs.forEach(function (text, i) {
        var a = band(p, 0.12 + i * 0.13, 0.24 + i * 0.13);
        if (a > 0) label(ctx, text, 8, 20 + i * 14, a);
      });
      /* certificate card slides in — neutral demonstration text only */
      var cert = band(p, 0.68, 0.96);
      if (cert > 0) {
        var cardX = lerp(168, 106, cert);
        ctx.save();
        ctx.globalAlpha = cert;
        ctx.fillStyle = 'rgba(24, 21, 14, 0.85)';
        ctx.strokeStyle = gold(0.8);
        ctx.lineWidth = 1.2;
        ctx.fillRect(cardX, 26, 48, 58);
        ctx.strokeRect(cardX, 26, 48, 58);
        ctx.strokeStyle = white(0.4);
        ctx.lineWidth = 0.8;
        [38, 44, 50, 56].forEach(function (y) {
          ctx.beginPath(); ctx.moveTo(cardX + 6, y); ctx.lineTo(cardX + 42, y); ctx.stroke();
        });
        ctx.beginPath(); ctx.arc(cardX + 24, 70, 6, 0, Math.PI * 2);
        ctx.strokeStyle = gold(0.9); ctx.stroke();
        ctx.font = '600 5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gold(1);
        ctx.fillText('INDEPENDENT', cardX + 24, 33);
        ctx.fillText('LABORATORY', cardX + 24, 80.5);
        ctx.restore();
      }
    },

    /* 06 · finished — the stone becomes a ring, then its variations */
    finished: function (ctx, p) {
      var cx = 80;
      /* the diamond floats, then lowers into the setting */
      var lower = band(p, 0.55, 0.8);
      var dy = lerp(30, 52, lower);
      /* ring band draws in */
      var bandDraw = band(p, 0.18, 0.45);
      if (bandDraw > 0) {
        ctx.strokeStyle = gold(0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, 70, 22, -Math.PI / 2 - bandDraw * Math.PI, -Math.PI / 2 + bandDraw * Math.PI);
        ctx.stroke();
      }
      /* prongs rise, then close over the girdle */
      var prong = band(p, 0.4, 0.62);
      var secure = band(p, 0.78, 0.9);
      if (prong > 0) {
        ctx.strokeStyle = gold(0.95);
        ctx.lineWidth = 1.8;
        [-9, -3.2, 3.2, 9].forEach(function (off) {
          var baseX = cx + off;
          var topY = lerp(58, 46, prong) - secure * 1.5;
          var inward = secure * (off > 0 ? -2.2 : 2.2);
          ctx.beginPath();
          ctx.moveTo(baseX, 60);
          ctx.lineTo(baseX + inward * 0.4, topY);
          ctx.stroke();
        });
      }
      /* the stone itself (slight turn once complete) */
      var doneTurn = band(p, 0.9, 1) * 0.35;
      drawBrilliant(ctx, cx, dy, 0.42, {
        facetAlpha: 0.75, fillAlpha: 0.3, rotate: doneTurn
      });
      if (secure > 0.9) sparkle(ctx, cx + 12, dy - 10, 5, 1);
      if (p > 0.92) {
        sparkle(ctx, cx - 20, 40, 3.4, (p - 0.92) * 10);
        sparkle(ctx, cx + 24, 62, 2.6, (p - 0.94) * 12);
      }
      /* one diamond, three lives — ring · pendant · earrings */
      var vary = band(p, 0.9, 1);
      if (vary > 0) {
        ctx.save();
        ctx.globalAlpha = vary;
        ctx.font = '600 6px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gold(0.9);
        /* ring glyph (the hero of the scene, marked) */
        ctx.strokeStyle = gold(0.9);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(26, 96, 6, 0, Math.PI * 2); ctx.stroke();
        drawBrilliant(ctx, 26, 87, 0.09, { facetAlpha: 0.9, fillAlpha: 0.4 });
        ctx.fillText('RING', 26, 108);
        /* pendant glyph */
        ctx.beginPath(); ctx.moveTo(74, 86); ctx.quadraticCurveTo(80, 92, 86, 86); ctx.stroke();
        drawBrilliant(ctx, 80, 95, 0.09, { facetAlpha: 0.9, fillAlpha: 0.4 });
        ctx.fillText('PENDANT', 80, 108);
        /* earrings glyph */
        drawBrilliant(ctx, 128, 90, 0.08, { facetAlpha: 0.9, fillAlpha: 0.4 });
        drawBrilliant(ctx, 140, 90, 0.08, { facetAlpha: 0.9, fillAlpha: 0.4 });
        ctx.fillText('EARRINGS', 134, 108);
        ctx.restore();
      }
    }
  };

  /* ---------------- mounting ---------------- */

  function mountScene(stage) {
    var slug = stage.getAttribute('data-slug');
    var drawer = DRAWERS[slug];
    var media = stage.querySelector('.ngd-story-media');
    if (!drawer || !media) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'ngd-stage-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx;
    try {
      ctx = canvas.getContext('2d');
    } catch (_e) { ctx = null; }
    if (!ctx) return;
    media.appendChild(canvas);
    media.classList.add('has-journey-canvas');

    var dprCap = isMobile ? 1.5 : 2;
    var rand = [];
    var stream = rng(slug.length * 2654435761);
    for (var i = 0; i < 64; i++) rand.push(stream());

    var lastP = -1;
    var width = 0;
    var height = 0;

    function resize() {
      var rect = media.getBoundingClientRect();
      if (!rect.width) return;
      var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (lastP >= 0) draw(lastP, true);
    }

    function draw(p, force) {
      if (!force && Math.abs(p - lastP) < 0.0015) return;
      lastP = p;
      state.progress[slug] = p;
      if (!width) resize();
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      /* scenes are authored on a 160×110 grid, scaled to the frame */
      ctx.scale(width / 160, height / 110);
      drawer(ctx, clamp01(p), rand);
      ctx.restore();
    }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(media);
    else window.addEventListener('resize', resize);
    resize();

    scenes[slug] = { draw: function (p) { draw(p, true); } };
    window.NGDCinematic.onProgress(stage, draw);
    draw(0, true);
    state.mounted++;
  }

  /* A small real CTA under the final stage — the same diamond, explored
     as finished jewellery. Injected in every mode (content, not motion). */
  function addJewelleryCta(story) {
    var finished = story.querySelector('.ngd-story-stage[data-slug="finished"]');
    if (!finished || finished.querySelector('a[href="jewellery.html"]')) return;
    var copy = finished.querySelector('.ngd-story-text');
    if (!copy) return;
    var link = document.createElement('a');
    link.className = 'ngd-btn ngd-btn-ghost ngd-btn-sm mt-3';
    link.href = 'jewellery.html';
    link.textContent = 'Explore Jewellery';
    copy.insertAdjacentElement('afterend', link);
  }

  function init() {
    var story = document.getElementById('manufacturing-story');
    if (!story) return;
    addJewelleryCta(story);
    if (reduced) return; /* the SVG artwork IS the reduced-motion scene */
    if (!window.NGDCinematic) return;
    story.querySelectorAll('.ngd-story-stage[data-slug]').forEach(mountScene);
    if (state.mounted) story.classList.add('is-cinematic');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
