/* ============================================================
   NEW GROWN DIAMOND — REAL DIAMOND HERO (photographic hybrid)
   ------------------------------------------------------------
   The hero prefers a REAL photographed diamond over the
   procedural WebGL stone. This module probes for the drop-in
   asset set under assets/images/hero/ and, when the main cutout
   exists, mounts a layered photographic scene:

     · one dominant hero diamond (the photograph) animated with
       camera-like motion — position, scale, perspective tilt,
       depth blur — never a flat spin
     · a masked light sweep, facet flash and a restrained
       spectral edge that travel INSIDE the stone's silhouette
       (the photograph itself is the mask), so sparkle reads as
       light hitting a real diamond
     · a mirrored dark-glass reflection and a contact shadow
     · four supporting diamonds on different depth layers —
       different sizes, positions, blur, opacity, paths, speeds
       (two on mobile)
     · the sapphire eclipse-halo signature, travelling light
       beams and floor caustics as CSS atmosphere; the page-wide
       canvas from home-environment.js stays the deep background
     · subtle "wisp" layers that carry the real-diamond imagery
       into the shapes / featured / jewellery sections (plus the
       growth stage when a rough-diamond asset exists)

   Timeline (10 s, GSAP; scroll and clicks are never blocked):
     0–1 dark · 1–2 a small stone enters from distance ·
     2–4 the hero diamond approaches the camera · 4–5 a moving
     light strikes it (brilliance) · 5–7 supporting stones cross
     depth layers · 7–8.5 the stone glides to its seat while the
     copy reveals · 8.5+ ambient loop (float, halo breathing,
     periodic sweep, occasional facet flash).

   NO asset in the repo? Nothing mounts and hero-3d.js keeps the
   WebGL film — this module never fakes a photograph. Drop a real
   cutout at assets/images/hero/hero-diamond.webp to switch the
   hero over automatically (see assets/images/hero/README.md).

   Test API: window.NGDHeroReal = { eligible, ready, active,
   seek, state, debug } and the shared __NGD_HERO_* flags with
   __NGD_HERO_MODE === 'real'.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 'assets/images/hero/';
  var MAIN_CANDIDATES = [
    BASE + 'hero-diamond.avif',
    BASE + 'hero-diamond.webp',
    BASE + 'hero-diamond.png'
  ];
  var SETTLE_T = 8.5;

  window.__NGD_HERO_MODE = window.__NGD_HERO_MODE || 'static';

  var body = document.body;
  var hero = document.querySelector('.ngd-hero');
  var stage = hero && hero.querySelector('.ngd-hero3d-stage');
  var eligible = !!(hero && stage && body && body.getAttribute('data-ngd-page') === 'home');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile =
    window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  var api = {
    eligible: eligible,
    active: false,
    ready: null,
    seek: function () { return null; },
    state: {
      profile: isMobile ? 'mobile' : 'desktop',
      t: function () { return 0; },
      settled: function () { return false; },
      assets: function () { return { main: null, supports: 0, wisps: 0 }; }
    },
    debug: function () { return null; }
  };
  window.NGDHeroReal = api;

  if (!eligible) {
    api.ready = Promise.resolve(false);
    return;
  }

  /* Hold the copy cascade for the few hundred ms the mode decision
     takes: in real mode the headline owns the ~7 s film beat, and in
     film mode removing the hold lets the normal cascade play. */
  if (!reduced) hero.classList.add('ngd-real-maybe');

  function probe(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(url); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }
  function probeFirst(urls) {
    return urls.reduce(function (chain, url) {
      return chain.then(function (hit) { return hit || probe(url); });
    }, Promise.resolve(null));
  }

  /* Optional dedicated files; anything missing falls back to the main
     cutout re-used at other scales, rotations and blur depths. */
  var supportProbe = Promise.all([
    probe(BASE + 'diamond-2.webp'),
    probe(BASE + 'diamond-3.webp'),
    probe(BASE + 'diamond-4.webp')
  ]);
  var roughProbe = probe(BASE + 'rough-diamond.webp');

  var decided = false;
  api.ready = new Promise(function (resolve) {
    var watchdog = setTimeout(function () { decide(false, null, null); }, 5000);
    function decide(active, mainUrl, supportUrls) {
      if (decided) return;
      decided = true;
      clearTimeout(watchdog);
      if (active) activate(mainUrl, supportUrls || [null, null, null]);
      else hero.classList.remove('ngd-real-maybe');
      resolve(active);
    }
    probeFirst(MAIN_CANDIDATES).then(function (mainUrl) {
      if (!mainUrl) return decide(false, null, null);
      var cap = new Promise(function (r) {
        setTimeout(function () { r([null, null, null]); }, 1500);
      });
      Promise.race([supportProbe, cap]).then(function (urls) {
        decide(true, mainUrl, urls);
      });
    });
  });

  /* ================= the photographic scene ================= */

  function activate(mainUrl, supportUrls) {
    var d2 = supportUrls[0];
    var d3 = supportUrls[1];
    var d4 = supportUrls[2];

    /* Every supporting stone gets its own size, position, depth blur,
       opacity, orientation, travel path and speed. */
    var SUPPORTS = [
      { key: 's1', url: d2 || mainUrl, w: 'min(11vw, 9rem)', pos: { top: '15%', right: '33%' },
        blur: 0.5, opa: 0.5, dur: 34, anim: 'cross', rot: -18, flip: false, depth: 0.55 },
      { key: 's2', url: d3 || mainUrl, w: 'min(7vw, 6rem)', pos: { top: '30%', left: '5%' },
        blur: 2.5, opa: 0.34, dur: 46, anim: 'driftup', rot: 14, flip: true, depth: 0.85 },
      { key: 's3', url: d4 || mainUrl, w: 'min(15vw, 12rem)', pos: { top: '54%', left: '20%' },
        blur: 1.2, opa: 0.4, dur: 40, anim: 'diag', rot: -32, flip: false, depth: 0.7 },
      { key: 's4', url: d2 || mainUrl, w: 'min(27vw, 22rem)', pos: { bottom: '-9%', left: '-5%' },
        blur: 6, opa: 0.28, dur: 52, anim: 'deep', rot: 24, flip: true, depth: 1.2 }
    ];

    var root = document.createElement('div');
    root.className = 'ngd-hero-real';
    root.setAttribute('data-ngd-hero-real', '');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="ngd-real-atmo"></div>' +
      '<div class="ngd-real-caustic"></div>' +
      '<div class="ngd-real-halo"></div>' +
      '<div class="ngd-real-field"></div>' +
      '<div class="ngd-real-main"><div class="ngd-real-card">' +
        '<div class="ngd-real-float">' +
          '<div class="ngd-real-glow"></div>' +
          '<img class="ngd-real-img" alt="" decoding="async">' +
          '<div class="ngd-real-sweep"></div>' +
          '<div class="ngd-real-spectral"></div>' +
          '<div class="ngd-real-flash"></div>' +
        '</div>' +
        '<div class="ngd-real-under">' +
          '<img class="ngd-real-reflection" alt="" decoding="async" loading="lazy">' +
          '<div class="ngd-real-shadow"></div>' +
        '</div>' +
      '</div></div>';

    root.querySelector('.ngd-real-img').src = mainUrl;
    root.querySelector('.ngd-real-reflection').src = mainUrl;

    /* The photograph is the mask: light effects only exist inside the
       stone's silhouette, so sparkle reads as facets catching light. */
    ['.ngd-real-sweep', '.ngd-real-spectral', '.ngd-real-flash'].forEach(function (sel) {
      var el = root.querySelector(sel);
      var v = 'url("' + mainUrl + '")';
      el.style.webkitMaskImage = v;
      el.style.maskImage = v;
      el.style.webkitMaskSize = '100% 100%';
      el.style.maskSize = '100% 100%';
    });

    var field = root.querySelector('.ngd-real-field');
    SUPPORTS.forEach(function (s) {
      var fig = document.createElement('figure');
      fig.className = 'ngd-real-support ngd-real-' + s.key;
      Object.keys(s.pos).forEach(function (k) { fig.style[k] = s.pos[k]; });
      fig.style.width = s.w;
      fig.style.opacity = 'calc(var(--' + s.key + ', 0) * ' + s.opa + ')';
      fig.style.transform =
        'translateY(calc(var(--ngd-heroexit, 0) * ' + (-26 * s.depth).toFixed(1) + 'vh)) ' +
        'translateX(calc(var(--ngd-par, 0) * ' + (6 * s.depth).toFixed(1) + 'px)) ' +
        'rotate(' + s.rot + 'deg) ' + (s.flip ? 'scaleX(-1) ' : '') +
        'scale(calc(0.55 + var(--' + s.key + ', 0) * 0.45))';
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.className = 'ngd-real-anim-' + s.anim;
      img.style.filter = 'blur(' + s.blur + 'px)';
      img.style.animationDuration = s.dur + 's';
      img.src = s.url;
      fig.appendChild(img);
      field.appendChild(fig);
    });

    if (isMobile) root.classList.add('ngd-real-mobile');
    hero.insertBefore(root, hero.firstElementChild);
    hero.classList.remove('ngd-real-maybe');
    hero.classList.add('ngd-real-on');

    window.__NGD_HERO_MODE = 'real';
    window.__NGD_HERO_PROFILE = isMobile ? 'mobile' : 'desktop';
    window.__NGD_HERO_INTRO = 'pending';
    window.__NGD_HERO_ANIMATED = !reduced;
    api.active = true;

    /* ---------------- timeline proxy ---------------- */

    var PROF = isMobile
      ? { startX: 0, approachX: 0, startY: 12, seatScale: 0.9, haloX: 0 }
      : { startX: -16, approachX: -10, startY: 6, seatScale: 0.88, haloX: -9 };

    var P = {
      s1: 0, s2: 0, s3: 0, s4: 0,
      mx: PROF.startX, my: PROF.startY, ms: 0.42, mb: 7, mo: 0,
      sweep: -130, flash: 0, spectral: 0,
      ho: 0, hs: 0.8, hx: PROF.haloX
    };
    var settledFlag = false;
    var ff = false;
    var seekHeld = false;
    var tl = null;

    function write() {
      var st = root.style;
      st.setProperty('--s1', P.s1.toFixed(3));
      st.setProperty('--s2', P.s2.toFixed(3));
      st.setProperty('--s3', P.s3.toFixed(3));
      st.setProperty('--s4', P.s4.toFixed(3));
      st.setProperty('--m-x', P.mx.toFixed(2));
      st.setProperty('--m-y', P.my.toFixed(2));
      st.setProperty('--m-s', P.ms.toFixed(3));
      st.setProperty('--m-b', P.mb.toFixed(2));
      st.setProperty('--m-o', P.mo.toFixed(3));
      st.setProperty('--sweep', P.sweep.toFixed(1));
      st.setProperty('--flash', P.flash.toFixed(3));
      st.setProperty('--spectral', P.spectral.toFixed(3));
      st.setProperty('--halo-o', P.ho.toFixed(3));
      st.setProperty('--halo-s', P.hs.toFixed(3));
      st.setProperty('--halo-x', P.hx.toFixed(2));
    }

    function setSettled() {
      settledFlag = true;
      hero.classList.add('ngd-real-settled');
      window.__NGD_HERO_INTRO = 'done';
    }

    function jumpToSettled() {
      P.s1 = P.s2 = P.s3 = P.s4 = 1;
      P.mx = 0; P.my = 0; P.ms = PROF.seatScale; P.mb = 0; P.mo = 1;
      P.sweep = 130; P.flash = 0; P.spectral = 0.08;
      P.ho = 0.42; P.hs = 1; P.hx = 0;
      write();
      setSettled();
    }

    if (reduced || !window.gsap) {
      /* Reduced motion (or no tween engine): the final composition,
         immediately — the ambient loop is disabled in CSS. */
      jumpToSettled();
    } else {
      tl = window.gsap.timeline({ defaults: { ease: 'power2.inOut' }, onUpdate: write });
      /* 1–2 s: a small stone enters from the distance */
      tl.to(P, { s1: 1, duration: 1.0, ease: 'power2.out' }, 1.0);
      /* 2–4 s: the hero diamond approaches the camera */
      tl.to(P, { mo: 1, duration: 0.6, ease: 'power1.out' }, 2.0);
      tl.to(P, { ms: 0.96, my: 0, mb: 0, mx: PROF.approachX, duration: 2.0, ease: 'power2.out' }, 2.0);
      tl.to(P, { ho: 0.32, hs: 1, duration: 1.2, ease: 'power1.inOut' }, 3.0);
      /* 4–5 s: the moving light strikes — brilliance */
      tl.to(P, { sweep: 130, duration: 0.95, ease: 'power1.inOut' }, 4.0);
      tl.to(P, { ms: 1.05, duration: 0.5, ease: 'power1.out' }, 4.3);
      tl.to(P, { flash: 0.55, duration: 0.3, ease: 'power1.in' }, 4.35);
      tl.to(P, { spectral: 0.3, duration: 0.3, ease: 'power1.out' }, 4.4);
      tl.to(P, { ho: 0.5, duration: 0.4, ease: 'power1.out' }, 4.4);
      tl.to(P, { flash: 0, duration: 0.5, ease: 'power2.out' }, 4.7);
      tl.to(P, { ms: 0.97, duration: 0.6 }, 4.9);
      tl.to(P, { spectral: 0.08, duration: 0.7 }, 5.0);
      /* 5–7 s: the supporting stones cross their depth layers */
      tl.to(P, { s2: 1, duration: 1.0, ease: 'power2.out' }, 5.1);
      tl.to(P, { ho: 0.42, duration: 0.8 }, 5.3);
      tl.to(P, { s3: 1, duration: 1.1, ease: 'power2.out' }, 5.7);
      tl.to(P, { s4: 1, duration: 1.1, ease: 'power2.out' }, 6.3);
      /* 7–8.5 s: the stone glides to its seat, the halo follows on
         its own lagged path, the copy reveals (CSS beat) */
      tl.to(P, { mx: 0, ms: PROF.seatScale, duration: 1.4 }, 7.0);
      tl.to(P, { hx: 0, duration: 1.3 }, 7.3);
      tl.call(setSettled, null, SETTLE_T);
      tl.to({}, { duration: 1.5 }, SETTLE_T); /* pad the film to 10 s */
      write();

      /* Early scrolls fast-forward the film — never a scroll lock. */
      var onScroll = function () {
        if (settledFlag || seekHeld) {
          window.removeEventListener('scroll', onScroll);
          return;
        }
        var p = (window.scrollY || 0) / Math.max(1, hero.offsetHeight * 0.9);
        if (p > 0.03) {
          ff = true;
          tl.timeScale(9);
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });

      document.addEventListener('visibilitychange', function () {
        if (!tl || seekHeld) return;
        if (document.hidden) tl.pause();
        else tl.play();
      });
    }

    /* Pause every layer while the hero is out of view. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var inView = entries[0].isIntersecting;
        hero.classList.toggle('ngd-real-off', !inView);
        if (tl && !seekHeld) {
          if (inView) tl.play();
          else tl.pause();
        }
      }, { threshold: 0.02 }).observe(hero);
    }

    /* Pointer parallax once the film settles (fine pointers only) —
       the camera, stones and halo all answer at their own depths. */
    if (!isMobile && !reduced && window.matchMedia('(pointer: fine)').matches) {
      window.__NGD_HERO_PARALLAX = true;
      var ptrX = 0;
      var ptrY = 0;
      var ptrRaf = null;
      var applyPointer = function () {
        ptrRaf = null;
        var w = settledFlag ? 1 : 0;
        root.style.setProperty('--m-ry', (ptrX * 4 * w).toFixed(2));
        root.style.setProperty('--m-rx', (ptrY * -2.5 * w).toFixed(2));
        root.style.setProperty('--ngd-par', (ptrX * 10 * w).toFixed(1));
        root.style.setProperty('--halo-px', (ptrX * 9 * w).toFixed(1));
      };
      hero.addEventListener('pointermove', function (event) {
        var rect = hero.getBoundingClientRect();
        ptrX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        ptrY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        if (!ptrRaf) ptrRaf = requestAnimationFrame(applyPointer);
      });
      hero.addEventListener('pointerleave', function () {
        ptrX = 0;
        ptrY = 0;
        if (!ptrRaf) ptrRaf = requestAnimationFrame(applyPointer);
      });
    }

    /* ---------------- section wisps (beyond the hero) ---------------- */

    var wispCount = 0;
    var WISP_SECTIONS = [
      { sel: '#diamond-shapes', items: [
        { w: 'min(9vw, 7rem)', top: '10%', left: '3%', blur: 2, opa: 0.12, dur: 44, anim: 'driftup', rot: -15 },
        { w: 'min(6vw, 5rem)', top: '56%', right: '4%', blur: 5, opa: 0.09, dur: 58, anim: 'cross', rot: 22, flip: true }
      ] },
      { sel: '#featured-diamonds', items: [
        { w: 'min(34vw, 28rem)', top: '4%', right: '-9%', blur: 16, opa: 0.07, dur: 64, anim: 'deep', rot: 12 }
      ] },
      { sel: '#fine-jewellery', items: [
        { w: 'min(24vw, 20rem)', bottom: '-7%', left: '-6%', blur: 9, opa: 0.1, dur: 70, anim: 'diag', rot: -24 }
      ] }
    ];

    function mountWisps() {
      if (isMobile) return; /* mobile keeps the canvas environment only */
      roughProbe.then(function (roughUrl) {
        var sections = WISP_SECTIONS.slice();
        if (roughUrl) {
          sections.push({ sel: '.ngd-story-stage[data-slug="growth"]', items: [
            { url: roughUrl, w: 'min(13vw, 11rem)', top: '14%', right: '6%', blur: 4, opa: 0.12, dur: 64, anim: 'driftup', rot: -10 }
          ] });
        }
        sections.forEach(function (cfg) {
          var section = document.querySelector(cfg.sel);
          if (!section) return;
          section.classList.add('ngd-has-wisps');
          var wrap = document.createElement('div');
          wrap.className = 'ngd-real-wisps';
          wrap.setAttribute('aria-hidden', 'true');
          cfg.items.forEach(function (w) {
            var img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'ngd-real-anim-' + w.anim;
            img.src = w.url || mainUrl;
            img.style.width = w.w;
            ['top', 'left', 'right', 'bottom'].forEach(function (k) {
              if (w[k]) img.style[k] = w[k];
            });
            img.style.opacity = String(w.opa);
            img.style.filter = 'blur(' + w.blur + 'px)';
            img.style.animationDuration = w.dur + 's';
            img.style.transform = 'rotate(' + w.rot + 'deg)' + (w.flip ? ' scaleX(-1)' : '');
            wrap.appendChild(img);
            wispCount += 1;
          });
          section.appendChild(wrap);
          if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
              wrap.classList.toggle('is-live', entries[0].isIntersecting);
            }, { rootMargin: '200px 0px' }).observe(section);
          } else {
            wrap.classList.add('is-live');
          }
        });
      });
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(mountWisps, { timeout: 2500 });
    else setTimeout(mountWisps, 1200);

    /* ---------------- test / debug API ---------------- */

    api.seek = function (sec) {
      if (reduced || !tl) return api.debug();
      seekHeld = true;
      tl.pause();
      tl.time(Math.max(0, Math.min(10, sec)), false);
      write();
      if (sec >= SETTLE_T) {
        setSettled();
      } else {
        settledFlag = false;
        hero.classList.remove('ngd-real-settled');
      }
      return api.debug();
    };

    api.state = {
      profile: isMobile ? 'mobile' : 'desktop',
      t: function () { return tl ? tl.time() : (reduced ? 10 : 0); },
      settled: function () { return settledFlag; },
      assets: function () {
        var visible = 0;
        root.querySelectorAll('.ngd-real-support').forEach(function (fig) {
          if (getComputedStyle(fig).display !== 'none') visible += 1;
        });
        return { main: mainUrl, supports: visible, wisps: wispCount };
      }
    };

    api.debug = function () {
      return {
        t: api.state.t(),
        playing: !!(tl && !tl.paused()),
        ff: ff,
        main: { x: P.mx, y: P.my, scale: P.ms, blur: P.mb, opacity: P.mo },
        sweep: P.sweep,
        flash: P.flash,
        spectral: P.spectral,
        halo: { opacity: P.ho, scale: P.hs, x: P.hx },
        supports: [P.s1, P.s2, P.s3, P.s4],
        settled: settledFlag
      };
    };
  }
})();
