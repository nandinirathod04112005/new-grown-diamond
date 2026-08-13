/* ============================================================
   NEW GROWN DIAMOND — LOGIN PAGE (Supabase Auth)
   ------------------------------------------------------------
   - Validates the form, then supabase.auth.signInWithPassword()
   - Reads role + account_status from public.profiles (RLS)
   - Redirects: admin → admin/dashboard.html,
                customer → account/dashboard.html
   - Already-signed-in visitors are forwarded to their dashboard
   ============================================================ */
(function () {
  'use strict';

  var GENERIC_ERROR = 'Sign in failed. Please try again later.';
  var NETWORK_ERROR =
    'Unable to reach the sign-in service. Please check your connection and try again.';
  var WRONG_CREDENTIALS = 'Incorrect email or password. Please try again.';
  var EMAIL_NOT_CONFIRMED =
    'Please verify your email address before signing in. Check your inbox for the confirmation link.';
  var RATE_LIMITED = 'Too many attempts. Please wait a moment and try again.';
  var SERVICE_DOWN =
    'The sign-in service is temporarily unavailable. Please try again shortly.';
  var NOT_CONFIGURED =
    'Supabase is not configured yet — add your project details in assets/js/supabase-config.js.';

  function $(id) {
    return document.getElementById(id);
  }

  function showAlert(type, message) {
    var box = $('login-alert');
    if (!box) return;
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
  }

  function clearAlert() {
    var box = $('login-alert');
    if (box) box.innerHTML = '';
  }

  function setLoading(loading) {
    var btn = $('login-submit');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
        '<span>Signing in…</span>';
    } else {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  /** Translate Supabase auth errors into safe, friendly messages. */
  function mapAuthError(error) {
    if (!error) return GENERIC_ERROR;
    console.error('[NGD Login] auth error:', error);

    var code = error.code || '';
    var msg = error.message || '';
    var status = typeof error.status === 'number' ? error.status : -1;

    if (
      error.name === 'AuthRetryableFetchError' ||
      status === 0 ||
      /failed to fetch|networkerror|load failed|fetch failed/i.test(msg)
    ) {
      return NETWORK_ERROR;
    }
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
      return WRONG_CREDENTIALS;
    }
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
      return EMAIL_NOT_CONFIRMED;
    }
    if (status === 429 || /rate limit/i.test(code + ' ' + msg)) {
      return RATE_LIMITED;
    }
    if (status >= 500) {
      return SERVICE_DOWN;
    }
    return GENERIC_ERROR;
  }

  /** After authentication: profile → status → role → redirect. */
  async function completeSignIn(user) {
    var auth = window.NGDAuth;
    var result = await auth.getCurrentProfile(user);

    if (result.error === 'missing_profile') {
      await window.ngdSupabase.auth.signOut();
      showAlert('danger', auth.messages.noProfile);
      return false;
    }
    if (result.error) {
      await window.ngdSupabase.auth.signOut();
      showAlert('warning', auth.messages.verifyFailed);
      return false;
    }
    if (auth.isBlockedStatus(result.profile)) {
      await window.ngdSupabase.auth.signOut();
      showAlert('danger', auth.messages.unavailable);
      return false;
    }

    window.location.replace(
      (window.NGD_SITE_ROOT || './') + auth.dashboardPath(result.profile)
    );
    return true;
  }

  /** Signed-in visitors don't belong on the login page. */
  async function redirectIfSignedIn() {
    if (!window.ngdSupabase) return;
    var auth = window.NGDAuth;
    var user = await auth.getCurrentUser();
    if (!user) return;

    var result = await auth.getCurrentProfile(user);
    if (result.error === 'missing_profile') {
      await window.ngdSupabase.auth.signOut();
      showAlert('danger', auth.messages.noProfile);
      return;
    }
    if (result.error) {
      /* Transient problem — let them sign in manually. */
      return;
    }
    if (auth.isBlockedStatus(result.profile)) {
      await window.ngdSupabase.auth.signOut();
      showAlert('danger', auth.messages.unavailable);
      return;
    }
    auth.goToDashboard(result.profile);
  }

  async function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    var form = $('ngd-login-form');
    clearAlert();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    form.classList.add('was-validated');

    if (!window.ngdSupabase) {
      showAlert(
        'warning',
        window.ngdSupabaseState === 'unconfigured' ? NOT_CONFIGURED : SERVICE_DOWN
      );
      return;
    }

    var email = $('login-email').value.trim();
    var password = $('login-password').value;

    setLoading(true);
    try {
      var res = await window.ngdSupabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (res.error) {
        showAlert('danger', mapAuthError(res.error));
        setLoading(false);
        return;
      }

      var redirected = await completeSignIn(res.data.user);
      if (!redirected) setLoading(false);
      /* On success we keep the button disabled while the browser
         navigates to the dashboard. */
    } catch (err) {
      console.error('[NGD Login] unexpected failure:', err);
      showAlert('danger', NETWORK_ERROR);
      setLoading(false);
    }
  }

  function init() {
    var form = $('ngd-login-form');
    if (!form) return;
    form.addEventListener('submit', onSubmit);

    /* One-shot notice from logout / guard redirects */
    var notice = window.NGDAuth && window.NGDAuth.consumeNotice();
    if (notice && notice.message) {
      showAlert(notice.type || 'info', notice.message);
    }

    redirectIfSignedIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
