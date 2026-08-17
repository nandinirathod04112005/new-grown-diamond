/* ============================================================
   NEW GROWN DIAMOND — SUPABASE CONNECTION STATUS (STEP 29)
   ------------------------------------------------------------
   Diagnostic page logic for supabase-status.html. Runs four
   honest checks and never shows a key, URL or any secret:

     1. Supabase client — did supabase-client.js create the one
        shared instance? (ngdSupabaseState: ready /
        unconfigured / lib_missing)
     2. Database API — a HEAD count on `profiles`. IMPORTANT:
        Row Level Security hiding rows (zero count, or a
        PostgREST permission error) still means the API is
        REACHABLE — only a network-level failure counts as
        Failed.
     3. Auth service — the auth interface responds to
        getSession().
     4. Current session — signed in or signed out in THIS
        browser (login itself connects in a later step).

   window.ngdStatusDone flips true when a run finishes (used by
   the automated tests and the Re-run button).
   ============================================================ */
(function () {
  'use strict';

  function chip(key) {
    return document.querySelector('[data-sb-chip="' + key + '"]');
  }

  function setRow(key, tone, label, note) {
    var c = chip(key);
    if (!c) return;
    c.className = 'ngd-status-chip' + (tone ? ' is-' + tone : '');
    c.textContent = label;
    var n = document.querySelector('[data-sb-note="' + key + '"]');
    if (n) n.textContent = note || '';
  }

  function setPending(key) {
    setRow(key, 'dim', 'Checking…', '');
  }

  /* ---------------- the four checks ---------------- */

  function checkClient() {
    var state = window.ngdSupabaseState;
    if (state === 'ready' && window.ngdSupabase) {
      setRow('client', 'good', 'Connected',
        'The single shared client initialised from assets/js/supabase-config.js.');
      return true;
    }
    if (state === 'unconfigured') {
      setRow('client', 'bad', 'Failed',
        'Not configured yet — paste your Project URL and Publishable key ' +
        'into assets/js/supabase-config.js, then reload this page.');
    } else if (state === 'lib_missing') {
      setRow('client', 'bad', 'Failed',
        'The Supabase JS library did not load — the CDN is blocked or you are offline.');
    } else {
      setRow('client', 'bad', 'Failed',
        'supabase-client.js did not run — check the script order on this page.');
    }
    return false;
  }

  async function checkDatabase() {
    try {
      /* A tiny read (never a write). GET rather than HEAD so PostgREST
         error bodies stay parseable and RLS responses classify correctly. */
      var res = await window.ngdSupabase.from('profiles').select('id').limit(1);
      if (res.error) {
        if (res.error.code) {
          /* PostgREST answered with a structured error — the API is up.
             RLS/permission errors are EXPECTED before sign-in and must
             not read as a failed connection. */
          setRow('db', 'good', 'Reachable',
            'The database API answered. Row Level Security is protecting ' +
            'the table from anonymous reads — that is expected.');
        } else {
          setRow('db', 'bad', 'Failed',
            'Could not reach the project — check the Project URL and your connection.');
        }
        return;
      }
      setRow('db', 'good', 'Reachable',
        (res.data || []).length === 0
          ? 'The profiles table answered with no rows visible to this ' +
            'session — Row Level Security at work, exactly as intended.'
          : 'The profiles table answered.');
    } catch (err) {
      setRow('db', 'bad', 'Failed',
        'Could not reach the project — check the Project URL and your connection.');
    }
  }

  async function checkAuthAndSession() {
    try {
      var res = await window.ngdSupabase.auth.getSession();
      setRow('auth', 'good', 'Available',
        'The auth service is ready — login and signup connect in a later step.');
      var session = res && res.data ? res.data.session : null;
      if (session && session.user) {
        setRow('session', 'good', 'Signed in',
          'Active session for ' + (session.user.email || 'this account') +
          ' in this browser.');
      } else {
        setRow('session', 'dim', 'Signed out',
          'No active session in this browser — expected until login is connected.');
      }
    } catch (err) {
      setRow('auth', 'bad', 'Unavailable',
        'The auth service did not respond in this browser.');
      setRow('session', 'dim', 'Unknown', 'Cannot be read without the auth service.');
    }
  }

  /* ---------------- runner ---------------- */

  async function run() {
    window.ngdStatusDone = false;
    ['client', 'db', 'auth', 'session'].forEach(setPending);

    var clientOk = checkClient();
    if (!clientOk) {
      setRow('db', 'bad', 'Failed', 'Skipped — the client is not connected.');
      setRow('auth', 'bad', 'Unavailable', 'Skipped — the client is not connected.');
      setRow('session', 'dim', 'Unknown', 'Skipped — the client is not connected.');
      window.ngdStatusDone = true;
      return;
    }

    await Promise.all([checkDatabase(), checkAuthAndSession()]);
    window.ngdStatusDone = true;
  }

  window.ngdRunStatusChecks = run;

  function init() {
    var rerun = document.getElementById('sb-rerun');
    if (rerun) rerun.addEventListener('click', run);
    run();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
