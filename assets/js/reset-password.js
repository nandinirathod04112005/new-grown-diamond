/* NEW GROWN DIAMOND — Supabase Auth recovery completion */
(function () {
  'use strict';
  var recoverySession = false;
  var recoveryUserId = '';
  var submitted = false;
  function $(id) { return document.getElementById(id); }

  function showAlert(type, message) {
    $('reset-alert').innerHTML = '';
    var alert = document.createElement('div');
    alert.className = 'ngd-alert ngd-alert-' + type;
    alert.setAttribute('role', 'alert');
    alert.textContent = message;
    $('reset-alert').appendChild(alert);
  }
  function showInvalid() {
    $('reset-checking').hidden = true;
    $('ngd-reset-form').hidden = true;
    $('reset-invalid').hidden = false;
  }
  function sessionIsUsable(session) {
    if (!session || !session.user || !session.user.id || !session.access_token) return false;
    /* Supabase timestamps are seconds since epoch. Leave a small margin so a
       token that expires during the update cannot enable the form. */
    return !session.expires_at || session.expires_at > Math.floor(Date.now() / 1000) + 5;
  }
  function showForm(session) {
    if (!sessionIsUsable(session)) { showInvalid(); return; }
    recoverySession = true;
    recoveryUserId = session.user.id;
    $('reset-checking').hidden = true;
    $('reset-invalid').hidden = true;
    $('ngd-reset-form').hidden = false;
  }

  /*
   * Email security scanners sometimes pre-open Supabase's one-time recovery
   * URL, consuming it before the customer clicks it. The recovery email can
   * therefore point to:
   *
   *   {{ .RedirectTo }}#{{ .ConfirmationURL }}
   *
   * The fragment is never sent to our web server or to link scanners. This
   * page validates that the hidden URL belongs to THIS Supabase project and
   * only follows it after a real user presses Continue.
   */
  function pendingRecoveryConfirmationUrl() {
    var raw = location.hash ? location.hash.slice(1) : '';
    if (!raw || raw.indexOf('https://') !== 0) return '';

    try {
      var confirmation = new URL(raw);
      var project = new URL(window.NGD_SUPABASE_CONFIG && window.NGD_SUPABASE_CONFIG.SUPABASE_URL || '');
      if (!project.origin || confirmation.origin !== project.origin) return '';
      if (confirmation.pathname !== '/auth/v1/verify') return '';
      if (confirmation.searchParams.get('type') !== 'recovery') return '';
      if (!confirmation.searchParams.get('token')) return '';
      return confirmation.href;
    } catch (_error) {
      return '';
    }
  }

  function showRecoveryContinue(confirmationUrl) {
    $('reset-checking').hidden = true;
    $('ngd-reset-form').hidden = true;
    $('reset-invalid').hidden = true;
    $('reset-alert').innerHTML = '';

    var alert = document.createElement('div');
    alert.className = 'ngd-alert ngd-alert-success';
    alert.setAttribute('role', 'status');
    alert.textContent = 'Your reset request is ready. Continue to verify it securely.';
    $('reset-alert').appendChild(alert);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ngd-btn ngd-btn-gold ngd-btn-block mt-4';
    button.textContent = 'Continue to Reset Password';
    button.addEventListener('click', function () {
      button.disabled = true;
      button.textContent = 'Verifying…';
      /* Remove the hidden one-time URL from browser history before following it. */
      history.replaceState(null, '', location.pathname + location.search);
      location.assign(confirmationUrl);
    });
    $('reset-alert').appendChild(button);
  }

  function score(value) {
    if (!value) return 0;
    if (value.length < 8) return 1;
    var result = 2;
    if (value.length >= 12) result++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)) result++;
    return Math.min(4, result);
  }
  function syncFields() {
    var password = $('reset-password');
    var confirm = $('reset-confirm');
    confirm.setCustomValidity(password.value === confirm.value ? '' : 'Passwords do not match.');
    var level = score(password.value);
    $('reset-strength').dataset.level = String(level);
    $('reset-strength').querySelector('.ngd-strength-label').textContent = ['', 'Weak', 'Fair', 'Good', 'Strong'][level];
  }
  function bindToggles() {
    document.querySelectorAll('.ngd-pass-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var field = $(toggle.getAttribute('aria-controls'));
        var visible = field.type === 'password';
        field.type = visible ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
        toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
      });
    });
  }
  async function submit(event) {
    event.preventDefault();
    syncFields();
    var form = $('ngd-reset-form');
    if (!recoverySession) { showInvalid(); return; }
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    var button = $('reset-submit');
    button.disabled = true;
    button.textContent = 'Updating…';
    try {
      /* Re-read the SDK-managed session immediately before changing the
         password. The PASSWORD_RECOVERY event is still required, so an
         unrelated signed-in session can never unlock this page. */
      var current = await window.ngdSupabase.auth.getSession();
      var session = current.data && current.data.session;
      if (current.error || !sessionIsUsable(session) || session.user.id !== recoveryUserId) {
        recoverySession = false;
        showInvalid();
        return;
      }
      submitted = true;
      var result = await window.ngdSupabase.auth.updateUser({ password: $('reset-password').value });
      if (result.error) {
        recoverySession = false;
        showInvalid();
        return;
      }
      /* Clear fields before awaiting sign-out; passwords are never persisted. */
      form.reset();
      showAlert('success', 'Your password has been updated. Redirecting to sign in…');
      form.hidden = true;
      await window.ngdSupabase.auth.signOut();
      setTimeout(function () {
        location.replace((window.NGD_SITE_ROOT || './') + 'login.html');
      }, 900);
    } catch (_error) {
      submitted = false;
      button.disabled = false;
      button.textContent = 'Update Password';
      showAlert('danger', 'We could not update your password. Please request a new reset link.');
    }
  }
  function init() {
    bindToggles();
    $('reset-password').addEventListener('input', syncFields);
    $('reset-confirm').addEventListener('input', syncFields);
    $('ngd-reset-form').addEventListener('submit', submit);
    if (!window.ngdSupabase) { showInvalid(); return; }

    var protectedConfirmationUrl = pendingRecoveryConfirmationUrl();
    if (protectedConfirmationUrl) {
      showRecoveryContinue(protectedConfirmationUrl);
      return;
    }

    var settled = false;
    var listener = window.ngdSupabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY' && session) {
        settled = true;
        showForm(session);
      } else if (event === 'SIGNED_OUT' && !submitted && !recoverySession) {
        showInvalid();
      }
    });
    /* PASSWORD_RECOVERY is emitted only after Supabase has verified/exchanged
       the recovery link. A normal existing login session is never sufficient. */
    setTimeout(function () {
      if (!settled && !recoverySession) {
        showInvalid();
        if (listener.data && listener.data.subscription) listener.data.subscription.unsubscribe();
      }
    }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
