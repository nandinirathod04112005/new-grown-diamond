/* ============================================================
   NEW GROWN DIAMOND — shared WhatsApp enquiry helper
   ------------------------------------------------------------
   ONE place for every WhatsApp link the site builds
   (window.NGDWhatsApp) — the details pages' "Enquire on
   WhatsApp" CTAs and the Settings-driven contact card all
   resolve their number and URLs here, so no page ever
   duplicates wa.me logic.

   Number: the admin-configured Settings value
   (site_settings.whatsapp_number, published by site-settings.js
   as window.NGDSiteSettings) is preferred when it looks like a
   real number; the official business number 917339220840
   (+91 73392 20840 — public contact information, not a secret)
   is the safe fallback.

   Messages contain ONLY public product facts plus the current
   page URL. Builders drop missing values entirely — never
   "undefined", "null" or the em-dash placeholder — and the text
   always goes through encodeURIComponent. Nothing private ever
   belongs here: no prices, tokens, internal ids, emails or
   customer data.

   Clicking a bound CTA also dispatches a lightweight
   'ngd:whatsapp-enquiry' CustomEvent ({productType, productId})
   for future analytics — public facts only.
   ============================================================ */
(function () {
  'use strict';

  var OFFICIAL_NUMBER = '917339220840';
  var bound = []; // anchors to re-resolve if settings arrive after binding

  function digits(value) {
    return String(value == null ? '' : value).replace(/\D/g, '');
  }

  /* '—' is the site's visible placeholder for missing data — treat it
     (and empty/nullish values) as absent so no line ever fakes a fact. */
  function clean(value) {
    if (value == null) return '';
    var text = String(value).trim();
    return text === '—' || text === 'null' || text === 'undefined' ? '' : text;
  }

  function number() {
    var settings = window.NGDSiteSettings;
    var configured = settings && typeof settings.value === 'function'
      ? digits(settings.value('whatsapp_number'))
      : '';
    return configured.length >= 7 && configured.length <= 15 ? configured : OFFICIAL_NUMBER;
  }

  function link(message) {
    var url = 'https://wa.me/' + number();
    return message ? url + '?text=' + encodeURIComponent(message) : url;
  }

  function lines(parts) {
    return parts.filter(function (part) { return part !== null; }).join('\n');
  }
  function field(label, value) {
    var text = clean(value);
    return text ? label + ': ' + text : null;
  }

  function buildDiamondMessage(info) {
    info = info || {};
    var carat = Number(info.carat);
    var certificate = [clean(info.lab), clean(info.certificate)].filter(Boolean).join(' ');
    return lines([
      'Hello New Grown Diamond,',
      '',
      'I am interested in this diamond.',
      '',
      field('Stock ID', info.stockId),
      field('Shape', info.shape),
      field('Carat', isFinite(carat) && carat > 0 ? carat.toFixed(2) + ' ct' : ''),
      field('Color', info.colour),
      field('Clarity', info.clarity),
      field('Certificate', certificate),
      field('Product Link', info.url),
      '',
      'Please share more details.'
    ]);
  }

  function buildJewelleryMessage(info) {
    info = info || {};
    return lines([
      'Hello New Grown Diamond,',
      '',
      'I am interested in this jewellery product.',
      '',
      field('Product', info.name),
      field('SKU', info.sku),
      field('Category', info.category),
      field('Product Link', info.url),
      '',
      'Please share more details.'
    ]);
  }

  function openWhatsApp(message) {
    window.open(link(message), '_blank', 'noopener,noreferrer');
  }

  /* Wire an existing anchor as a WhatsApp CTA: safe external-link
     attributes, the encoded message href, and the analytics event. */
  function bind(anchor, options) {
    if (!anchor || !options) return;
    var entry = {
      anchor: anchor,
      message: String(options.message || ''),
      productType: clean(options.productType),
      productId: clean(options.productId)
    };
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
    anchor.setAttribute('href', link(entry.message));
    anchor.addEventListener('click', function () {
      window.dispatchEvent(new CustomEvent('ngd:whatsapp-enquiry', {
        detail: { productType: entry.productType, productId: entry.productId }
      }));
    });
    anchor.hidden = false;
    bound.push(entry);
  }

  /* Settings can finish loading after a product rendered — re-resolve
     every bound link so the admin-preferred number always wins. */
  function refresh() {
    bound.forEach(function (entry) {
      entry.anchor.setAttribute('href', link(entry.message));
    });
  }

  window.NGDWhatsApp = {
    number: number,
    link: link,
    buildDiamondMessage: buildDiamondMessage,
    buildJewelleryMessage: buildJewelleryMessage,
    openWhatsApp: openWhatsApp,
    bind: bind,
    refresh: refresh
  };
})();
