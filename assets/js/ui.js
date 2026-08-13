/* ============================================================
   NEW GROWN DIAMOND — GLOBAL UI ENHANCEMENTS
   ------------------------------------------------------------
   Small, dependency-free helpers for the design system:
     1. Navbar glass state on scroll  (.ngd-navbar → .is-scrolled)
     2. Scroll reveal                 (.ngd-reveal → .is-visible)
     3. Subtle pointer tilt           ([data-ngd-tilt] cards)
   All effects respect prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Navbar scroll state ---------- */
  function initNavbar() {
    var navbars = document.querySelectorAll('.ngd-navbar');
    if (!navbars.length) return;

    function update() {
      var scrolled = window.scrollY > 8;
      navbars.forEach(function (nav) {
        nav.classList.toggle('is-scrolled', scrolled);
      });
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 2. Scroll reveal ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.ngd-reveal');
    if (!items.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      /* threshold 0 so very tall cards (small screens) still trigger */
      { threshold: 0, rootMargin: '0px 0px -6% 0px' }
    );

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 3. Pointer tilt (max ~3deg, mouse only) ---------- */
  function initTilt() {
    if (reducedMotion) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return; // no tilt on touch devices
    }

    var MAX_DEG = 3;

    document.querySelectorAll('[data-ngd-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          'perspective(900px) translateY(-8px)' +
          ' rotateX(' + (-y * MAX_DEG).toFixed(2) + 'deg)' +
          ' rotateY(' + (x * MAX_DEG).toFixed(2) + 'deg)';
      });

      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  function init() {
    initNavbar();
    initReveal();
    initTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
