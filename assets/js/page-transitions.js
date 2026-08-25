/* ============================================================
   NEW GROWN DIAMOND — PAGE TRANSITIONS
   ------------------------------------------------------------
   A lightweight, failure-safe transition between the public
   pages: clicking an internal link dips the current page, runs
   a short cinematic overlay (dark veil + travelling light line
   + diamond mark), then performs a normal browser navigation.
   The arriving page plays a brief per-page intro (CSS-driven
   via body.ngd-pt-enter + data-ngd-page).

   Safety rules — the transition NEVER intercepts:
     · external origins, mailto:, tel:, javascript:, downloads
     · target="_blank" (WhatsApp etc.), modified/middle clicks
     · in-page anchors, forms, buttons — only plain <a> clicks
     · auth/account/admin URLs (not on the public whitelist)
     · anything when prefers-reduced-motion is set
   And if this script throws, the browser's default navigation
   still happens — the site works exactly as before.
   ============================================================ */
(function () {
  'use strict';

  if (window.__NGD_PT_INIT) return;
  window.__NGD_PT_INIT = true;

  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DURATION = 520;   // ms before navigation — spec range 450–800ms

  var PUBLIC_PAGES = [
    '', 'index.html', 'diamonds.html', 'diamond-details.html',
    'diamond-finder.html', 'jewellery.html', 'jewellery-details.html',
    'manufacturing.html', 'education.html', 'about.html', 'contact.html',
    'compare-diamonds.html', 'privacy.html', 'terms.html'
  ];

  var SLUGS = {
    '': 'home', 'index.html': 'home', 'diamonds.html': 'diamonds',
    'diamond-details.html': 'diamond-details', 'diamond-finder.html': 'finder',
    'jewellery.html': 'jewellery', 'jewellery-details.html': 'jewellery-details',
    'manufacturing.html': 'manufacturing', 'education.html': 'education',
    'about.html': 'about', 'contact.html': 'contact',
    'compare-diamonds.html': 'compare', 'privacy.html': 'privacy',
    'terms.html': 'terms'
  };

  var state = { enabled: !reduced, reduced: reduced, intercepted: 0 };
  window.NGDPageTransitions = { state: state, DURATION: DURATION };

  if (reduced) return; // identical functionality, zero delay

  var overlay = null;
  var leaving = false;

  function basename(pathname) {
    var piece = pathname.split('/').pop();
    return piece || '';
  }

  function ensurePageSlug() {
    if (!document.body.getAttribute('data-ngd-page')) {
      var slug = SLUGS[basename(location.pathname)];
      if (slug) document.body.setAttribute('data-ngd-page', slug);
    }
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'ngd-pt-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    var line = document.createElement('div');
    line.className = 'ngd-pt-line';
    var mark = document.createElement('div');
    mark.className = 'ngd-pt-mark';
    overlay.appendChild(line);
    overlay.appendChild(mark);
    document.body.appendChild(overlay);
  }

  function reset() {
    leaving = false;
    if (overlay) overlay.classList.remove('is-active');
    document.body.classList.remove('ngd-pt-leaving');
  }

  /* ---------- arrival intro ---------- */
  function playEnter() {
    ensurePageSlug();
    document.body.classList.add('ngd-pt-enter');
    setTimeout(function () {
      document.body.classList.remove('ngd-pt-enter');
    }, 1000);
  }

  /* ---------- departure ---------- */
  function shouldIntercept(event, anchor) {
    if (event.defaultPrevented) return null;
    if (event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (anchor.hasAttribute('download')) return null;
    if (anchor.hasAttribute('data-no-transition')) return null;
    var target = anchor.getAttribute('target');
    if (target && target !== '_self') return null;

    var raw = anchor.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#') return null;
    var scheme = raw.split(':')[0].toLowerCase();
    if (raw.indexOf(':') !== -1 &&
        scheme !== 'http' && scheme !== 'https') return null; // mailto:, tel:, wa:, js:

    var url;
    try { url = new URL(anchor.href, location.href); } catch (err) { return null; }
    if (url.origin !== location.origin) return null;
    if (PUBLIC_PAGES.indexOf(basename(url.pathname)) === -1) return null;

    /* same-document anchor navigation stays native */
    if (url.pathname === location.pathname &&
        url.search === location.search && url.hash) return null;

    return url;
  }

  function onClick(event) {
    try {
      var anchor = event.target && event.target.closest
        ? event.target.closest('a[href]')
        : null;
      if (!anchor) return;

      var url = shouldIntercept(event, anchor);
      if (!url) return;

      event.preventDefault();
      if (leaving) return;
      leaving = true;
      state.intercepted += 1;

      document.body.classList.add('ngd-pt-leaving');
      if (overlay) overlay.classList.add('is-active');

      setTimeout(function () { location.href = url.href; }, DURATION);
      /* If something blocks the navigation, recover the page. */
      setTimeout(function () { if (leaving) reset(); }, DURATION + 2200);
    } catch (err) {
      /* Never break navigation — fall back to the browser default. */
    }
  }

  function init() {
    try {
      buildOverlay();
      playEnter();
      document.addEventListener('click', onClick);
      /* Back/forward from the bfcache must land on a clean page. */
      window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
          reset();
          document.body.classList.remove('ngd-pt-enter');
        }
      });
    } catch (err) {
      console.warn('[NGD Cinematic] page transitions disabled:', err);
      state.enabled = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
