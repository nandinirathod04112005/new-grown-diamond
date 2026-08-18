/* Product-detail hold request modal backed by public.holds. */
(function () {
  'use strict';

  var trigger = document.querySelector('[data-request-hold]');
  if (!trigger) return;

  var type = trigger.getAttribute('data-product-type');
  var id = new URLSearchParams(window.location.search).get('id');
  var summarySelector = type === 'diamond' ? '#dd-title' : '#jd-name';
  var referenceSelector = type === 'diamond' ? '#dd-stock' : '#jd-sku';

  function escapeHtml(value) {
    var span = document.createElement('span');
    span.textContent = value || '';
    return span.innerHTML;
  }

  function publicId() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return 'HLD-' + Array.from(bytes, function (b) {
      return alphabet[b % alphabet.length];
    }).join('');
  }

  function login() {
    try { sessionStorage.setItem('ngd_return_to', window.location.href); } catch (_e) {}
    window.location.assign('login.html');
  }

  function ensureModal() {
    var existing = document.getElementById('hold-request-modal');
    if (existing) return existing;
    var summary = document.querySelector(summarySelector);
    var reference = document.querySelector(referenceSelector);
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="modal fade" id="hold-request-modal" tabindex="-1" aria-labelledby="hold-modal-title" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content ngd-card">' +
      '<div class="modal-header"><div><span class="ngd-eyebrow">Customer hold</span>' +
      '<h2 class="modal-title fs-5 mt-1" id="hold-modal-title">Request a hold</h2></div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<form id="hold-request-form"><div class="modal-body ngd-form">' +
      '<div class="ngd-dash-panel mb-3"><strong>' + escapeHtml(summary && summary.textContent) + '</strong>' +
      '<span class="d-block ngd-text-muted small mt-1">' + escapeHtml(reference && reference.textContent) +
      ' · ' + (type === 'diamond' ? 'Diamond' : 'Jewellery') + '</span></div>' +
      '<label class="form-label" for="hold-message">Message <span class="ngd-text-muted">(optional)</span></label>' +
      '<textarea class="form-control" id="hold-message" maxlength="1000" rows="4" placeholder="Anything our team should know?"></textarea>' +
      '<div id="hold-feedback" class="small mt-3" role="alert" aria-live="polite"></div></div>' +
      '<div class="modal-footer"><button type="button" class="ngd-btn ngd-btn-outline" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="ngd-btn ngd-btn-gold" id="hold-submit">Request Hold</button></div>' +
      '</form></div></div></div>';
    document.body.appendChild(wrapper.firstElementChild);
    return document.getElementById('hold-request-modal');
  }

  trigger.addEventListener('click', async function () {
    if (!window.NGDAuth || !window.ngdSupabase) return login();
    var user = await window.NGDAuth.getCurrentUser();
    if (!user) return login();
    if (!id) return;
    bootstrap.Modal.getOrCreateInstance(ensureModal()).show();
  });

  document.addEventListener('submit', async function (event) {
    if (event.target.id !== 'hold-request-form') return;
    event.preventDefault();
    var user = await window.NGDAuth.getCurrentUser();
    if (!user) return login();
    var submit = document.getElementById('hold-submit');
    var feedback = document.getElementById('hold-feedback');
    submit.disabled = true;
    feedback.className = 'small mt-3 ngd-text-muted';
    feedback.textContent = 'Sending your request…';
    var row = {
      public_id: publicId(),
      user_id: user.id,
      product_type: type,
      customer_message: document.getElementById('hold-message').value.trim() || null
    };
    row[type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = id;
    var result = await window.ngdSupabase.from('holds').insert(row).select('public_id').single();
    if (result.error) {
      console.error('[NGD Holds] request failed:', result.error);
      feedback.className = 'small mt-3 text-danger';
      feedback.textContent = 'We could not request this hold. Please try again.';
      submit.disabled = false;
      return;
    }
    feedback.className = 'small mt-3 text-success';
    feedback.textContent = 'Hold request ' + result.data.public_id + ' was submitted.';
    submit.textContent = 'Requested';
    setTimeout(function () { window.location.assign('account/holds.html'); }, 900);
  });
})();
