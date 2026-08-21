/* NEW GROWN DIAMOND — Supabase Auth password-reset request */
(function () {
  'use strict';

  var SAFE_SUCCESS =
    'If this email is registered, a password reset link has been sent.';
  var SERVICE_ERROR =
    'We could not send a password reset link right now. Please try again later.';
  var RATE_LIMIT_MESSAGE =
    'Too many reset requests. Please wait a minute and try again.';

  function $(id) { return document.getElementById(id); }

  function isRateLimit(error) {
    return !!error && (error.status === 429 ||
      error.code === 'over_email_send_rate_limit' ||
      /rate ?limit/i.test(String(error.message || '')));
  }

  /* Cooldown keeps the button from being spammed into Supabase's
     email rate limit; counts down visibly, then re-enables. */
  var cooldownTimer = null;
  function startCooldown(seconds) {
    var button = $('forgot-submit');
    if (cooldownTimer) clearTimeout(cooldownTimer);
    var remaining = seconds;
    (function tick() {
      if (remaining <= 0) {
        cooldownTimer = null;
        button.disabled = false;
        button.textContent = 'Send Reset Link';
        return;
      }
      button.disabled = true;
      button.textContent = 'Wait ' + remaining + 's';
      remaining -= 1;
      cooldownTimer = setTimeout(tick, 1000);
    })();
  }

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
    var cooldownSeconds = 0;
    try {
      var redirectTo = (window.NGD_SITE_ROOT || new URL('./', location.href).href) +
        'reset-password.html';
      var result = await window.ngdSupabase.auth.resetPasswordForEmail(
        $('forgot-email').value.trim(),
        { redirectTo: redirectTo }
      );
      if (result.error) {
        if (isRateLimit(result.error)) {
          cooldownSeconds = 60;
          showAlert('warning', RATE_LIMIT_MESSAGE);
        } else {
          showAlert('danger', SERVICE_ERROR);
        }
        return;
      }
      /* A short cooldown after success stops repeat sends from ever
         reaching the server-side email rate limit. */
      cooldownSeconds = 30;
      showAlert('success', SAFE_SUCCESS);
      form.reset();
      form.classList.remove('was-validated');
    } catch (error) {
      if (isRateLimit(error)) {
        cooldownSeconds = 60;
        showAlert('warning', RATE_LIMIT_MESSAGE);
      } else {
        showAlert('danger', SERVICE_ERROR);
      }
    } finally {
      setLoading(false);
      if (cooldownSeconds) startCooldown(cooldownSeconds);
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
