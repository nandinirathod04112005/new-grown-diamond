(function () {
  'use strict';
  function esc(value) { var n = document.createElement('span'); n.textContent = value == null ? '' : String(value); return n.innerHTML; }
  function publicId() {
    var bytes = new Uint8Array(4); crypto.getRandomValues(bytes);
    return 'INS-' + Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  var TYPES = [
    { value: 'in_person', label: 'In person · atelier' },
    { value: 'video_call', label: 'Video call' },
    { value: 'third_party_lab', label: 'Third-party lab' }
  ];
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
    var existing = document.getElementById('inspectionRequestModal'); if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="modal fade ngd-modal" id="inspectionRequestModal" tabindex="-1" aria-labelledby="inspectionRequestTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><div><span class="ngd-eyebrow">Customer inspection</span><h2 class="modal-title ngd-title fs-4 mt-1" id="inspectionRequestTitle">Request Inspection</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form id="inspection-request-form"><div class="modal-body ngd-form"><div class="ngd-dash-panel mb-3" id="inspection-product-summary"></div><div class="row g-3"><div class="col-md-6"><label class="form-label" for="inspection-type">Inspection type</label><select class="form-select" id="inspection-type">' + TYPES.map(function (t) { return '<option value="' + t.value + '">' + t.label + '</option>'; }).join('') + '</select></div><div class="col-md-6"><label class="form-label" for="inspection-date">Preferred date <span class="ngd-text-muted">(optional)</span></label><input class="form-control" id="inspection-date" type="date"></div><div class="col-12"><label class="form-label" for="inspection-message">Message <span class="ngd-text-muted">(optional)</span></label><textarea class="form-control" id="inspection-message" rows="4" maxlength="2000" placeholder="Anything that helps us prepare your viewing."></textarea></div></div><div id="inspection-form-alert" class="mt-3" aria-live="polite"></div></div><div class="modal-footer"><button type="button" class="ngd-btn ngd-btn-outline" data-bs-dismiss="modal">Cancel</button><button type="submit" class="ngd-btn ngd-btn-gold" id="inspection-submit">Request Inspection</button></div></form></div></div></div>';
    document.body.appendChild(wrap.firstChild); return document.getElementById('inspectionRequestModal');
  }
  window.NGDInspectionRequest = function (options) {
    var modalEl = ensureModal(), modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    var form = document.getElementById('inspection-request-form'), alert = document.getElementById('inspection-form-alert');
    document.getElementById('inspection-product-summary').innerHTML = '<strong>' + esc(options.title) + '</strong><span class="d-block small ngd-text-muted">' + esc(options.reference) + ' · ' + (options.type === 'diamond' ? 'Diamond' : 'Jewellery') + '</span>';
    document.getElementById('inspection-message').value = ''; document.getElementById('inspection-date').value = ''; alert.innerHTML = '';
    var button = document.getElementById('inspection-submit'); button.disabled = false; button.textContent = 'Request Inspection';
    form.onsubmit = async function (event) {
      event.preventDefault(); button.disabled = true;
      var user = await window.NGDAuth.getCurrentUser();
      if (!user) { window.location.href = window.NGD_SITE_ROOT + 'login.html'; return; }
      var product = await findProduct(options.type, options.reference);
      if (!product) { alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">This product could not be found in the live inventory.</div>'; button.disabled = false; return; }
      var payload = {
        public_id: publicId(), user_id: user.id, product_type: options.type,
        inspection_type: document.getElementById('inspection-type').value,
        preferred_date: document.getElementById('inspection-date').value || null,
        customer_message: document.getElementById('inspection-message').value.trim() || null
      };
      payload[options.type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = product.id;
      var result = await window.ngdSupabase.from('inspections').insert(payload).select('public_id').single();
      if (result.error) { alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">We could not submit your inspection request. Please try again.</div>'; button.disabled = false; return; }
      alert.innerHTML = '<div class="ngd-alert ngd-alert-success">Inspection request ' + esc(result.data.public_id) + ' submitted.</div>'; button.textContent = 'Requested';
      setTimeout(function () { window.location.href = window.NGD_SITE_ROOT + 'account/inspections.html'; }, 700);
    };
    modal.show();
  };
  window.NGDBindInspectionButtons = function (buttons, options) {
    buttons.forEach(function (button) { if (!button) return; button.setAttribute('href', '#'); button.addEventListener('click', async function (event) {
      event.preventDefault(); var user = await window.NGDAuth.getCurrentUser();
      if (!user) { window.location.href = window.NGD_SITE_ROOT + 'login.html'; return; }
      window.NGDInspectionRequest(options);
    }); });
  };
})();
