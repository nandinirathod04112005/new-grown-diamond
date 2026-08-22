/* ============================================================
   NEW GROWN DIAMOND — HOMEPAGE CINEMATIC DIRECTOR
   ------------------------------------------------------------
   The connective tissue of the "From Carbon to Brilliance"
   experience. This module never owns content — it choreographs
   what already exists:

     - hero opening: the copy reveals in a staged sequence while
       the 3D diamond fades up from darkness (hero-3d.js runs the
       WebGL side; CTAs stay clickable from the first frame)
     - scroll handoff: hero scroll progress feeds
       window.NGDHero3D.setScroll(p) so the SAME diamond rotates
       and recedes as the story begins, instead of vanishing
     - journey progress rail: an elegant 01–06 indicator for the
       manufacturing story (vertical on desktop, compact strip on
       mobile), driven by which stage is in view
     - a shared scroll-progress engine for the journey scenes:
       GSAP ScrollTrigger (vendored, assets/vendor/gsap) when
       available, with a plain scroll/rAF fallback so nothing
       depends on the library loading

   prefers-reduced-motion: the opening sequence and scroll
   choreography are skipped entirely — everything is immediately
   visible and static. No content is gated behind animation.
   Debug/test surface: window.NGDCinematic.state.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  var state = {
    profile: isMobile ? 'mobile' : 'desktop',
    reduced: reduced,
    gsap: false,
    heroIntro: 'off',   /* off | played */
    heroScroll: 0,
    rail: false,
    activeStage: null
  };
  var listeners = [];

  /* ---------------- shared scroll-progress engine ---------------- */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /** Progress 0→1 while `el` crosses the viewport (top hits 85%vh → bottom
      hits 15%vh). ScrollTrigger scrubs it when present; otherwise a passive
      scroll listener does the same maths. Nothing runs while offscreen. */
  function onProgress(el, callback) {
    if (window.gsap && window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        end: 'bottom 15%',
        scrub: true,
        onUpdate: function (self) { callback(self.progress); }
      });
      return;
    }
    var ticking = false;
    function measure() {
      ticking = false;
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var span = rect.height + vh * 0.7;
      var passed = vh * 0.85 - rect.top;
      callback(clamp01(passed / span));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
  }

  window.NGDCinematic = { state: state, onProgress: onProgress };

  function init() {
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      state.gsap = true;
    }

    /* the cinematic pages: the homepage journey section or the full
       nine-stage manufacturing process page */
    var hero = document.querySelector('.ngd-hero');
    var story = document.querySelector('#manufacturing-story, #mfg-process');
    if (!story) return;

    initHeroSequence();
    initHeroHandoff();
    initJourneyRail(story);
    listeners.forEach(function (fn) { fn(); });
  }

  /* ---------------- hero opening sequence ---------------- */

  function initHeroSequence() {
    var heroSection = document.querySelector('.ngd-hero');
    if (!heroSection) return;
    var copy = heroSection.querySelectorAll('.ngd-eyebrow, h1, .ngd-divider, .ngd-lead, .ngd-btn');

    if (reduced) {
      /* no sequence — everything simply present */
      heroSection.classList.add('ngd-cine-ready');
      return;
    }

    heroSection.classList.add('ngd-cine');
    copy.forEach(function (el, index) {
      el.classList.add('ngd-cine-item');
      el.style.setProperty('--ngd-cine-i', String(index));
    });
    /* two frames so the initial (hidden) state paints first, then reveal —
       the items are CSS-transitioned, so CTAs are clickable throughout */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        heroSection.classList.add('ngd-cine-ready');
        state.heroIntro = 'played';
      });
    });
  }

  /* ---------------- hero → story scroll handoff ---------------- */

  function initHeroHandoff() {
    var heroSection = document.querySelector('.ngd-hero');
    if (!heroSection || reduced) return;
    onProgress(heroSection, function (p) {
      state.heroScroll = p;
      if (window.NGDHero3D && typeof window.NGDHero3D.setScroll === 'function') {
        window.NGDHero3D.setScroll(p);
      }
    });
  }

  /* ---------------- manufacturing journey progress rail ---------------- */

  function initJourneyRail(story) {
    if (!story) return;
    var stages = story.querySelectorAll('.ngd-story-stage[data-stage]');
    if (!stages.length) return;

    var rail = document.createElement('nav');
    rail.id = 'home-journey-progress';
    rail.className = 'ngd-journey-rail';
    rail.setAttribute('aria-label', 'Manufacturing journey progress');
    var labels = { growth: 'Growth', rough: 'Rough', planning: 'Planning',
      cutting: 'Cutting', laser: 'Laser', polishing: 'Polishing',
      inspection: 'Inspection', certification: 'Certified',
      finished: 'Finished', jewellery: 'Jewellery' };
    stages.forEach(function (stage) {
      var num = stage.getAttribute('data-stage');
      var slug = stage.getAttribute('data-slug');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ngd-journey-dot';
      btn.setAttribute('data-journey-stage', num);
      btn.setAttribute('aria-label', 'Stage ' + num + ' — ' + (labels[slug] || slug));
      btn.innerHTML = '<em>' + num + '</em><span>' + (labels[slug] || slug) + '</span>';
      btn.addEventListener('click', function () {
        stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      });
      rail.appendChild(btn);
    });
    story.appendChild(rail);
    state.rail = true;

    function setActive(num) {
      state.activeStage = num;
      rail.querySelectorAll('.ngd-journey-dot').forEach(function (dot) {
        var on = dot.getAttribute('data-journey-stage') === num;
        dot.classList.toggle('is-active', on);
        if (on) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.getAttribute('data-stage'));
        });
      }, { rootMargin: '-40% 0px -40% 0px' });
      stages.forEach(function (stage) { observer.observe(stage); });
    } else {
      setActive('01');
    }

    /* the rail only shows while the journey is on screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        rail.classList.toggle('is-shown', entries[0].isIntersecting);
      }, { threshold: 0.02 }).observe(story);
    } else {
      rail.classList.add('is-shown');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
