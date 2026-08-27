/* ============================================================
   NEW GROWN DIAMOND — HOME MOTION LANGUAGE V2
   ------------------------------------------------------------
   GSAP/ScrollTrigger choreography for the homepage sections
   below the hero — the last stretch of the site that still ran
   on the generic blur reveal. This engine composes with what is
   already there rather than replacing it:

     · Section headers (Signature stones / Fine Jewellery / The
       journey): the headline splits into masked words that rise
       in cascade, the eyebrow tracks in, the gold divider draws
       itself, the lead settles last. The engine takes ownership
       of those header containers (.ngd-mo-own) so the old blur
       reveal doesn't double-animate them — ui.js still toggles
       .is-visible, other pages are untouched.
     · Product grids: the markup now carries data-anim-grid, so
       live Supabase cards cascade through the EXISTING stagger
       engine in scroll-animations.js. Nothing is duplicated.
     · The atelier: category cards tip in with stagger while
       their line-art sketches literally draw themselves
       (stroke-dashoffset over measured path lengths).
     · The journey: a gold fill rises up the existing spine with
       scroll (scrubbed, fully reversible) and each numbered
       node ignites as its stage is reached — and dims again
       when you scroll back.
     · Principles ribbon: the divider band loops its house lines
       only while on screen; without JS or with reduced motion
       it is a single static centred line.
     · Micro-interactions: gold/outline buttons outside the hero
       and navbar become gently magnetic (fine pointers only),
       and a hairline of gold at the very top of the viewport
       mirrors overall scroll progress.

   Honest-motion rules: reduced motion exits before any DOM
   change (everything simply shows), a missing GSAP leaves the
   classic reveals in charge, and no content ever depends on
   this file — it decorates, it never renders.
   ============================================================ */
