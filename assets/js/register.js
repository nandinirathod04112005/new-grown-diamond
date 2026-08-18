/* ============================================================
   NEW GROWN DIAMOND — CUSTOMER / ADMIN SIGNUP (Supabase Auth)
   ------------------------------------------------------------
   - Validates the form, then supabase.auth.signUp()
   - Sends ONLY safe metadata: full_name, company_name, phone,
     country. The role is NEVER sent from the browser — the
     database trigger creates the profiles row with role = 'customer'.
   - Email confirmation ON  → success message, stay on page
   - Email confirmation OFF → session returned → customer dashboard
   ============================================================ */
(function () {
  'use strict';

  var GENERIC_ERROR = 'Sign up failed. Please try again later.';
  var NETWORK_ERROR =
    'Unable to reach the sign-up service. Please check your connection and try again.';
  var ALREADY_REGISTERED =
    'An account with this email already exists. Please sign in instead.';
  var WEAK_PASSWORD =
    'Please choose a stronger password (at least 8 characters).';
  var RATE_LIMITED = 'Too many attempts. Please wait a moment and try again.';
  var SERVICE_DOWN =
    'The sign-up service is temporarily unavailable. Please try again shortly.';
  var NOT_CONFIGURED =
    'Supabase is not configured yet — add your project details in assets/js/supabase-config.js.';
  var CONFIRM_EMAIL_MSG =
    'Account created. Please check your email to verify your account.';
  var INVALID_ADMIN_CODE = 'Invalid Admin Code.';

  function $(id) {
    return document.getElementById(id);
  }

  function showAlert(type, message) {
    var box = $('register-alert');
    if (!box) return;
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearAlert() {
    var box = $('register-alert');
    if (box) box.innerHTML = '';
  }

  function setLoading(loading) {
    var btn = $('register-submit');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
        '<span>Creating account…</span>';
    } else {
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  }

  function mapSignupError(error) {
    if (!error) return GENERIC_ERROR;
    console.error('[NGD Signup] auth error:', error);

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
    if (code === 'user_already_exists' || /already registered/i.test(msg)) {
      return ALREADY_REGISTERED;
    }
    if (code === 'weak_password' || /password/i.test(msg) && status === 422) {
      return WEAK_PASSWORD;
    }
    if (status === 429 || /rate limit/i.test(code + ' ' + msg)) {
      return RATE_LIMITED;
    }
    if (status >= 500) {
      return SERVICE_DOWN;
    }
    return GENERIC_ERROR;
  }

  /** Rough strength hint (UI only — minlength 8 is the real gate).
      0 empty · 1 weak · 2 fair · 3 good · 4 strong */
  function scorePassword(value) {
    if (!value) return 0;
    if (value.length < 8) return 1;
    var score = 2;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(4, score);
  }

  var STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  function updateStrength() {
    var meter = $('reg-strength');
    var password = $('reg-password');
    if (!meter || !password) return;
    var level = scorePassword(password.value);
    meter.setAttribute('data-level', String(level));
    meter.querySelector('.ngd-strength-label').textContent = STRENGTH_LABELS[level];
  }

  /** Show/hide toggles — one per password field, wired by aria-controls. */
  function initPasswordToggles() {
    var toggles = document.querySelectorAll('.ngd-pass-toggle');
    Array.prototype.forEach.call(toggles, function (toggle) {
      var field = $(toggle.getAttribute('aria-controls'));
      if (!field) return;
      toggle.addEventListener('click', function () {
        var show = field.type === 'password';
        field.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        field.focus({ preventScroll: true });
      });
    });
  }

  /** Keep the confirm-password field's validity in sync. */
  function syncConfirmValidity() {
    var password = $('reg-password');
    var confirm = $('reg-confirm');
    if (!password || !confirm) return;
    confirm.setCustomValidity(
      password.value === confirm.value ? '' : 'Passwords do not match.'
    );
  }

  function isAdminSignup() {
    return $('reg-account-type') && $('reg-account-type').value === 'admin';
  }

  function syncAccountType() {
    var group = $('reg-admin-code-group');
    var field = $('reg-admin-code');
    if (!group || !field) return;
    var admin = isAdminSignup();
    group.classList.toggle('d-none', !admin);
    field.disabled = !admin;
    field.required = admin;
    if (!admin) field.value = '';
  }

  async function registerAdmin(email, password, metadata) {
    var result = await window.ngdSupabase.functions.invoke('register-admin', {
      body: {
        email: email,
        password: password,
        full_name: metadata.full_name,
        company_name: metadata.company_name,
        phone: metadata.phone,
        country: metadata.country,
        admin_code: $('reg-admin-code').value
      }
    });

    if (result.error) {
      var context = result.error.context;
      var payload = context && typeof context.json === 'function'
        ? await context.json().catch(function () { return null; })
        : null;
      var code = payload && payload.code;
      if (code === 'invalid_admin_code') throw { adminCodeInvalid: true };
      if (code === 'rate_limited') throw { rateLimited: true };
      if (code === 'already_registered') throw { alreadyRegistered: true };
      throw result.error;
    }

    var login = await window.ngdSupabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (login.error) throw login.error;
    window.location.replace((window.NGD_SITE_ROOT || './') + 'admin/dashboard.html');
  }

  async function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    var form = $('ngd-register-form');
    clearAlert();
    syncConfirmValidity();

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

    var email = $('reg-email').value.trim();
    var password = $('reg-password').value;

    /* ONLY safe metadata. Never send a role from the browser — the
       database trigger assigns role = 'customer' on its own. */
    var metadata = {
      full_name: $('reg-full-name').value.trim(),
      company_name: $('reg-company').value.trim() || null,
      phone: $('reg-phone').value.trim(),
      country: $('reg-country').value
    };

    setLoading(true);
    try {
      if (isAdminSignup()) {
        await registerAdmin(email, password, metadata);
        return;
      }

      var res = await window.ngdSupabase.auth.signUp({
        email: email,
        password: password,
        options: { data: metadata }
      });

      if (res.error) {
        showAlert('danger', mapSignupError(res.error));
        setLoading(false);
        return;
      }

      var user = res.data && res.data.user;
      var session = res.data && res.data.session;

      if (session) {
        /* Email confirmation is disabled — we are signed in.
           Load the fresh customer profile (best effort), then go
           to the customer dashboard; its guard re-checks everything. */
        try {
          await window.NGDAuth.getCurrentProfile(user);
        } catch (err) {
          console.warn('[NGD Signup] profile not readable yet:', err);
        }
        window.location.replace(
          (window.NGD_SITE_ROOT || './') + 'account/dashboard.html'
        );
        return;
      }

      /* Supabase obfuscates existing accounts: a "user" with an
         empty identities array means the email is already in use. */
      if (user && Array.isArray(user.identities) && user.identities.length === 0) {
        showAlert('info', ALREADY_REGISTERED);
        setLoading(false);
        return;
      }

      /* Email confirmation required */
      showAlert('success', CONFIRM_EMAIL_MSG);
      form.reset();
      form.classList.remove('was-validated');
      setLoading(false);
    } catch (err) {
      console.error('[NGD Signup] unexpected failure:', err);
      if (err && err.adminCodeInvalid) showAlert('danger', INVALID_ADMIN_CODE);
      else if (err && err.rateLimited) showAlert('danger', RATE_LIMITED);
      else if (err && err.alreadyRegistered) showAlert('info', ALREADY_REGISTERED);
      else showAlert('danger', mapSignupError(err));
      setLoading(false);
    }
  }

  /** Signed-in visitors don't belong on the signup page either. */
  async function redirectIfSignedIn() {
    if (!window.ngdSupabase || !window.NGDAuth) return;
    var auth = window.NGDAuth;
    var user = await auth.getCurrentUser();
    if (!user) return;
    var result = await auth.getCurrentProfile(user);
    if (result.error || auth.isBlockedStatus(result.profile)) return;
    auth.goToDashboard(result.profile);
  }

  function init() {
    var form = $('ngd-register-form');
    if (!form) return;
    form.addEventListener('submit', onSubmit);

    var accountType = $('reg-account-type');
    if (accountType) accountType.addEventListener('change', syncAccountType);
    syncAccountType();

    var confirm = $('reg-confirm');
    var password = $('reg-password');
    if (confirm && password) {
      confirm.addEventListener('input', syncConfirmValidity);
      password.addEventListener('input', syncConfirmValidity);
      password.addEventListener('input', updateStrength);
    }
    initPasswordToggles();
    updateStrength();

    redirectIfSignedIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
