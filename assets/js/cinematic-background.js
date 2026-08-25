/* ============================================================
   NEW GROWN DIAMOND — CINEMATIC ATMOSPHERE
   ------------------------------------------------------------
   Reusable animated luxury backgrounds for the public site:

     · Ambient layer  — a fixed, viewport-sized 2D canvas behind
       the page (body[data-ngd-cinebg="light|dark"]): drifting
       dust motes + two very soft light blooms.
     · Scene layers   — an absolutely positioned canvas inside
       dark hero bands ([data-ngd-cinebg-scene]): light blooms,
       a slow travelling light streak, dust and fine grain.
       The "streak" variant keeps only dust + streak so the
       homepage Three.js diamond stays the star.
     · Cursor glow    — a faint light that follows a fine pointer
       across hero areas (desktop only).

   Decorative only: canvases are aria-hidden, ignore the pointer
   and are skipped entirely under prefers-reduced-motion. All
   drawing is paused off-screen and when the tab is hidden.
   ============================================================ */
(function () {
  'use strict';

  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse =
    window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var small =
    window.matchMedia && window.matchMedia('(max-width: 991.98px)').matches;

  var COOL = '207,224,255';
  var GOLD = '217,192,138';
  var layers = [];
  var state = {
    reduced: reduced,
    ambient: false,
    scenes: 0,
    running: function () {
      return layers.some(function (l) { return l.visible && !document.hidden; });
    }
  };
  window.NGDCineBG = { state: state, layers: layers };

  if (reduced) return; // static site remains exactly as designed

  /* ---------- shared helpers ---------- */

  function dpr() {
    return Math.min(window.devicePixelRatio || 1, coarse || small ? 1.5 : 2);
  }

  function makeParticles(count, w, h) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        vx: -2 - Math.random() * 5,      // px / second
        vy: -3 - Math.random() * 7,
        a: 0.05 + Math.random() * 0.11,
        ph: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.45
      });
    }
    return out;
  }

  function grainPattern(ctx) {
    var g = document.createElement('canvas');
    g.width = 96; g.height = 96;
    var gc = g.getContext('2d');
    if (!gc) return null;
    gc.fillStyle = 'rgba(255,255,255,0.55)';
    for (var i = 0; i < 130; i++) {
      gc.globalAlpha = 0.25 + Math.random() * 0.5;
      gc.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
    }
    return ctx.createPattern(g, 'repeat');
  }

  function blob(ctx, x, y, r, rgb, alpha) {
    var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* One layer = one canvas + its painter. */
  function createLayer(host, opts) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    host.appendChild(canvas);

    var layer = {
      host: host,
      canvas: canvas,
      visible: true,
      w: 0, h: 0,
      particles: [],
      grain: opts.grain ? grainPattern(ctx) : null,
      last: 0
    };

    function resize() {
      var rect = host.getBoundingClientRect();
      var w = Math.max(1, rect.width || window.innerWidth);
      var h = Math.max(1, rect.height || window.innerHeight);
      var scale = dpr();
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      layer.w = w; layer.h = h;
      layer.particles = makeParticles(opts.particles, w, h);
    }

    layer.frame = function (t, dt) {
      var w = layer.w, h = layer.h;
      ctx.clearRect(0, 0, w, h);

      if (opts.blobs) {
        opts.blobs.forEach(function (b) {
          var bx = (b.x + Math.sin(t * b.sx + b.ph) * b.dx) * w;
          var by = (b.y + Math.cos(t * b.sy + b.ph) * b.dy) * h;
          blob(ctx, bx, by, Math.max(w, h) * b.r, b.rgb, b.a);
        });
      }

      if (opts.streak) {
        var period = opts.streak.period;
        var p = (t % period) / period;                 // 0 → 1 across
        var cx = (p * 1.7 - 0.35) * w;
        ctx.save();
        ctx.translate(cx, h * 0.5);
        ctx.rotate(-0.32);
        var band = ctx.createLinearGradient(-w * 0.16, 0, w * 0.16, 0);
        band.addColorStop(0, 'rgba(' + COOL + ',0)');
        band.addColorStop(0.45, 'rgba(' + COOL + ',' + opts.streak.a + ')');
        band.addColorStop(0.6, 'rgba(' + GOLD + ',' + opts.streak.a * 0.7 + ')');
        band.addColorStop(1, 'rgba(' + GOLD + ',0)');
        ctx.fillStyle = band;
        ctx.fillRect(-w * 0.16, -h * 1.2, w * 0.32, h * 2.4);
        ctx.restore();
      }

      for (var i = 0; i < layer.particles.length; i++) {
        var pt = layer.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.x < -4) pt.x = w + 4;
        if (pt.y < -4) pt.y = h + 4;
        var tw = 0.55 + 0.45 * Math.sin(t * 0.9 + pt.ph);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (pt.gold ? GOLD : COOL) + ',' +
                        (pt.a * tw * opts.alpha).toFixed(3) + ')';
        ctx.fill();
      }

      if (layer.grain) {
        ctx.globalAlpha = 0.028;
        ctx.fillStyle = layer.grain;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    };

    resize();
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 160);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { layer.visible = entry.isIntersecting; });
      }, { threshold: 0 }).observe(host);
    }

    layers.push(layer);
    return layer;
  }

  /* ---------- shared animation loop (≈30fps is plenty) ---------- */
  var started = false;
  function startLoop() {
    if (started) return;
    started = true;
    var prev = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden) { prev = now; return; }
      var elapsed = now - prev;
      if (elapsed < 32) return;
      var dt = Math.min(elapsed, 100) / 1000;
      prev = now;
      var t = now / 1000;
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].visible) layers[i].frame(t, dt);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---------- mounts ---------- */

  function mountAmbient() {
    var variant = document.body.getAttribute('data-ngd-cinebg');
    if (!variant) return;

    var wrap = document.createElement('div');
    wrap.className = 'ngd-cinebg-fixed';
    wrap.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(wrap, document.body.firstChild);
    document.documentElement.classList.add('ngd-cine-root');

    var dark = variant === 'dark';
    var layer = createLayer(wrap, {
      particles: coarse || small ? 14 : (dark ? 38 : 30),
      alpha: dark ? 1 : 0.7,
      blobs: [
        { x: 0.82, y: 0.12, r: 0.5, rgb: GOLD, a: dark ? 0.07 : 0.05,
          sx: 0.05, sy: 0.04, dx: 0.05, dy: 0.04, ph: 0 },
        { x: 0.1, y: 0.85, r: 0.45, rgb: COOL, a: dark ? 0.06 : 0.035,
          sx: 0.04, sy: 0.05, dx: 0.05, dy: 0.05, ph: 2.1 }
      ],
      streak: null,
      grain: false
    });
    if (layer) state.ambient = true;
  }

  function mountScenes() {
    var hosts = document.querySelectorAll('[data-ngd-cinebg-scene]');
    hosts.forEach(function (host) {
      var variant = host.getAttribute('data-ngd-cinebg-scene') || 'atmosphere';
      var wrap = document.createElement('div');
      wrap.className = 'ngd-cinebg-scene';
      wrap.setAttribute('aria-hidden', 'true');
      host.insertBefore(wrap, host.firstChild);

      var streakOnly = variant === 'streak';
      var layer = createLayer(wrap, {
        particles: coarse || small ? 12 : (streakOnly ? 18 : 26),
        alpha: 1,
        blobs: streakOnly ? null : [
          { x: 0.2, y: 0.18, r: 0.55, rgb: COOL, a: 0.10,
            sx: 0.06, sy: 0.05, dx: 0.06, dy: 0.05, ph: 0.4 },
          { x: 0.85, y: 0.4, r: 0.5, rgb: GOLD, a: 0.08,
            sx: 0.05, sy: 0.06, dx: 0.05, dy: 0.06, ph: 1.8 },
          { x: 0.5, y: 0.95, r: 0.45, rgb: '255,255,255', a: 0.045,
            sx: 0.04, sy: 0.05, dx: 0.04, dy: 0.03, ph: 3.2 }
        ],
        streak: { period: streakOnly ? 24 : 19, a: streakOnly ? 0.05 : 0.07 },
        grain: !streakOnly
      });
      if (layer) state.scenes += 1;
    });
  }

  /* ---------- cursor glow (fine pointers, wide screens) ---------- */
  function mountCursorGlow() {
    if (coarse || small) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover)').matches)) return;
    if (!document.querySelector('.ngd-hero, [data-ngd-cinebg-scene]')) return;

    var glow = document.createElement('div');
    glow.className = 'ngd-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var x = 0, y = 0, over = false, queued = false;
    function apply() {
      queued = false;
      glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      glow.classList.toggle('is-on', over);
    }
    document.addEventListener('pointermove', function (event) {
      x = event.clientX; y = event.clientY;
      over = !!(event.target && event.target.closest &&
                event.target.closest('.ngd-hero, [data-ngd-cinebg-scene]'));
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () {
      over = false;
      glow.classList.remove('is-on');
    });
  }

  function init() {
    try {
      mountAmbient();
      mountScenes();
      mountCursorGlow();
      if (layers.length) startLoop();
    } catch (err) {
      console.warn('[NGD Cinematic] background disabled:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
