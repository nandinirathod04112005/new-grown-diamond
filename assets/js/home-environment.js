/* ============================================================
   NEW GROWN DIAMOND — CONTINUOUS HOMEPAGE ENVIRONMENT
   ------------------------------------------------------------
   One shared, scroll-evolving cinematic background behind the
   whole homepage: a single fixed canvas (#ngd-cinematic-background,
   one render loop) painting layered chapters that BLEND as the
   visitor travels —

     hero            deep obsidian sapphire, drifting dust
     shapes          the bright crystal chapter: pale wash,
                     caustic shimmer, geometric light
     featured        near-black showroom, one slow-moving spotlight
     fine jewellery  black / champagne studio, warm dust
     journey stages  growth plasma → cutting lasers → polishing
                     brilliance → champagne finish (keyed to the
                     scroll-driven story stages)
     footer          deep sapphire close, calm particles

   Layers (far → near): base gradient · fog · light blooms ·
   distant diamond silhouettes (positions themselves interpolate
   between chapters) · dust · light streaks (wide + thin laser) ·
   caustic web · film grain · a centre readability veil. Each
   layer parallaxes at its own rate; everything keeps a slow
   ambient drift when scrolling stops.

   Progressive enhancement: the page keeps its original opaque
   section backgrounds until this module mounts and stamps
   html.ngd-env-on — no-JS, reduced-motion and failure paths
   simply keep the pre-existing look. One canvas, ~26fps, DPR
   capped, hidden-tab pause, adaptive degrade on slow frames.

   Test/debug API: window.NGDHomeEnv = { state, force(scrollY) }.
   ============================================================ */
