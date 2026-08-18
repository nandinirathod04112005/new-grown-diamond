(function () {
  'use strict';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\-\s\d]{7,20}$/;
  var $ = function (id) { return document.getElementById(id); };

  function alertBox(type, text) {
    var box = $('contact-alert');
    box.innerHTML = '';
    var node = document.createElement('div');
    node.className = 'ngd-alert ngd-alert-' + type;
    node.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    node.textContent = text;
    box.appendChild(node);
  }
  function invalid(field, value) {
    field.classList.toggle('is-invalid', value);
    if (value) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  function publicId() {
    var bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return 'ENQ-' + Array.from(bytes, function (b) { return (b % 36).toString(36); }).join('').toUpperCase();
  }
  function productParams() {
    var q = new URLSearchParams(location.search);
    if (q.get('stone')) return { type: 'diamond', reference: q.get('stone') };
    if (q.get('piece')) return { type: 'jewellery', reference: q.get('piece') };
    var type = q.get('product_type');
    return /^(diamond|jewellery)$/.test(type || '') && q.get('product')
      ? { type: type, reference: q.get('product') } : null;
  }
  async function resolveProduct(sb, product) {
    if (!product) return null;
    var table = product.type === 'diamond' ? 'diamonds' : 'jewellery';
    var key = product.type === 'diamond' ? 'stock_number' : 'sku';
    var result = await sb.from(table).select('id').eq(key, product.reference).limit(1);
    if (result.error || !result.data || !result.data[0]) return null;
    return { type: product.type, id: result.data[0].id };
  }
  async function insert(payload) {
    var sb = window.ngdSupabase;
    if (!sb) throw new Error('unavailable');
    var auth = await sb.auth.getUser();
    payload.user_id = auth.data && auth.data.user ? auth.data.user.id : null;
    var resolved = await resolveProduct(sb, productParams());
    if (resolved) {
      payload.product_type = resolved.type;
      payload[resolved.type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = resolved.id;
    }
    for (var attempt = 0; attempt < 3; attempt++) {
      payload.public_id = publicId();
      // Do not request a representation: anonymous users intentionally have no
      // SELECT policy, while INSERT is allowed by the guest submission policy.
      var result = await sb.from('enquiries').insert(payload);
      if (!result.error) return payload.public_id;
      if (result.error.code !== '23505') throw result.error;
    }
    throw new Error('id collision');
  }
  function init() {
    var form = $('ngd-contact-form');
    if (!form) return;
    var f = { name: $('contact-name'), company: $('contact-company'), email: $('contact-email'),
      mobile: $('contact-mobile'), country: $('contact-country'), subject: $('contact-subject'),
      message: $('contact-message'), website: $('contact-website') };
    var counter = $('contact-message-count');
    function count() { counter.textContent = f.message.value.length + ' / 1000'; }
    f.message.addEventListener('input', count); count();
    Object.keys(f).forEach(function (key) {
      f[key].addEventListener('input', function () { invalid(f[key], false); });
      f[key].addEventListener('change', function () { invalid(f[key], false); });
    });
    var product = productParams();
    var q = new URLSearchParams(location.search);
    var requestedSubject = q.get('subject');
    if (product) {
      f.subject.value = product.type;
      f.message.value = 'I would like more information about ' + product.reference + '. ';
      count();
    } else if (requestedSubject && Array.from(f.subject.options).some(function (o) { return o.value === requestedSubject; })) {
      f.subject.value = requestedSubject;
    }
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (f.website.value) return; // honeypot: deliberately silent
      var checks = [
        [f.name, f.name.value.trim().length >= 2], [f.email, EMAIL_RE.test(f.email.value.trim())],
        [f.mobile, !f.mobile.value.trim() || PHONE_RE.test(f.mobile.value.trim())],
        [f.subject, !!f.subject.value], [f.message, f.message.value.trim().length >= 20]
      ];
      checks.forEach(function (c) { invalid(c[0], !c[1]); });
      var bad = checks.find(function (c) { return !c[1]; });
      if (bad) { alertBox('danger', 'Please complete the highlighted required fields with valid information.'); bad[0].focus(); return; }
      var button = $('contact-submit'); button.disabled = true; button.textContent = 'Sending…';
      try {
        var id = await insert({ full_name: f.name.value.trim(), company_name: f.company.value.trim() || null,
          email: f.email.value.trim(), mobile: f.mobile.value.trim() || null,
          country: f.country.value === 'other' ? 'Other' : (f.country.value || null),
          subject: f.subject.options[f.subject.selectedIndex].text, message: f.message.value.trim() });
        form.reset(); count();
        alertBox('success', 'Thank you — your enquiry ' + id + ' has been received.');
      } catch (error) {
        console.error('[NGD] Enquiry insert failed', error);
        alertBox('danger', 'We could not send your enquiry. Please check your connection and try again.');
      } finally { button.disabled = false; button.textContent = 'Send enquiry'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
