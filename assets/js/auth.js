/* ============================================================
   NEW GROWN DIAMOND — AUTH & SESSION HELPERS (Supabase Auth)
   ------------------------------------------------------------
   Reusable, promise-based helpers exposed as window.NGDAuth:

     getCurrentUser()      → user object | null
     getCurrentProfile()   → { profile, error } from public.profiles
     requireAuth()         → user | null (redirects to login)
     requireAdmin()        → { user, profile } | null (admin+active only)
     requireCustomer()     → { user, profile } | null (customer+active)
     logout()              → signs out, then redirects to login.html

   Security model
   --------------
   - The role is ALWAYS read from public.profiles (protected by RLS),
     never from localStorage, never from a form field.
   - These guards are navigation conveniences; Row Level Security in
     the database remains the real enforcement layer.
   - Protected pages ship with <body style="visibility:hidden"> and
     are revealed only after their guard passes (fail closed).
   ============================================================ */
(function () {
  'use strict';

  var NOTICE_KEY = 'ngd_auth_notice';
  var MSG_UNAVAILABLE =
    'Your account is currently unavailable. Please contact support.';
  var MSG_NO_PROFILE =
    'We could not load your account details. Please contact support.';
  var MSG_VERIFY_FAILED =
    'We could not verify your account right now. Please sign in again.';
  var MSG_BAD_ROLE =
    'Your account role is not recognised. Please contact support.';
  var KNOWN_ROLES = ['admin', 'customer'];

  /* True once a guard runs on this page — lets the auth-state
     listener know a sign-out must bounce the visitor to login. */
  var guardActive = false;
  /* True while we are already navigating — prevents duplicate
     redirects (e.g. logout click + SIGNED_OUT event). */
  var redirecting = false;

  function client() {
    return window.ngdSupabase || null;
  }

  function siteUrl(relativePath) {
    return (window.NGD_SITE_ROOT || './') + relativePath;
  }

  function go(relativePath) {
    if (redirecting) return;
    redirecting = true;
    window.location.replace(siteUrl(relativePath));
  }

  function revealPage() {
    document.body.style.visibility = 'visible';
  }

  /* ---------- one-shot notices shown on the login page ---------- */
  function setNotice(message, type) {
    try {
      sessionStorage.setItem(
        NOTICE_KEY,
        JSON.stringify({ message: message, type: type || 'info' })
      );
    } catch (_e) {
      /* storage unavailable — the redirect still happens */
    }
  }

  function consumeNotice() {
    try {
      var raw = sessionStorage.getItem(NOTICE_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(NOTICE_KEY);
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  /* ---------- session & profile ---------- */

  /** Current authenticated user from the Supabase session, or null. */
  async function getCurrentUser() {
    var sb = client();
    if (!sb) return null;
    try {
      var res = await sb.auth.getSession();
      return (res.data && res.data.session && res.data.session.user) || null;
    } catch (err) {
      console.error('[NGD Auth] getSession failed:', err);
      return null;
    }
  }

  /**
   * Load the signed-in user's row from public.profiles.
   * Resolves to { profile, error } where error is one of
   * null | 'no_session' | 'missing_profile' | 'profile_unavailable'.
   */
  async function getCurrentProfile(knownUser) {
    var sb = client();
    if (!sb) return { profile: null, error: 'profile_unavailable' };

    var user = knownUser || (await getCurrentUser());
    if (!user) return { profile: null, error: 'no_session' };

    try {
      var res = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (res.error) {
        if (res.error.code === 'PGRST116') {
          return { profile: null, error: 'missing_profile' };
        }
        console.error('[NGD Auth] profiles query failed:', res.error);
        return { profile: null, error: 'profile_unavailable' };
      }
      if (!res.data) {
        return { profile: null, error: 'missing_profile' };
      }
      return { profile: res.data, error: null };
    } catch (err) {
      console.error('[NGD Auth] profiles query threw:', err);
      return { profile: null, error: 'profile_unavailable' };
    }
  }

  function isBlockedStatus(profile) {
    var status = String((profile && profile.account_status) || '')
      .trim()
      .toLowerCase();
    /* Fail closed: only the explicit active state may enter a protected
       customer or admin area. This also covers future/pending statuses. */
    return status !== 'active';
  }

  function dashboardPath(profile) {
    return profile && profile.role === 'admin'
      ? 'admin/dashboard.html'
      : 'account/dashboard.html';
  }

  /** Send a signed-in user to the dashboard that matches their role. */
  function goToDashboard(profile) {
    go(dashboardPath(profile));
  }

  /* ---------- sign out ---------- */

  async function signOutQuietly() {
    var sb = client();
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (err) {
      console.error('[NGD Auth] signOut failed:', err);
    }
  }

  /** Sign out and return to the login page (used by logout buttons). */
  async function logout() {
    redirecting = true; // suppress the SIGNED_OUT listener redirect
    await signOutQuietly();
    setNotice('You have signed out.', 'success');
    window.location.replace(siteUrl('login.html'));
  }

  async function rejectToLogin(message, type) {
    redirecting = true;
    await signOutQuietly();
    setNotice(message, type || 'danger');
    window.location.replace(siteUrl('login.html'));
  }

  /* ---------- page guards ---------- */

  /**
   * Require any authenticated user. Redirects to login.html when
   * there is no session. Returns the user, or null after redirect.
   */
  async function requireAuth() {
    guardActive = true;

    if (!client()) {
      if (window.ngdSupabaseState === 'unconfigured') {
        /* Development state: reveal the page so the config banner
           (injected by supabase-client.js) is visible. */
        revealPage();
      } else {
        /* Library failed to load — fail closed, back to login. */
        go('login.html');
      }
      return null;
    }

    var user = await getCurrentUser();
    if (!user) {
      go('login.html');
      return null;
    }
    return user;
  }

  /**
   * Shared role guard. Confirms: authenticated + profile exists +
   * account_status not blocked + role matches. Wrong-role visitors
   * are sent to their own dashboard, everything else to login.
   */
  async function requireRole(role) {
    var user = await requireAuth();
    if (!user) return null;

    var result = await getCurrentProfile(user);

    if (result.error === 'missing_profile') {
      await rejectToLogin(MSG_NO_PROFILE);
      return null;
    }
    if (result.error) {
      await rejectToLogin(MSG_VERIFY_FAILED, 'warning');
      return null;
    }
    if (isBlockedStatus(result.profile)) {
      await rejectToLogin(MSG_UNAVAILABLE);
      return null;
    }
    if (result.profile.role !== role) {
      if (KNOWN_ROLES.indexOf(result.profile.role) === -1) {
        /* Unrecognised role — never bounce between dashboards. */
        await rejectToLogin(MSG_BAD_ROLE);
        return null;
      }
      goToDashboard(result.profile);
      return null;
    }

    fillProfileFields(user, result.profile);
    revealPage();
    return { user: user, profile: result.profile };
  }

  function requireAdmin() {
    return requireRole('admin');
  }

  function requireCustomer() {
    return requireRole('customer');
  }

  /* ---------- real identity into the page chrome ---------- */

  /**
   * Fill every [data-ngd-field] element with the signed-in account's
   * real data (never demo values). Runs automatically after a guard
   * passes; page controllers may overwrite with richer formatting.
   */
  function fillProfileFields(user, profile) {
    var fullName = String((profile && profile.full_name) || '').trim();
    var values = {
      full_name: fullName || '—',
      first_name: fullName ? fullName.split(/\s+/)[0] : 'there',
      email: (user && user.email) || (profile && profile.email) || '—',
      role: (profile && profile.role) || '—',
      account_status: (profile && profile.account_status) || '—'
    };
    Object.keys(values).forEach(function (field) {
      document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) {
        el.textContent = values[field];
      });
    });
  }

  /* ---------- auth state changes (expiry, other-tab logout) ---------- */

  function initAuthListener() {
    var sb = client();
    if (!sb) return;
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && guardActive && !redirecting) {
        /* Session ended (expired or signed out elsewhere) while on a
           protected page — leave immediately. */
        redirecting = true;
        setNotice('Your session has ended. Please sign in again.', 'info');
        window.location.replace(siteUrl('login.html'));
      }
    });
  }

  /* ---------- logout buttons ---------- */

  function wireLogoutButtons() {
    document.querySelectorAll('[data-ngd-logout]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        btn.setAttribute('disabled', 'disabled');
        logout();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireLogoutButtons);
  } else {
    wireLogoutButtons();
  }

  initAuthListener();

  /* ---------- public API ---------- */
  window.NGDAuth = {
    getCurrentUser: getCurrentUser,
    getCurrentProfile: getCurrentProfile,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    requireCustomer: requireCustomer,
    logout: logout,
    fillProfileFields: fillProfileFields,
    goToDashboard: goToDashboard,
    dashboardPath: dashboardPath,
    isBlockedStatus: isBlockedStatus,
    consumeNotice: consumeNotice,
    setNotice: setNotice,
    revealPage: revealPage,
    messages: {
      unavailable: MSG_UNAVAILABLE,
      noProfile: MSG_NO_PROFILE,
      verifyFailed: MSG_VERIFY_FAILED
    }
  };
})();