(function () {
  'use strict';

  var state = {
    reduced: false,
    armed: false,
    headers: 0,
    words: 0,
    grids: 0,
    drawn: 0,
    nodes: 0,
    marquee: false,
    magnetic: 0
  };
  window.NGDHomeMotion = {
    state: state,
    spineProgress: function () {
      var story = document.querySelector('.ngd-story');
      return story ? parseFloat(story.style.getPropertyValue('--ngd-mo-spine') || '0') : 0;
    },
    litNodes: function () {
      return document.querySelectorAll('.ngd-story-node.is-lit').length;
    }
  };

  if (document.body.getAttribute('data-ngd-page') !== 'home') return;

  state.reduced = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (state.reduced) return;

  /* every trigger this engine creates, so late-rendering grids can
     re-anchor them individually — a global ScrollTrigger.refresh()
     would cancel any smooth scroll in flight */
  var tracked = [];

  function init() {
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    try { gsap.registerPlugin(ST); } catch (err) { /* ok */ }

    try {
      document.documentElement.classList.add('ngd-mo-armed');
      state.armed = true;
      headers(gsap, ST);
      countGrids();
      atelier(gsap, ST);
      journey(gsap, ST);
      marquee();
      magnetic(gsap);
      hairline(gsap, ST);
      refreshOnGrowth(ST);
    } catch (err) {
      console.warn('[NGD Motion] home choreography disabled:', err);
      document.documentElement.classList.remove('ngd-mo-armed');
      state.armed = false;
    }
  }

  /* ---------- section headers: masked word cascade ----------
     The split only wraps — every character of the original text
     (and the italic-accent span) survives, so CMS bindings and
     copy checks read exactly what was always there. */
  var HEADER_SECTIONS = ['#featured-diamonds', '#fine-jewellery', '#manufacturing-story'];

  function splitWords(h2) {
    var nodes = Array.prototype.slice.call(h2.childNodes);
    var count = 0;
    function mask(content) {
      var w = document.createElement('span');
      w.className = 'ngd-mo-w';
      var i = document.createElement('span');
      i.className = 'ngd-mo-wi';
      i.appendChild(content);
      w.appendChild(i);
      count++;
      return w;
    }
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else frag.appendChild(mask(document.createTextNode(part)));
        });
        h2.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== 'BR') {
        h2.replaceChild(mask(node.cloneNode(true)), node);
      }
    });
    return count;
  }

  function headers(gsap, ST) {
    HEADER_SECTIONS.forEach(function (sel) {
      var section = document.querySelector(sel);
      if (!section) return;
      var box = section.querySelector('.row .col-lg-8');
      if (!box) return;
      var holder = box.closest('.ngd-reveal') || box;
      holder.classList.add('ngd-mo-own');

      var eyebrow = box.querySelector('.ngd-eyebrow');
      var h2 = box.querySelector('h2');
      var lead = box.querySelector('.ngd-lead');
      if (!h2) return;
      state.words += splitWords(h2);
      var wis = h2.querySelectorAll('.ngd-mo-wi');

      /* the gold divider is NOT animated here — the site-wide
         signature draw (ngd-fx-ready + .is-visible) already owns
         it, and ui.js keeps toggling .is-visible on this holder */
      var tl = gsap.timeline({
        scrollTrigger: { trigger: box, start: 'top 84%', once: true },
        onComplete: function () {
          h2.classList.add('ngd-mo-done');
          holder.setAttribute('data-mo-done', '1');
          gsap.set([wis, lead, eyebrow], { clearProps: 'all' });
        }
      });
      if (eyebrow) {
        tl.from(eyebrow, {
          autoAlpha: 0, letterSpacing: '0.6em', duration: 0.8, ease: 'power2.out'
        }, 0);
      }
      tl.from(wis, {
        yPercent: 112, rotate: 2.5, duration: 0.9,
        stagger: 0.05, ease: 'power4.out'
      }, 0.08);
      if (lead) {
        tl.from(lead, { autoAlpha: 0, y: 22, duration: 0.7, ease: 'power2.out' }, 0.55);
      }
      if (tl.scrollTrigger) tracked.push(tl.scrollTrigger);
      state.headers++;
    });
  }

  /* ---------- grids: adoption census only ----------
     The stagger itself is scroll-animations.js — the homepage
     grids simply joined its [data-anim-grid] roster. */
  function countGrids() {
    state.grids = document.querySelectorAll(
      '#featured-diamonds-grid[data-anim-grid], ' +
      '#featured-jewellery-grid[data-anim-grid], ' +
      '[data-recent-grid][data-anim-grid]').length;
  }

  /* ---------- the atelier: tip-in cards, self-drawing art ---------- */
  function atelier(gsap, ST) {
    var cols = Array.prototype.slice.call(
      document.querySelectorAll('#fine-jewellery-grid > .ngd-reveal'));
    if (!cols.length) return;
    cols.forEach(function (col) { col.classList.add('ngd-mo-own'); });

    var drawable = [];
    cols.forEach(function (col) {
      var shapes = col.querySelectorAll('.ngd-jewel-figure svg *');
      Array.prototype.forEach.call(shapes, function (el) {
        try {
          if (typeof el.getTotalLength !== 'function') return;
          var len = el.getTotalLength();
          if (!isFinite(len) || len <= 0) return;
          el.style.strokeDasharray = String(len);
          el.style.strokeDashoffset = String(len);
          drawable.push(el);
        } catch (err) { /* non-geometry node */ }
      });
    });
    state.drawn = drawable.length;

    ST.batch(cols, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        /* opacity, not autoAlpha: a visibility flip would leave the
           cards pointer-dead for a frame or two mid-entrance */
        gsap.from(batch, {
          opacity: 0, y: 46, rotationX: 7, transformPerspective: 900,
          duration: 0.9, stagger: 0.09, ease: 'power3.out',
          onComplete: function () { gsap.set(batch, { clearProps: 'all' }); }
        });
        var strokes = [];
        batch.forEach(function (col) {
          col.querySelectorAll('.ngd-jewel-figure svg *').forEach(function (el) {
            if (drawable.indexOf(el) !== -1) strokes.push(el);
          });
        });
        if (strokes.length) {
          gsap.to(strokes, {
            strokeDashoffset: 0, duration: 1.5, stagger: 0.05,
            ease: 'power2.inOut', delay: 0.15,
            onComplete: function () {
              strokes.forEach(function (el) {
                el.style.strokeDasharray = '';
                el.style.strokeDashoffset = '';
              });
            }
          });
        }
      }
    });
  }

  /* ---------- the journey: rising spine, igniting nodes ---------- */
  function journey(gsap, ST) {
    var story = document.querySelector('#manufacturing-story .ngd-story');
    var spine = story && story.querySelector('.ngd-story-spine');
    if (!story || !spine) return;

    var fill = document.createElement('i');
    fill.className = 'ngd-mo-spinefill';
    fill.setAttribute('aria-hidden', 'true');
    spine.appendChild(fill);

    tracked.push(ST.create({
      trigger: story,
      start: 'top 70%',
      end: 'bottom 45%',
      scrub: 0.4,
      onUpdate: function (self) {
        story.style.setProperty('--ngd-mo-spine', self.progress.toFixed(4));
      },
      onRefresh: function (self) {
        story.style.setProperty('--ngd-mo-spine', self.progress.toFixed(4));
      }
    }));

    var stages = story.querySelectorAll('.ngd-story-stage');
    state.nodes = stages.length;
    Array.prototype.forEach.call(stages, function (stage) {
      var node = stage.querySelector('.ngd-story-node');
      if (!node) return;
      tracked.push(ST.create({
        trigger: stage,
        start: 'top 64%',
        onEnter: function () { node.classList.add('is-lit'); },
        onLeaveBack: function () { node.classList.remove('is-lit'); }
      }));
    });
  }

  /* ---------- principles ribbon ---------- */
  function marquee() {
    var band = document.querySelector('[data-ngd-marquee]');
    var track = band && band.querySelector('[data-marquee-track]');
    var seq = track && track.querySelector('.ngd-marquee-seq');
    if (!band || !track || !seq) return;
    if (track.children.length === 1) {
      var clone = seq.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    band.classList.add('is-ready');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          band.classList.toggle('is-on', entry.isIntersecting);
        });
      }, { rootMargin: '80px 0px' });
      io.observe(band);
    } else {
      band.classList.add('is-on');
    }
    state.marquee = true;
  }

  /* ---------- magnetic buttons (fine pointers only) ---------- */
  function magnetic(gsap) {
    if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;
    var buttons = Array.prototype.filter.call(
      document.querySelectorAll('.ngd-btn-gold, .ngd-btn-outline'),
      function (btn) {
        return !btn.closest('.ngd-hero') && !btn.closest('.ngd-navbar');
      });
    buttons.forEach(function (btn) {
      var toX = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      var toY = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var relX = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var relY = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        toX(Math.max(-1, Math.min(1, relX)) * 7);
        toY(Math.max(-1, Math.min(1, relY)) * 5);
      });
      btn.addEventListener('pointerleave', function () { toX(0); toY(0); });
    });
    state.magnetic = buttons.length;
  }

  /* ---------- keep trigger geometry honest ----------
     The featured stones, atelier features and recently-viewed
     rows render from Supabase AFTER ScrollTrigger has measured
     the page, shifting everything below them. A debounced
     refresh keeps the spine, node and header triggers anchored
     to where the sections really are. */
  function refreshOnGrowth(ST) {
    if (!('MutationObserver' in window)) return;
    var timer = null;
    var grids = document.querySelectorAll(
      '#featured-diamonds-grid, #featured-jewellery, [data-recent-grid]');
    if (!grids.length) return;
    var mo = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        tracked.forEach(function (trigger) {
          try { trigger.refresh(); } catch (err) { /* killed once-trigger */ }
        });
      }, 180);
    });
    Array.prototype.forEach.call(grids, function (grid) {
      mo.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    });
  }

  /* ---------- scroll progress hairline ---------- */
  function hairline(gsap, ST) {
    var bar = document.createElement('div');
    bar.className = 'ngd-mo-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    tracked.push(ST.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: function (self) {
        bar.style.setProperty('--ngd-mo-sp', self.progress.toFixed(4));
      }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
