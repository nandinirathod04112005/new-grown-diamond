/* Live inspection request modal shared by both product detail pages. */
(function () {
  'use strict';
  var button = document.getElementById('dd-inspect') || document.getElementById('jd-inspect');
  if (!button) return;
  var type = button.id === 'dd-inspect' ? 'diamond' : 'jewellery';
  var queryId = new URLSearchParams(location.search).get('id');

  function esc(value) { var e = document.createElement('div'); e.textContent = value || ''; return e.innerHTML; }
  function login() {
    sessionStorage.setItem('ngd_auth_notice', JSON.stringify({ message: 'Please sign in to request an inspection.', type: 'info' }));
    location.href = (window.NGD_SITE_ROOT || './') + 'login.html';
  }
  function summary() {
    if (type === 'diamond') return (document.getElementById('dd-title') || {}).textContent + ' · ' + (document.getElementById('dd-stock') || {}).textContent;
    return (document.getElementById('jd-name') || {}).textContent + ' · ' + (document.getElementById('jd-sku') || {}).textContent;
  }
  function makeModal() {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="modal fade" id="inspection-modal" tabindex="-1" aria-labelledby="inspection-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content ngd-form"><div class="modal-header"><div><span class="ngd-eyebrow">Private viewing</span><h2 class="modal-title ngd-title fs-4 mt-1" id="inspection-title">Request Inspection</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form id="inspection-form"><div class="modal-body"><div class="ngd-edu-note mb-3"><p class="mb-0"><strong>Product</strong><br>' + esc(summary()) + '</p></div><div class="mb-3"><label class="form-label" for="inspection-type">Inspection Type</label><select class="form-select" id="inspection-type" required><option>In-Person</option><option>Video Inspection</option><option>Detailed Quality Review</option></select></div><div class="mb-3"><label class="form-label" for="inspection-date">Preferred Date</label><input class="form-control" type="date" id="inspection-date"></div><div><label class="form-label" for="inspection-message">Optional Message</label><textarea class="form-control" id="inspection-message" rows="3" maxlength="1000"></textarea></div><div id="inspection-feedback" class="mt-3" role="status" aria-live="polite"></div></div><div class="modal-footer"><button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-bs-dismiss="modal">Cancel</button><button class="ngd-btn ngd-btn-dark" id="inspection-submit" type="submit">Submit Request</button></div></form></div></div></div>';
    document.body.appendChild(wrap.firstChild);
    document.getElementById('inspection-date').min = new Date().toISOString().slice(0, 10);
    document.getElementById('inspection-form').addEventListener('submit', submit);
    return bootstrap.Modal.getOrCreateInstance(document.getElementById('inspection-modal'));
  }
  async function productUuid() {
    var table = type === 'diamond' ? 'diamonds' : 'jewellery';
    var columns = type === 'diamond' ? ['stock_number', 'public_id'] : ['sku', 'public_id'];
    for (var i = 0; i < columns.length; i++) {
      var result = await window.ngdSupabase.from(table).select('id').eq(columns[i], queryId).maybeSingle();
      if (!result.error && result.data) return result.data.id;
    }
    return null;
  }
  function publicId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var bytes = crypto.getRandomValues(new Uint8Array(8));
    for (var i = 0; i < 8; i++) out += chars[bytes[i] % chars.length];
    return 'INS-' + out;
  }
  async function submit(event) {
    event.preventDefault();
    var submitButton = document.getElementById('inspection-submit');
    var feedback = document.getElementById('inspection-feedback');
    submitButton.disabled = true; feedback.innerHTML = '';
    var user = await window.NGDAuth.getCurrentUser();
    if (!user) return login();
    var productId = await productUuid();
    if (!productId) { feedback.innerHTML = '<div class="ngd-alert ngd-alert-danger">This product could not be found in the live catalogue.</div>'; submitButton.disabled = false; return; }
    var row = { public_id: publicId(), user_id: user.id, product_type: type, inspection_type: document.getElementById('inspection-type').value, preferred_date: document.getElementById('inspection-date').value || null, customer_message: document.getElementById('inspection-message').value.trim() || null };
    row[type + '_id'] = productId;
    var result = await window.ngdSupabase.from('inspections').insert(row).select('public_id').single();
    if (result.error) { feedback.innerHTML = '<div class="ngd-alert ngd-alert-danger">We could not submit your request. Please try again.</div>'; submitButton.disabled = false; return; }
    feedback.innerHTML = '<div class="ngd-alert ngd-alert-success">Request ' + esc(result.data.public_id) + ' submitted. You can track it in your account.</div>';
    submitButton.textContent = 'Submitted';
  }
  var modal;
  button.setAttribute('href', '#');
  button.addEventListener('click', async function (event) {
    event.preventDefault();
    var user = await window.NGDAuth.getCurrentUser();
    if (!user) return login();
    modal = modal || makeModal(); modal.show();
  });
})();
