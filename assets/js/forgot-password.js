/* NEW GROWN DIAMOND — Supabase Auth password-reset request */
(function () {
  'use strict';

  var SAFE_SUCCESS =
    'If this email is registered, a password reset link has been sent.';
  var SERVICE_ERROR =
    'We could not send a password reset link right now. Please try again later.';

  function $(id) { return document.getElementById(id); }

  function showAlert(type, message) {
    var box = $('forgot-alert');
    if (!box) return;
    box.innerHTML = '';
    var alert = document.createElement('div');
    alert.className = 'ngd-alert ngd-alert-' + type;
    alert.setAttribute('role', 'alert');
    alert.textContent = message;
    box.appendChild(alert);
  }

  function setLoading(loading) {
    var button = $('forgot-submit');
    button.disabled = loading;
    button.textContent = loading ? 'Sending…' : 'Send Reset Link';
  }

  async function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    var form = $('ngd-forgot-form');
    $('forgot-alert').innerHTML = '';
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    form.classList.add('was-validated');

    if (!window.ngdSupabase) {
      showAlert('danger', SERVICE_ERROR);
      return;
    }

    setLoading(true);
    try {
      var redirectTo = (window.NGD_SITE_ROOT || new URL('./', location.href).href) +
        'reset-password.html';
      var result = await window.ngdSupabase.auth.resetPasswordForEmail(
        $('forgot-email').value.trim(),
        { redirectTo: redirectTo }
      );
      if (result.error) {
        showAlert('danger', SERVICE_ERROR);
        return;
      }
      showAlert('success', SAFE_SUCCESS);
      form.reset();
      form.classList.remove('was-validated');
    } catch (_error) {
      showAlert('danger', SERVICE_ERROR);
    } finally {
      setLoading(false);
    }
  }

  function init() {
    var form = $('ngd-forgot-form');
    if (form) form.addEventListener('submit', onSubmit);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
