/* ============================================================
   NEW GROWN DIAMOND — FORGOT PASSWORD (UI ONLY, STEP 19)
   ------------------------------------------------------------
   No reset service is connected yet, and this page is honest
   about that: a valid submit explains that NO email was sent.
   Nothing is simulated and nothing is stored.

   FUTURE SUPABASE INTEGRATION (one seam)
   --------------------------------------
   Replace the body of requestReset() with:

     var res = await window.ngdSupabase.auth.resetPasswordForEmail(
       email, { redirectTo: <your reset-completion page> });

   …then add the standard auth script stack (supabase CDN, config,
   client, auth-guard.js) to forgot-password.html — exactly as on
   login.html. The form IDs (ngd-forgot-form / forgot-email /
   forgot-submit / forgot-alert) are final.
   ============================================================ */
(function () {
  'use strict';

  var NOT_CONNECTED_MSG =
    'Password reset emails aren’t connected yet — no email has been ' +
    'sent and nothing was stored. This page is ready for the reset ' +
    'service that arrives with an upcoming release; until then, reach ' +
    'us through the contact page and we will verify you personally.';

  function $(id) {
    return document.getElementById(id);
  }

  function showAlert(type, message) {
    var box = $('forgot-alert');
    if (!box) return;
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
  }

  function clearAlert() {
    var box = $('forgot-alert');
    if (box) box.innerHTML = '';
  }

  /**
   * The single future-backend seam. Today it can only say, honestly,
   * that no reset service exists yet. The Supabase phase replaces this
   * with resetPasswordForEmail() — nothing else on the page changes.
   */
  function requestReset(email) {
    void email; /* unused until the reset service is connected */
    showAlert('info', NOT_CONNECTED_MSG);
  }

  function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    var form = $('ngd-forgot-form');
    clearAlert();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    form.classList.add('was-validated');

    requestReset($('forgot-email').value.trim());
  }

  function init() {
    var form = $('ngd-forgot-form');
    if (!form) return;
    form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
