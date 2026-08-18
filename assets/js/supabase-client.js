/* ============================================================
   NEW GROWN DIAMOND — SUPABASE CLIENT (single shared instance)
   ------------------------------------------------------------
   Creates exactly ONE Supabase JS v2 client for the whole site
   and exposes:

     window.ngdSupabase            → the client (or null when the
                                     project is not configured yet)
     window.NGD_SITE_ROOT          → absolute URL of the site root,
                                     so redirects work from any
                                     folder (/, /account, /admin)
     window.ngdIsSupabaseConfigured() → boolean helper

   Load order on every page that talks to Supabase:
     1. Supabase JS v2 (CDN)
     2. assets/js/supabase-config.js   ← credentials live there
     3. this file
     4. assets/js/auth-guard.js
     5. the page script (login.js, register.js, …)

   Do not call supabase.createClient anywhere else.
   ============================================================ */
(function () {
  'use strict';

  /* ---- Site root, derived from this script's own URL ---- */
  var SCRIPT_SUFFIX = 'assets/js/supabase-client.js';
  var scriptSrc =
    (document.currentScript && document.currentScript.src) || '';
  window.NGD_SITE_ROOT = scriptSrc.endsWith(SCRIPT_SUFFIX)
    ? scriptSrc.slice(0, -SCRIPT_SUFFIX.length)
    : new URL('./', window.location.href).href;

  /* ---- Read + sanity-check the configuration ---- */
  var cfg = window.NGD_SUPABASE_CONFIG || {};
  var url = (cfg.SUPABASE_URL || '').trim();
  var key = (cfg.SUPABASE_PUBLISHABLE_KEY || '').trim();

  var configured =
    url.indexOf('https://') === 0 &&
    url.indexOf('YOUR_') === -1 &&
    key.length > 20 &&
    key.indexOf('YOUR_') === -1;

  window.ngdIsSupabaseConfigured = function () {
    return configured && !!window.ngdSupabase;
  };

  /* ---- Create the one shared client ---- */
  if (window.ngdSupabase) {
    // A client already exists (double include) — never create a second one.
    return;
  }

  if (!configured) {
    /* 'unconfigured' → placeholders still in supabase-config.js */
    window.ngdSupabase = null;
    window.ngdSupabaseState = 'unconfigured';
    console.warn(
      '[NGD] Supabase is not configured yet. ' +
        'Open assets/js/supabase-config.js and paste your Project URL ' +
        'and Publishable key. See docs/SUPABASE_AUTH_SETUP.md.'
    );
    showConfigBanner();
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    /* 'lib_missing' → CDN blocked/offline; auth cannot run this load */
    window.ngdSupabase = null;
    window.ngdSupabaseState = 'lib_missing';
    console.error(
      '[NGD] The Supabase JS library did not load (CDN blocked or offline). ' +
        'Authentication is unavailable on this page load.'
    );
    return;
  }

  window.ngdSupabase = window.supabase.createClient(url, key);
  window.ngdSupabaseState = 'ready';

  /* ---- Developer-facing banner when placeholders are detected ---- */
  function showConfigBanner() {
    function inject() {
      if (document.getElementById('ngd-config-banner')) return;
      var banner = document.createElement('div');
      banner.id = 'ngd-config-banner';
      banner.setAttribute('role', 'alert');
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:2000;' +
        'background:#17171b;color:#f4f2ee;font:500 13px/1.5 Inter,Arial,sans-serif;' +
        'padding:10px 16px;text-align:center;border-bottom:2px solid #b48c47;';
      banner.textContent =
        'Supabase is not configured yet — enter your Project URL and ' +
        'Publishable key in assets/js/supabase-config.js (see docs/SUPABASE_AUTH_SETUP.md).';
      document.body.appendChild(banner);
      /* Never leave a guarded page blank because config is missing */
      document.body.style.visibility = 'visible';
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  }
})();
