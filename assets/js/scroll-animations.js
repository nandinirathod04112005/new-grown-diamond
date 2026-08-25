/* ============================================================
   NEW GROWN DIAMOND — SCROLL ANIMATIONS
   ------------------------------------------------------------
   One shared engine for the public pages:

     · [data-anim="rise|mask|clip|blur|stagger"]  — purpose-built
       entrance per element, revealed once on scroll (CSS does
       the motion; this file only toggles .is-inview).
     · [data-anim-grid]  — dynamically rendered product grids
       (inventory, jewellery, finder results, detail specs):
       freshly inserted cards cascade in with a capped stagger,
       without touching any of the Supabase rendering logic.
     · Footer entrance   — gold line + column cascade.
     · Detail media sweep — one light pass over the product stage.
     · About heritage rail — fixed progress dots whose connecting
       line fills with scroll (GSAP ScrollTrigger when available,
       plain scroll fallback otherwise).

   Nothing here is load-bearing: hidden states only exist after
   this script arms the page (html.ngd-fx-ready), so with JS off
   or prefers-reduced-motion on, every element renders visible.
   ============================================================ */
(function () {
  'use strict';

  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    reduced: reduced,
    armed: false,
    reveals: 0,
    grids: 0,
    rail: false
  };
  window.NGDScrollFX = { state: state };

  if (reduced) return;

  var hasIO = 'IntersectionObserver' in window;

  /* ---------- reveal engine ---------- */
  function initReveals() {
    var els = document.querySelectorAll('[data-anim]');
    state.reveals = els.length;
    if (!els.length) return;

    if (!hasIO) {
      els.forEach(function (el) { el.classList.add('is-inview'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- dynamic grid stagger ---------- */
  function isGridChild(node, grid) {
    var parent = node.parentElement;
    if (!parent) return false;
    if (parent === grid) return true;
    return parent.classList.contains('row') &&
           (parent.parentElement === grid ||
            (parent.parentElement && parent.parentElement.parentElement === grid));
  }

  function staggerNodes(nodes) {
    var delay = 0;
    nodes.forEach(function (node) {
      if (node.__ngdStag) return;
      node.__ngdStag = true;
      node.classList.add('ngd-stagger-card');
      node.style.setProperty('--ngd-d', delay + 'ms');
      delay = Math.min(delay + 45, 420);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nodes.forEach(function (node) { node.classList.add('ngd-anim-in'); });
      });
    });
  }

  function initGrids() {
    var grids = document.querySelectorAll('[data-anim-grid]');
    state.grids = grids.length;
    if (!grids.length || !('MutationObserver' in window)) return;

    grids.forEach(function (grid) {
      new MutationObserver(function (mutations) {
        var fresh = [];
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (node) {
            if (node.nodeType === 1 && !node.__ngdStag && isGridChild(node, grid)) {
              fresh.push(node);
            }
          });
        });
        if (fresh.length) staggerNodes(fresh);
      }).observe(grid, { childList: true, subtree: true });
    });
  }

  /* ---------- footer entrance ----------
     The visibility flag goes on <html>, not the footer, so the
     footer element's markup stays identical across pages. */
  function initFooter() {
    var footer = document.querySelector('.ngd-footer');
    if (!footer) return;
    var root = document.documentElement;
    if (!hasIO) { root.classList.add('ngd-footer-inview'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          root.classList.add('ngd-footer-inview');
          io.disconnect();
        }
      });
    }, { threshold: 0.1 });
    io.observe(footer);
  }

  /* ---------- detail media light sweep ---------- */
  function initMediaSweep() {
    var stages = document.querySelectorAll('.ngd-detail-stage, .ngd-jd-stage');
    if (!stages.length) return;
    if (!hasIO) {
      stages.forEach(function (el) { el.classList.add('ngd-sweep-run'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ngd-sweep-run');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    stages.forEach(function (el) { io.observe(el); });
  }

  /* ---------- about heritage rail ---------- */
  var BEATS = [
    ['about-intro', 'Four decades of diamonds'],
    ['about-legacy', 'Natural-diamond origins'],
    ['about-transition', 'The 2012 lab-grown transition'],
    ['about-surat', 'Surat facilities'],
    ['about-serve', 'Global supply']
  ];

  function initAboutRail() {
    if (document.body.getAttribute('data-ngd-page') !== 'about') return;

    var sections = [];
    BEATS.forEach(function (beat) {
      var el = document.getElementById(beat[0]);
      if (el) sections.push({ el: el, label: beat[1] });
    });
    if (sections.length < 2) return;

    var rail = document.createElement('nav');
    rail.className = 'ngd-abt-rail';
    rail.id = 'about-story-progress';
    rail.setAttribute('aria-label', 'Heritage timeline progress');
    sections.forEach(function (item, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'ngd-abt-dot';
      dot.setAttribute('data-abt-dot', String(index));
      dot.setAttribute('aria-label', item.label);
      dot.addEventListener('click', function () {
        item.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      rail.appendChild(dot);
    });
    document.body.appendChild(rail);
    state.rail = true;

    var dots = rail.querySelectorAll('.ngd-abt-dot');
    var first = sections[0].el;
    var last = sections[sections.length - 1].el;

    function setProgress(p) {
      rail.style.setProperty('--ngd-abt-p', String(Math.max(0, Math.min(1, p))));
      rail.classList.toggle('is-shown', p > 0.001 && p < 0.999);
    }

    /* Fill the connecting line with scroll progress */
    if (window.gsap && window.ScrollTrigger) {
      try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (err) { /* ok */ }
      window.ScrollTrigger.create({
        trigger: first,
        start: 'top 55%',
        endTrigger: last,
        end: 'bottom 45%',
        onUpdate: function (self) { setProgress(self.progress); },
        onRefresh: function (self) { setProgress(self.progress); }
      });
    } else {
      var ticking = false;
      function measure() {
        ticking = false;
        var mid = window.innerHeight * 0.5;
        var top = first.getBoundingClientRect().top - mid;
        var bottom = last.getBoundingClientRect().bottom - mid;
        var span = bottom - top;
        setProgress(span > 0 ? -top / span : 0);
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(measure); }
      }, { passive: true });
      measure();
    }

    /* Active dot follows the section closest to the viewport centre */
    if (hasIO) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = sections.findIndex(function (s) { return s.el === entry.target; });
          dots.forEach(function (dot, i) {
            dot.classList.toggle('is-active', i === idx);
          });
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      sections.forEach(function (s) { io.observe(s.el); });
    }
  }

  function init() {
    try {
      document.documentElement.classList.add('ngd-fx-ready');
      state.armed = true;
      initReveals();
      initGrids();
      initFooter();
      initMediaSweep();
      initAboutRail();
    } catch (err) {
      console.warn('[NGD Cinematic] scroll effects disabled:', err);
      document.documentElement.classList.remove('ngd-fx-ready');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
