/* NEW GROWN DIAMOND — Supabase Auth recovery completion */
(function () {
  'use strict';
  var recoverySession = false;
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
  function showForm() {
    recoverySession = true;
    $('reset-checking').hidden = true;
    $('reset-invalid').hidden = true;
    $('ngd-reset-form').hidden = false;
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
    submitted = true;
    var button = $('reset-submit');
    button.disabled = true;
    button.textContent = 'Updating…';
    try {
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

    var settled = false;
    var listener = window.ngdSupabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY' && session) {
        settled = true;
        showForm();
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
