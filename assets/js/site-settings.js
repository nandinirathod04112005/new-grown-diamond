/* ============================================================
   NEW GROWN DIAMOND — public site-settings loader
   ------------------------------------------------------------
   Applies admin-managed global settings from public.site_settings
   onto the storefront:

     · header/footer branding (name, logo, favicon, language)
     · footer © line and the social icons
     · contact-page email / phone / WhatsApp / address cards
     · the announcement bar (when enabled)
     · business feature toggles — quote / hold / inspection /
       enquiry actions are hidden, never deleted
     · maintenance mode — a holding screen on public pages only;
       the Admin Console and login page never load this file, so
       admins are never locked out

   Every bind is guarded: a missing key, an empty table or an
   unreachable Supabase leaves the designed page exactly as
   authored. Values land via textContent / setAttribute /
   createElement only — admin input can never execute — and every
   URL must be a normal http(s) (or relative) address.
   ============================================================ */
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var S = {}; // key → value (public rows only — RLS keeps admin-only keys away)

  function val(key) {
    var v = S[key];
    return typeof v === 'string' ? v.trim() : '';
  }
  function isOn(key, fallback) {
    var v = val(key);
    return v ? v === 'true' : fallback;
  }
  /* Only navigable web URLs — javascript:, data: and friends never bind. */
  function safeUrl(value) {
    if (!value) return '';
    try {
      var parsed = new URL(String(value), location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? String(value) : '';
    } catch (_error) { return ''; }
  }
  function safeEmail(value) { return EMAIL_RE.test(value) ? value : ''; }
  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function link(href, label, external) {
    var a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = label;
    if (external) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
    return a;
  }
  function hide(selector) {
    document.querySelectorAll(selector).forEach(function (el) { el.style.display = 'none'; });
  }

  /* ---- branding: every .ngd-brand on the page, favicon, language ---- */
  function applyBranding() {
    var name = val('brand_short_name') || val('company_name');
    var logo = safeUrl(val('logo_url'));
    document.querySelectorAll('.ngd-brand').forEach(function (brand) {
      var mark = brand.querySelector('.ngd-brand-mark');
      if (!mark) return;
      if (name && mark.nextElementSibling) mark.nextElementSibling.textContent = name;
      if (logo) {
        var img = document.createElement('img');
        img.className = 'ngd-brand-logo';
        img.setAttribute('alt', '');
        img.setAttribute('src', logo);
        mark.textContent = '';
        mark.appendChild(img);
      }
    });
    var favicon = safeUrl(val('favicon_url'));
    if (favicon) {
      var iconLink = document.querySelector('link[rel="icon"]');
      if (iconLink) iconLink.setAttribute('href', favicon);
    }
    var lang = val('site_language');
    if (/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/i.test(lang)) {
      document.documentElement.setAttribute('lang', lang);
    }
  }

  /* ---- footer: © line + the social icons the design carries ---- */
  var SOCIAL_KEYS = {
    instagram: 'social_instagram',
    facebook: 'social_facebook',
    twitter: 'social_twitter',
    linkedin: 'social_linkedin'
  };
  var SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'X', linkedin: 'LinkedIn' };

  function applyFooter() {
    var copyright = val('footer_copyright');
    if (copyright) {
      document.querySelectorAll('[data-ngd-copyright]').forEach(function (el) {
        el.textContent = copyright;
      });
    }
    /* Until any social profile is configured the designed placeholders
       stay; once one is, icons with a URL go live and the rest hide. */
    var anyConfigured = Object.keys(SOCIAL_KEYS).some(function (type) {
      return !!safeUrl(val(SOCIAL_KEYS[type]));
    });
    if (!anyConfigured) return;
    document.querySelectorAll('[data-ngd-social]').forEach(function (icon) {
      var type = icon.getAttribute('data-ngd-social');
      var url = safeUrl(val(SOCIAL_KEYS[type] || ''));
      if (url) {
        icon.setAttribute('href', url);
        icon.setAttribute('target', '_blank');
        icon.setAttribute('rel', 'noopener');
        icon.setAttribute('aria-label', SOCIAL_LABELS[type] || type);
      } else {
        icon.style.display = 'none';
      }
    });
  }

  /* ---- contact page cards (only where the slots exist) ---- */
  function fillSlot(slot, parts) {
    if (!slot || !parts.length) return;
    slot.textContent = '';
    parts.forEach(function (part, index) {
      if (index > 0) slot.appendChild(document.createTextNode(' · '));
      slot.appendChild(typeof part === 'string' ? document.createTextNode(part) : part);
    });
  }

  function applyContact() {
    var emailSlot = document.querySelector('[data-contact-slot="email"]');
    if (emailSlot) {
      var primary = safeEmail(val('contact_email'));
      var support = safeEmail(val('support_email'));
      var emailParts = [];
      if (primary) emailParts.push(link('mailto:' + primary, primary));
      if (support && support !== primary) emailParts.push(link('mailto:' + support, support));
      fillSlot(emailSlot, emailParts);
    }
    var phoneSlot = document.querySelector('[data-contact-slot="phone"]');
    if (phoneSlot) {
      var phone = val('contact_phone');
      var phoneParts = [];
      if (phone && digits(phone).length >= 7) phoneParts.push(link('tel:+' + digits(phone), phone));
      /* the shared WhatsApp helper prefers the configured number and falls
         back to the official business line; without it, configured-only */
      var waConfigured = digits(val('whatsapp_number')).length >= 7;
      var waUrl = window.NGDWhatsApp ? window.NGDWhatsApp.link()
        : (waConfigured ? 'https://wa.me/' + digits(val('whatsapp_number')) : '');
      /* the card fills only when contact details exist — never on a bare page */
      if (waUrl && (waConfigured || phoneParts.length)) {
        var waLink = link(waUrl, 'WhatsApp', true);
        waLink.setAttribute('data-ngd-whatsapp', '');
        phoneParts.push(waLink);
      }
      fillSlot(phoneSlot, phoneParts);
    }
    var addressSlot = document.querySelector('[data-contact-slot="address"]');
    if (addressSlot) {
      var addressParts = [val('address_line'), val('address_city'), val('address_state'),
        val('address_country'), val('address_postal_code')].filter(Boolean);
      if (addressParts.length) addressSlot.textContent = addressParts.join(', ');
    }
  }

  /* ---- business feature toggles: hide, never delete ---- */
  function dropSubjectOption(value) {
    var option = document.querySelector('#contact-subject option[value="' + value + '"]');
    if (option) option.remove();
  }

  function applyFeatures() {
    if (!isOn('feature_quotes', true)) hide('#dd-quote, #dd-sticky-quote, #jd-quote, #jd-sticky-quote');
    if (!isOn('feature_holds', true)) hide('#dd-hold, #dd-sticky-hold, #jd-hold, #jd-sticky-hold');
    if (!isOn('feature_inspections', true)) hide('#dd-inspect');
    if (!isOn('feature_jewellery_enquiry', true)) {
      hide('#jd-enquire, #jd-whatsapp');
      dropSubjectOption('jewellery');
    }
    if (!isOn('feature_diamond_enquiry', true)) {
      hide('#dd-whatsapp');
      dropSubjectOption('diamond');
    }
  }

  /* ---- announcement bar above the header ---- */
  function applyAnnouncement() {
    if (!isOn('announcement_enabled', false)) return;
    var message = val('announcement_text');
    if (!message || document.getElementById('ngd-announce')) return;
    var bar = document.createElement('div');
    bar.id = 'ngd-announce';
    bar.className = 'ngd-announce';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Announcement');
    var textSpan = document.createElement('span');
    textSpan.textContent = message;
    bar.appendChild(textSpan);
    var url = safeUrl(val('announcement_url'));
    if (url) bar.appendChild(link(url, 'Learn more'));
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---- maintenance holding screen (public pages only) ---- */
  function applyMaintenance() {
    if (!isOn('maintenance_mode', false) || document.getElementById('ngd-maintenance')) return;
    var overlay = document.createElement('div');
    overlay.id = 'ngd-maintenance';
    overlay.className = 'ngd-maintenance';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Website maintenance');
    var mark = document.createElement('span');
    mark.className = 'ngd-maintenance-mark';
    mark.textContent = '◆';
    var heading = document.createElement('h1');
    heading.textContent = 'We’re polishing things up';
    var note = document.createElement('p');
    note.textContent = (val('company_name') || 'New Grown Diamond') +
      ' is briefly offline for scheduled upkeep. Please check back soon.';
    var adminLink = link('login.html', 'Admin sign in');
    adminLink.className = 'ngd-maintenance-admin';
    overlay.appendChild(mark);
    overlay.appendChild(heading);
    overlay.appendChild(note);
    overlay.appendChild(adminLink);
    document.body.appendChild(overlay);
    document.body.classList.add('ngd-maintenance-on');
  }

  async function init() {
    if (!window.ngdSupabase) return;
    try {
      var res = await window.ngdSupabase.from('site_settings').select('key,value');
      if (res.error) throw res.error;
      (res.data || []).forEach(function (row) {
        if (row && typeof row.key === 'string') S[row.key] = row.value;
      });
    } catch (error) {
      /* the designed page stays — a settings read must never hurt it */
      console.warn('[NGD Settings] live settings unavailable, keeping the built-in design', error);
      return;
    }
    /* let other modules (e.g. the WhatsApp helper) read loaded settings */
    window.NGDSiteSettings = { value: val };
    if (window.NGDWhatsApp) window.NGDWhatsApp.refresh();
    applyBranding();
    applyFooter();
    applyContact();
    applyFeatures();
    applyAnnouncement();
    applyMaintenance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