(function () {
  'use strict';

  if (document.body.getAttribute('data-ngd-page') !== 'home') return;

  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    window.NGDHomeEnv = { state: { inert: true } };
    return;
  }

  var isMobile =
    window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  /* ---------------- chapter definitions ---------------- */
  /* colors as [r,g,b]; every numeric field is blended between
     neighbouring chapters by scroll position */
  function silh(x, y, s, r, a) { return { x: x, y: y, s: s, r: r, a: a }; }

  var CHAPTERS = [
    { sel: '.ngd-hero', id: 'hero', p: {
      top: [5, 7, 15], bot: [10, 18, 38],
      glowA: { x: 0.78, y: 0.35, r: 0.5, rgb: [90, 130, 220], a: 0.08 },
      glowB: { x: 0.15, y: 0.85, r: 0.45, rgb: [217, 192, 138], a: 0.07 },
      fog: 0.45, dust: 0.55, warm: 0.55, streak: 0.15, laser: 0, caustic: 0,
      bright: 0.9,
      silh: [silh(0.12, 0.2, 0.5, 0.3, 0.5), silh(0.9, 0.7, 0.7, 1.2, 0.4),
             silh(0.5, 1.1, 0.4, 2.2, 0.35), silh(0.82, 0.15, 0.3, 3.1, 0.3),
             silh(0.3, 0.85, 0.25, 4.0, 0.3)]
    } },
    { sel: '#diamond-shapes', id: 'shapes', p: {
      top: [214, 223, 240], bot: [188, 202, 226],
      glowA: { x: 0.5, y: 0.3, r: 0.6, rgb: [255, 255, 255], a: 0.4 },
      glowB: { x: 0.85, y: 0.8, r: 0.4, rgb: [200, 216, 246], a: 0.2 },
      fog: 0.12, dust: 0.2, warm: 0.1, streak: 0.08, laser: 0, caustic: 0.5,
      bright: 1,
      silh: [silh(0.06, 0.15, 0.35, 0.8, 0.25), silh(0.95, 0.25, 0.45, 1.6, 0.22),
             silh(0.75, 1.05, 0.3, 2.6, 0.2), silh(0.2, 0.95, 0.2, 3.4, 0.18),
             silh(0.55, -0.1, 0.22, 4.4, 0.18)]
    } },
    { sel: '#featured-diamonds', id: 'featured', p: {
      top: [4, 6, 12], bot: [8, 11, 22],
      glowA: { x: 0.35, y: 0.15, r: 0.42, rgb: [235, 240, 250], a: 0.14 },
      glowB: { x: 0.85, y: 0.9, r: 0.4, rgb: [90, 120, 200], a: 0.07 },
      fog: 0.3, dust: 0.3, warm: 0.15, streak: 0.1, laser: 0, caustic: 0,
      bright: 0.85, spotlightDrift: 1,
      silh: [silh(0.05, 0.75, 0.45, 1.1, 0.4), silh(0.93, 0.2, 0.35, 2.0, 0.35),
             silh(0.65, -0.15, 0.25, 3.0, 0.3), silh(0.15, 0.1, 0.2, 3.8, 0.25),
             silh(0.45, 1.15, 0.3, 4.6, 0.25)]
    } },
    { sel: '#fine-jewellery', id: 'jewellery', p: {
      top: [12, 9, 6], bot: [22, 16, 9],
      glowA: { x: 0.2, y: 0.25, r: 0.5, rgb: [217, 192, 138], a: 0.18 },
      glowB: { x: 0.85, y: 0.8, r: 0.45, rgb: [255, 244, 224], a: 0.08 },
      fog: 0.25, dust: 0.45, warm: 0.85, streak: 0.14, laser: 0, caustic: 0.12,
      bright: 0.9,
      silh: [silh(0.9, 0.8, 0.4, 1.4, 0.35), silh(0.08, 0.3, 0.3, 2.3, 0.3),
             silh(0.3, 1.1, 0.25, 3.2, 0.25), silh(0.7, 0.05, 0.2, 4.1, 0.22),
             silh(0.55, 0.9, 0.28, 5.0, 0.25)]
    } },
    { sel: '#manufacturing-story .ngd-story-stage[data-slug="growth"]', id: 'growth', p: {
      top: [4, 14, 24], bot: [6, 28, 48],
      glowA: { x: 0.5, y: 0.5, r: 0.5, rgb: [70, 190, 230], a: 0.22 },
      glowB: { x: 0.2, y: 0.15, r: 0.4, rgb: [40, 90, 180], a: 0.1 },
      fog: 0.5, dust: 0.9, warm: 0, streak: 0.08, laser: 0, caustic: 0,
      bright: 0.8,
      silh: [silh(0.1, 0.9, 0.3, 1.8, 0.3), silh(0.92, 0.55, 0.25, 2.6, 0.28),
             silh(0.75, 1.2, 0.2, 3.5, 0.22), silh(0.25, -0.1, 0.18, 4.3, 0.2),
             silh(0.5, 0.4, 0.15, 5.2, 0.2)]
    } },
    { sel: '#manufacturing-story .ngd-story-stage[data-slug="cutting"]', id: 'cutting', p: {
      top: [2, 4, 8], bot: [4, 7, 14],
      glowA: { x: 0.6, y: 0.3, r: 0.35, rgb: [170, 210, 255], a: 0.1 },
      glowB: { x: 0.25, y: 0.85, r: 0.35, rgb: [90, 130, 220], a: 0.06 },
      fog: 0.35, dust: 0.3, warm: 0, streak: 0.06, laser: 0.5, caustic: 0,
      bright: 0.75,
      silh: [silh(0.15, 0.35, 0.4, 2.2, 0.35), silh(0.88, 0.75, 0.3, 3.0, 0.3),
             silh(0.6, -0.1, 0.2, 3.9, 0.22), silh(0.35, 1.15, 0.18, 4.7, 0.2),
             silh(0.78, 0.3, 0.16, 5.6, 0.18)]
    } },
    { sel: '#manufacturing-story .ngd-story-stage[data-slug="polishing"]', id: 'polishing', p: {
      top: [10, 16, 32], bot: [22, 35, 63],
      glowA: { x: 0.5, y: 0.35, r: 0.55, rgb: [235, 242, 255], a: 0.24 },
      glowB: { x: 0.8, y: 0.8, r: 0.4, rgb: [190, 214, 255], a: 0.12 },
      fog: 0.2, dust: 0.35, warm: 0.2, streak: 0.16, laser: 0.1, caustic: 0.55,
      bright: 0.95,
      silh: [silh(0.9, 0.35, 0.45, 2.8, 0.4), silh(0.1, 0.7, 0.35, 3.6, 0.35),
             silh(0.4, 0.05, 0.25, 4.5, 0.3), silh(0.7, 1.15, 0.22, 5.3, 0.25),
             silh(0.25, 0.35, 0.18, 6.2, 0.22)]
    } },
    { sel: '#manufacturing-story .ngd-story-stage[data-slug="finished"]', id: 'finish', p: {
      top: [14, 11, 7], bot: [26, 20, 11],
      glowA: { x: 0.7, y: 0.3, r: 0.5, rgb: [240, 222, 188], a: 0.2 },
      glowB: { x: 0.2, y: 0.85, r: 0.4, rgb: [217, 192, 138], a: 0.1 },
      fog: 0.22, dust: 0.4, warm: 0.9, streak: 0.14, laser: 0, caustic: 0.2,
      bright: 0.92,
      silh: [silh(0.1, 0.25, 0.4, 3.2, 0.35), silh(0.9, 0.7, 0.5, 4.0, 0.4),
             silh(0.55, 1.15, 0.25, 4.9, 0.25), silh(0.3, -0.05, 0.2, 5.7, 0.22),
             silh(0.75, 0.15, 0.24, 6.6, 0.25)]
    } },
    { sel: '#site-footer', id: 'close', p: {
      top: [6, 12, 32], bot: [3, 5, 12],
      glowA: { x: 0.5, y: 0.2, r: 0.55, rgb: [80, 120, 210], a: 0.2 },
      glowB: { x: 0.85, y: 0.9, r: 0.35, rgb: [217, 192, 138], a: 0.05 },
      fog: 0.3, dust: 0.3, warm: 0.3, streak: 0.12, laser: 0, caustic: 0,
      bright: 0.8,
      silh: [silh(0.12, 0.5, 0.35, 3.8, 0.3), silh(0.88, 0.3, 0.3, 4.6, 0.28),
             silh(0.5, 0.9, 0.22, 5.5, 0.22), silh(0.28, 0.1, 0.16, 6.3, 0.18),
             silh(0.7, 0.75, 0.18, 7.2, 0.2)]
    } }
  ];

  var SIL_COUNT = isMobile ? 2 : 5;
  var DUST_MAX = isMobile ? 16 : 46;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  /* ---------------- mount ---------------- */
  var wrap = document.createElement('div');
  wrap.id = 'ngd-cinematic-background';
  wrap.className = 'ngd-cinebg-fixed';
  wrap.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) { window.NGDHomeEnv = { state: { inert: true } }; return; }

  var anchors = [];   // {y, p, id} resolved centres, sorted
  var W = 0, H = 0;
  var scrollYNow = 0;
  var degraded = false;
  var grain = null;

  function grainPattern() {
    var g = document.createElement('canvas');
    g.width = 96; g.height = 96;
    var gc = g.getContext('2d');
    if (!gc) return null;
    for (var i = 0; i < 120; i++) {
      gc.globalAlpha = 0.3 + Math.random() * 0.4;
      gc.fillStyle = '#fff';
      gc.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
    }
    return ctx.createPattern(g, 'repeat');
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    var scale = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    measure();
  }

  function measure() {
    anchors = [];
    CHAPTERS.forEach(function (ch) {
      var el = document.querySelector(ch.sel);
      if (!el) return;
      var rect = el.getBoundingClientRect();
      anchors.push({ id: ch.id, p: ch.p, y: rect.top + window.scrollY + rect.height / 2 });
    });
    anchors.sort(function (a, b) { return a.y - b.y; });
  }

  /* ---------------- blending ---------------- */
  var current = null; // blended params for this frame

  function blend(y) {
    var centre = y + H / 2;
    if (!anchors.length) return null;
    var lo = anchors[0], hi = anchors[anchors.length - 1], t = 0;
    for (var i = 0; i < anchors.length - 1; i++) {
      if (centre >= anchors[i].y && centre <= anchors[i + 1].y) {
        lo = anchors[i]; hi = anchors[i + 1];
        t = ease((centre - lo.y) / Math.max(1, hi.y - lo.y));
        break;
      }
    }
    if (centre < anchors[0].y) { lo = hi = anchors[0]; t = 0; }
    if (centre > anchors[anchors.length - 1].y) { lo = hi = anchors[anchors.length - 1]; t = 0; }
    var a = lo.p, b = hi.p;
    function mixGlow(ga, gb) {
      return {
        x: lerp(ga.x, gb.x, t), y: lerp(ga.y, gb.y, t), r: lerp(ga.r, gb.r, t),
        rgb: [lerp(ga.rgb[0], gb.rgb[0], t), lerp(ga.rgb[1], gb.rgb[1], t), lerp(ga.rgb[2], gb.rgb[2], t)],
        a: lerp(ga.a, gb.a, t)
      };
    }
    var out = {
      id: t < 0.5 ? lo.id : hi.id,
      top: [0, 1, 2].map(function (i) { return lerp(a.top[i], b.top[i], t); }),
      bot: [0, 1, 2].map(function (i) { return lerp(a.bot[i], b.bot[i], t); }),
      glowA: mixGlow(a.glowA, b.glowA),
      glowB: mixGlow(a.glowB, b.glowB),
      fog: lerp(a.fog, b.fog, t),
      dust: lerp(a.dust, b.dust, t),
      warm: lerp(a.warm, b.warm, t),
      streak: lerp(a.streak, b.streak, t),
      laser: lerp(a.laser, b.laser, t),
      caustic: lerp(a.caustic, b.caustic, t),
      bright: lerp(a.bright, b.bright, t),
      spot: lerp(a.spotlightDrift || 0, b.spotlightDrift || 0, t),
      silh: []
    };
    for (var s = 0; s < SIL_COUNT; s++) {
      var sa = a.silh[s], sb = b.silh[s];
      out.silh.push({
        x: lerp(sa.x, sb.x, t), y: lerp(sa.y, sb.y, t),
        s: lerp(sa.s, sb.s, t), r: lerp(sa.r, sb.r, t), a: lerp(sa.a, sb.a, t)
      });
    }
    return out;
  }

  /* ---------------- painters ---------------- */
  var dust = [];
  (function () {
    for (var i = 0; i < DUST_MAX; i++) {
      dust.push({
        x: Math.random(), y: Math.random(),
        r: 0.6 + Math.random() * 1.6,
        vx: -0.004 - Math.random() * 0.008, vy: -0.006 - Math.random() * 0.012,
        ph: Math.random() * Math.PI * 2
      });
    }
  })();

  var causticNodes = [];
  (function () {
    for (var i = 0; i < 8; i++) {
      causticNodes.push({ x: Math.random(), y: Math.random(), ph: i * 0.9 });
    }
  })();

  function diamondPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.62, cy - s * 0.18);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.34, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.62, cy - s * 0.18);
    ctx.lineTo(cx, cy + s * 0.62);
    ctx.closePath();
  }

  function paint(time) {
    var p = current;
    if (!p) return;
    var bright = p.bright;

    /* base gradient (parallax-free — the world itself) */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(' + p.top.map(Math.round).join(',') + ')');
    g.addColorStop(1, 'rgb(' + p.bot.map(Math.round).join(',') + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* far fog (speed 0.04) */
    var fogY = (scrollYNow * 0.04) % H;
    for (var f = 0; f < 2; f++) {
      var fx = W * (0.25 + f * 0.5) + Math.sin(time * 0.05 + f * 2) * W * 0.06;
      var fy = H * (0.3 + f * 0.45) - fogY + Math.cos(time * 0.04 + f) * H * 0.04;
      var fr = W * 0.4;
      var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fg.addColorStop(0, 'rgba(120,150,210,' + (p.fog * 0.06 * bright) + ')');
      fg.addColorStop(1, 'rgba(120,150,210,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }

    /* blooms (speed 0.06) — spotlight chapters drift horizontally */
    [p.glowA, p.glowB].forEach(function (glow, gi) {
      var gx = glow.x * W + (gi === 0 ? Math.sin(time * 0.07) * W * 0.05 * (1 + p.spot * 2) : 0);
      var gy = glow.y * H - scrollYNow * 0.06 % (H * 0.3);
      var gr = glow.r * Math.max(W, H);
      var gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, 'rgba(' + glow.rgb.map(Math.round).join(',') + ',' + (glow.a * bright) + ')');
      gg.addColorStop(1, 'rgba(' + glow.rgb.map(Math.round).join(',') + ',0)');
      ctx.fillStyle = gg;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    });

    /* distant diamond silhouettes (speed 0.12, self-rotation) */
    var dark = p.top[0] + p.top[1] + p.top[2] < 360;
    for (var s = 0; s < p.silh.length; s++) {
      var sil = p.silh[s];
      var sx = sil.x * W;
      var sy = sil.y * H - (scrollYNow * 0.12) % (H * 0.6);
      var size = sil.s * Math.min(W, H) * 0.22;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sil.r + time * 0.02);
      ctx.translate(-sx, -sy);
      var tone = dark ? '190,214,255' : '90,110,150';
      ctx.strokeStyle = 'rgba(' + tone + ',' + (sil.a * 0.16 * bright) + ')';
      ctx.fillStyle = 'rgba(' + tone + ',' + (sil.a * 0.05 * bright) + ')';
      ctx.lineWidth = 1;
      diamondPath(sx, sy, size);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    /* streaks (speed 0.2): one wide, one thin "laser" */
    function band(cx, angle, width, alpha, rgb) {
      if (alpha <= 0.004) return;
      ctx.save();
      ctx.translate(cx, H * 0.5 - (scrollYNow * 0.2) % (H * 0.4));
      ctx.rotate(angle);
      var bg = ctx.createLinearGradient(-width, 0, width, 0);
      bg.addColorStop(0, 'rgba(' + rgb + ',0)');
      bg.addColorStop(0.5, 'rgba(' + rgb + ',' + alpha + ')');
      bg.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = bg;
      ctx.fillRect(-width, -H * 1.4, width * 2, H * 2.8);
      ctx.restore();
    }
    /* the wide band takes on the chapter's warmth — ice in the cool
       chapters, champagne where the scene is golden */
    var bandRgb = Math.round(190 + (232 - 190) * p.warm) + ',' +
      Math.round(214 + (208 - 214) * p.warm) + ',' +
      Math.round(255 + (164 - 255) * p.warm);
    band(W * (0.3 + 0.4 * (0.5 + Math.sin(time * 0.045) * 0.5)), -0.5,
      W * 0.11, p.streak * 0.26 * bright, bandRgb);
    band(W * (0.62 + Math.sin(time * 0.11) * 0.08), -0.9,
      W * 0.012, p.laser * 0.5 * bright, '150,210,255');

    /* dust (speed 0.3) */
    var count = Math.round(DUST_MAX * p.dust * (degraded ? 0.5 : 1));
    for (var d = 0; d < count; d++) {
      var pt = dust[d];
      var dx = ((pt.x + time * pt.vx) % 1 + 1) % 1;
      var dy = ((pt.y + time * pt.vy) % 1 + 1) % 1;
      var py = (dy * H - (scrollYNow * 0.3) % H + H) % H;
      var tw = 0.5 + 0.5 * Math.sin(time * 0.9 + pt.ph);
      var warmMix = p.warm;
      var col = warmMix > 0.5 ? '240,222,188' : '205,224,255';
      ctx.beginPath();
      ctx.arc(dx * W, py, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.14 * tw * bright) + ')';
      ctx.fill();
    }

    /* caustic web — drifting connected light lines */
    if (p.caustic > 0.02 && !degraded) {
      ctx.strokeStyle = 'rgba(225,238,255,' + (p.caustic * 0.07 * bright) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c < causticNodes.length; c++) {
        var n = causticNodes[c];
        var nx = (n.x + Math.sin(time * 0.06 + n.ph) * 0.05) * W;
        var ny = (n.y + Math.cos(time * 0.05 + n.ph) * 0.05) * H;
        if (c === 0) ctx.moveTo(nx, ny);
        else ctx.quadraticCurveTo(W * 0.5, H * 0.5 + Math.sin(time * 0.03 + c) * 40, nx, ny);
      }
      ctx.stroke();
    }

    /* film grain */
    if (grain && !degraded && !isMobile) {
      ctx.globalAlpha = 0.02;
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    /* readability veil: keep the centre column calm behind copy */
    var veil = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.1, W * 0.5, H * 0.5, H * 0.75);
    var veilA = dark ? 0.1 * (1.15 - bright) + 0.04 : 0;
    veil.addColorStop(0, 'rgba(3,5,10,' + veilA + ')');
    veil.addColorStop(1, 'rgba(3,5,10,0)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------------- loop ---------------- */
  var last = 0;
  var slow = 0;
  var raf = null;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    var dt = now - last;
    if (dt < 38) return;
    last = now;
    if (!degraded) {
      slow = dt > 120 ? slow + dt : 0;
      if (slow > 2500) degraded = true;
    }
    scrollYNow = window.scrollY;
    current = blend(scrollYNow);
    paint(now / 1000);
  }

  /* ---------------- public API ---------------- */
  window.NGDHomeEnv = {
    state: {
      mounted: true,
      inert: false,
      profile: isMobile ? 'mobile' : 'desktop',
      loops: 1,
      layers: { silhouettes: SIL_COUNT, dustMax: DUST_MAX },
      chapter: function () { return current ? current.id : null; },
      bright: function () { return current ? current.bright : 1; },
      params: function () {
        return current ? {
          id: current.id, bright: current.bright, fog: current.fog,
          dust: current.dust, caustic: current.caustic, laser: current.laser,
          warm: current.warm, top: current.top.slice(),
          silh: current.silh.map(function (s) { return { x: s.x, y: s.y }; })
        } : null;
      },
      degraded: function () { return degraded; }
    },
    /** deterministic: evaluate + paint the environment for a scroll offset */
    force: function (y) {
      scrollYNow = Math.max(0, y || 0);
      measure();
      current = blend(scrollYNow);
      paint(performance.now() / 1000);
      return window.NGDHomeEnv.state.params();
    }
  };

  function init() {
    try {
      document.body.appendChild(wrap);
      document.documentElement.classList.add('ngd-cine-root');
      document.documentElement.classList.add('ngd-env-on');
      grain = grainPattern();
      resize();
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 160);
      }, { passive: true });
      /* section positions move as dynamic content (products) renders */
      setTimeout(measure, 1500);
      setTimeout(measure, 4000);
      current = blend(window.scrollY);
      raf = requestAnimationFrame(frame);
    } catch (err) {
      console.warn('[NGD Cinematic] home environment disabled:', err);
      document.documentElement.classList.remove('ngd-env-on');
      window.NGDHomeEnv = { state: { inert: true } };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
