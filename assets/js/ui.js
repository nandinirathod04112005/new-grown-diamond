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

  /* ---------- 3. Pointer tilt (max ~3deg, mouse only) ----------
     Also exported as window.NGDTilt(root) so pages that render
     cards dynamically (e.g. the inventory) can bind new nodes. */
  function bindTilt(root) {
    if (reducedMotion) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return; // no tilt on touch devices
    }

    var MAX_DEG = 3;

    (root || document).querySelectorAll('[data-ngd-tilt]').forEach(function (card) {
      if (card.__ngdTiltBound) return;
      card.__ngdTiltBound = true;

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

  window.NGDTilt = bindTilt;

  function initTilt() {
    bindTilt(document);
  }

  /* ---------- 4. Mobile menu (Bootstrap offcanvas) ---------- */
  function initMobileMenu() {
    var menu = document.querySelector('.ngd-mobile-menu');
    if (!menu || !menu.id) return;

    var togglers = document.querySelectorAll(
      '[data-bs-target="#' + menu.id + '"]'
    );

    function setOpen(open) {
      togglers.forEach(function (btn) {
        btn.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
    }

    menu.addEventListener('show.bs.offcanvas', function () { setOpen(true); });
    menu.addEventListener('hide.bs.offcanvas', function () { setOpen(false); });

    /* Navigating from the menu should close it (matters for
       same-page anchors; harmless for full navigations). */
    menu.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.bootstrap && window.bootstrap.Offcanvas) {
          var instance = window.bootstrap.Offcanvas.getInstance(menu);
          if (instance) instance.hide();
        }
      });
    });
  }

  /* ---------- 5. Subtle scroll parallax ----------
     Elements with data-ngd-parallax="<speed>" drift slightly as
     the page scrolls (desktop, fine pointers, motion allowed).
     The untransformed parent is measured so the applied transform
     never feeds back into the position calculation. */
  function initParallax() {
    if (reducedMotion) return;
    if (window.matchMedia('(max-width: 991.98px)').matches) return;

    var els = document.querySelectorAll('[data-ngd-parallax]');
    if (!els.length) return;

    var items = Array.prototype.map.call(els, function (el) {
      return {
        el: el,
        anchor: el.parentElement || el,
        speed: parseFloat(el.getAttribute('data-ngd-parallax')) || -0.05
      };
    });

    var ticking = false;

    function update() {
      ticking = false;
      var mid = window.innerHeight / 2;
      items.forEach(function (item) {
        var rect = item.anchor.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        var offset = (rect.top + rect.height / 2 - mid) * item.speed;
        item.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- 6. Footer helpers ----------
     Live copyright year + the floating back-to-top button
     (appears after scrolling; smooth scroll unless the visitor
     prefers reduced motion). */
  function initFooter() {
    document.querySelectorAll('[data-ngd-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

    var btn = document.querySelector('.ngd-totop');
    if (!btn) return;

    function toggle() {
      btn.classList.toggle('is-visible', window.scrollY > 480);
    }

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  function init() {
    initNavbar();
    initReveal();
    initTilt();
    initMobileMenu();
    initParallax();
    initFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
