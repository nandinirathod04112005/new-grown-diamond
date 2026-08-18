(function () {
  'use strict';

  function esc(value) {
    var node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }

  function publicId() {
    var bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return 'QTE-' + Array.from(bytes, function (n) {
      return n.toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  async function findProduct(type, reference) {
    var table = type === 'diamond' ? 'diamonds' : 'jewellery';
    var columns = type === 'diamond' ? ['id', 'stock_number', 'public_id'] : ['id', 'sku', 'public_id'];
    for (var i = 0; i < columns.length; i++) {
      var res = await window.ngdSupabase.from(table).select('*').eq(columns[i], reference).maybeSingle();
      if (!res.error && res.data) return res.data;
    }
    return null;
  }

  function ensureModal() {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="modal fade ngd-modal" id="quoteRequestModal" tabindex="-1" aria-labelledby="quoteRequestTitle" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header">' +
      '<div><span class="ngd-eyebrow">Customer quote</span><h2 class="modal-title ngd-title fs-4 mt-1" id="quoteRequestTitle">Request Quote</h2></div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<form id="quote-request-form"><div class="modal-body ngd-form"><div class="ngd-dash-panel mb-3" id="quote-product-summary"></div>' +
      '<label class="form-label" for="quote-message">Message <span class="ngd-text-muted">(optional)</span></label>' +
      '<textarea class="form-control" id="quote-message" rows="4" maxlength="2000" placeholder="Tell us anything that may help us prepare your quote."></textarea>' +
      '<div id="quote-form-alert" class="mt-3" aria-live="polite"></div></div><div class="modal-footer">' +
      '<button type="button" class="ngd-btn ngd-btn-outline" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="ngd-btn ngd-btn-gold" id="quote-submit">Submit Quote Request</button>' +
      '</div></form></div></div></div>';
    document.body.appendChild(wrap.firstChild);
    return document.getElementById('quoteRequestModal');
  }

  window.NGDQuoteRequest = function (options) {
    var modalEl = ensureModal();
    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    var form = document.getElementById('quote-request-form');
    var alert = document.getElementById('quote-form-alert');
    document.getElementById('quote-product-summary').innerHTML = '<strong>' + esc(options.title) + '</strong>' +
      '<span class="d-block small ngd-text-muted">' + esc(options.reference) + ' · ' + esc(options.type === 'diamond' ? 'Diamond' : 'Jewellery') + '</span>';

    async function submit(event) {
      event.preventDefault();
      var button = document.getElementById('quote-submit');
      button.disabled = true;
      alert.innerHTML = '';
      var user = await window.NGDAuth.getCurrentUser();
      if (!user) { window.location.href = window.NGD_SITE_ROOT + 'login.html'; return; }
      var product = await findProduct(options.type, options.reference);
      if (!product) {
        alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">This product could not be found in the live inventory.</div>';
        button.disabled = false; return;
      }
      var payload = {
        public_id: publicId(), user_id: user.id, product_type: options.type,
        customer_message: document.getElementById('quote-message').value.trim() || null
      };
      payload[options.type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = product.id;
      var result = await window.ngdSupabase.from('quotes').insert(payload).select('public_id').single();
      if (result.error) {
        alert.innerHTML = '<div class="ngd-alert ngd-alert-danger">We could not submit your quote request. Please try again.</div>';
        button.disabled = false; return;
      }
      alert.innerHTML = '<div class="ngd-alert ngd-alert-success">Quote request ' + esc(result.data.public_id) + ' submitted.</div>';
      button.textContent = 'Submitted';
      setTimeout(function () { window.location.href = window.NGD_SITE_ROOT + 'account/quotes.html'; }, 700);
    }
    form.onsubmit = submit;
    document.getElementById('quote-message').value = '';
    document.getElementById('quote-submit').disabled = false;
    document.getElementById('quote-submit').textContent = 'Submit Quote Request';
    modal.show();
  };

  window.NGDBindQuoteButtons = function (buttons, options) {
    buttons.forEach(function (button) {
      if (!button) return;
      button.setAttribute('href', '#');
      button.addEventListener('click', async function (event) {
        event.preventDefault();
        var user = await window.NGDAuth.getCurrentUser();
        if (!user) {
          window.location.href = window.NGD_SITE_ROOT + 'login.html';
          return;
        }
        window.NGDQuoteRequest(options);
      });
    });
  };
})();
