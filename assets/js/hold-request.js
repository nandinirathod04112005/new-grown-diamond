(function () {
  'use strict';
  function esc(value) { var n = document.createElement('span'); n.textContent = value == null ? '' : String(value); return n.innerHTML; }
  function publicId() {
    var bytes = new Uint8Array(4); crypto.getRandomValues(bytes);
    return 'HLD-' + Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  async function findProduct(type, reference) {
    var table = type === 'diamond' ? 'diamonds' : 'jewellery';
    var columns = type === 'diamond' ? ['id', 'stock_number', 'public_id'] : ['id', 'sku', 'public_id'];
    for (var i = 0; i < columns.length; i++) {
      var result = await window.ngdSupabase.from(table).select('*').eq(columns[i], reference).maybeSingle();
      if (!result.error && result.data) return result.data;
    }
    return null;
  }
  function ensureModal() {
    var existing = document.getElementById('holdRequestModal'); if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="modal fade ngd-modal" id="holdRequestModal" tabindex="-1" aria-labelledby="holdRequestTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><div><span class="ngd-eyebrow">Customer hold</span><h2 class="modal-title ngd-title fs-4 mt-1" id="holdRequestTitle">Request Hold</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form id="hold-request-form"><div class="modal-body ngd-form"><div class="ngd-dash-panel mb-3" id="hold-product-summary"></div><label class="form-label" for="hold-message">Message <span class="ngd-text-muted">(optional)</span></label><textarea class="form-control" id="hold-message" rows="4" maxlength="2000" placeholder="Tell us anything that may help with your hold."></textarea><div id="hold-form-alert" class="mt-3" aria-live="polite"></div></div><div class="modal-footer"><button type="button" class="ngd-btn ngd-btn-outline" data-bs-dismiss="modal">Cancel</button><button type="submit" class="ngd-btn ngd-btn-gold" id="hold-submit">Request Hold</button></div></form></div></div></div>';
    document.body.appendChild(wrap.firstChild); return document.getElementById('holdRequestModal');
  }
  window.NGDHoldRequest = function (options) {
    var modalEl = ensureModal(), modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    var form = document.getElementById('hold-request-form'), alert = document.getElementById('hold-form-alert');
    document.getElementById('hold-product-summary').innerHTML = '<strong>' + esc(options.title) + '</strong><span class="d-block small ngd-text-muted">' + esc(options.reference) + ' · ' + (options.type === 'diamond' ? 'Diamond' : 'Jewellery') + '</span>';
    document.getElementById('hold-message').value = ''; alert.innerHTML = '';
    var button = document.getElementById('hold-submit'); button.disabled = false; button.textContent = 'Request Hold';
    form.onsubmit = async function (event) {
      event.preventDefault(); button.disabled = true;
      var user = await window.NGDAuth.getCurrentUser();
      if (!user) { window.location.href = window.NGD_SITE_ROOT + 'login.html'; return; }
      var product = await findProduct(options.type, options.reference);
      if (!product) { alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">This product could not be found in the live inventory.</div>'; button.disabled = false; return; }
      var payload = { public_id: publicId(), user_id: user.id, product_type: options.type, customer_message: document.getElementById('hold-message').value.trim() || null };
      payload[options.type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = product.id;
      var result = await window.ngdSupabase.from('holds').insert(payload).select('public_id').single();
      if (result.error) { alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">We could not submit your hold request. Please try again.</div>'; button.disabled = false; return; }
      alert.innerHTML = '<div class="ngd-alert ngd-alert-success">Hold request ' + esc(result.data.public_id) + ' submitted.</div>'; button.textContent = 'Requested';
      setTimeout(function () { window.location.href = window.NGD_SITE_ROOT + 'account/holds.html'; }, 700);
    };
    modal.show();
  };
  window.NGDBindHoldButtons = function (buttons, options) {
    buttons.forEach(function (button) { if (!button) return; button.setAttribute('href', '#'); button.addEventListener('click', async function (event) {
      event.preventDefault(); var user = await window.NGDAuth.getCurrentUser();
      if (!user) { window.location.href = window.NGD_SITE_ROOT + 'login.html'; return; }
      window.NGDHoldRequest(options);
    }); });
  };
})();
