/* ============================================================
   NEW GROWN DIAMOND — CONTACT PAGE
   ------------------------------------------------------------
   Frontend-only enquiry form (STEP 16). No backend exists yet,
   so this controller is deliberately honest:

   - It validates the form client-side.
   - It NEVER pretends a message was sent. Nothing is stored,
     nothing is posted.
   - If an enquiries inbox is configured (below), a valid submit
     prepares a pre-filled draft in the visitor's own email app
     via a mailto: link — a real action, clearly explained.
   - When Supabase arrives, submitEnquiry() below is the single
     seam to replace with an insert into an `enquiries` table.

   HOW TO CONNECT YOUR INBOX (until the backend phase)
   ---------------------------------------------------
   Replace the empty string below with your enquiries address,
   e.g. 'enquiries@your-domain.com'. That is the only change
   needed — the form then opens pre-filled drafts to it.
   ============================================================ */
(function () {
  'use strict';

  var CONTACT_EMAIL = ''; // ← paste your enquiries inbox here

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\-\s\d]{7,20}$/;

  var NOT_CONNECTED_MSG =
    'Direct sending isn’t connected yet — this website stores ' +
    'nothing and has sent nothing. Your text is kept safely in the form: ' +
    'add your enquiries inbox in assets/js/contact.js to prepare email ' +
    'drafts, or check back once our enquiries desk goes live.';
  var DRAFT_MSG =
    'Your email app should now open with this enquiry prepared as a ' +
    'draft. Nothing is sent by this website itself — the message ' +
    'only goes out when you send it from your inbox.';

  function $(id) {
    return document.getElementById(id);
  }

  function configuredEmail() {
    /* window override is a convenience for demos and tests */
    var value = window.NGD_CONTACT_EMAIL !== undefined
      ? window.NGD_CONTACT_EMAIL
      : CONTACT_EMAIL;
    return String(value || '').trim();
  }

  function showAlert(type, message) {
    var box = $('contact-alert');
    if (!box) return;
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
    div.scrollIntoView({ block: 'nearest' });
  }

  function clearAlert() {
    var box = $('contact-alert');
    if (box) box.innerHTML = '';
  }

  function setInvalid(field, invalid) {
    field.classList.toggle('is-invalid', invalid);
    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  function validate(fields) {
    var firstBad = null;

    function check(field, ok) {
      setInvalid(field, !ok);
      if (!ok && !firstBad) firstBad = field;
      return ok;
    }

    var okName = check(fields.name, fields.name.value.trim().length >= 2);
    var okEmail = check(fields.email, EMAIL_RE.test(fields.email.value.trim()));
    var okMobile = check(fields.mobile, PHONE_RE.test(fields.mobile.value.trim()));
    var okCountry = check(fields.country, fields.country.value !== '');
    var okSubject = check(fields.subject, fields.subject.value !== '');
    var okMessage = check(fields.message, fields.message.value.trim().length >= 20);
    /* company is optional and never flagged */

    if (firstBad) firstBad.focus();
    return okName && okEmail && okMobile && okCountry && okSubject && okMessage;
  }

  /**
   * The single future-backend seam. Today it can only prepare a
   * mailto draft (when an inbox is configured); the Supabase phase
   * replaces the body of this function with an insert into an
   * RLS-protected `enquiries` table — nothing else changes.
   */
  function submitEnquiry(enquiry, form) {
    var inbox = configuredEmail();
    if (!inbox) {
      form.removeAttribute('data-ngd-mailto');
      showAlert('info', NOT_CONNECTED_MSG);
      return;
    }
    var subjectLine = '[' + enquiry.subject + '] Enquiry from ' + enquiry.full_name;
    var bodyLines = [
      'Name: ' + enquiry.full_name,
      enquiry.company_name ? 'Company: ' + enquiry.company_name : null,
      'Email: ' + enquiry.email,
      'Mobile: ' + enquiry.mobile,
      'Country: ' + enquiry.country,
      'Subject: ' + enquiry.subject,
      '',
      enquiry.message,
    ].filter(Boolean);
    var url = 'mailto:' + inbox +
      '?subject=' + encodeURIComponent(subjectLine) +
      '&body=' + encodeURIComponent(bodyLines.join('\n'));
    /* exposed for tests / future CMS tooling before navigating */
    form.setAttribute('data-ngd-mailto', url);
    showAlert('info', DRAFT_MSG);
    window.location.href = url;
  }

  function initCounter(message) {
    var counter = $('contact-message-count');
    if (!counter) return;
    var max = message.getAttribute('maxlength') || 1000;
    var update = function () {
      counter.textContent = message.value.length + ' / ' + max;
    };
    message.addEventListener('input', update);
    update();
  }

  /** Preselect the subject from ?subject=… or a [data-contact-subject]
      trigger (e.g. the business-enquiry button). */
  function initSubjectShortcuts(fields) {
    var select = fields.subject;

    function apply(value) {
      if (!value) return;
      var match = [].some.call(select.options, function (o) {
        return o.value === value;
      });
      if (match) {
        select.value = value;
        setInvalid(select, false);
      }
    }

    apply(new URLSearchParams(window.location.search).get('subject'));

    [].forEach.call(document.querySelectorAll('[data-contact-subject]'), function (btn) {
      btn.addEventListener('click', function () {
        apply(btn.getAttribute('data-contact-subject'));
        /* the anchor itself scrolls to the form */
      });
    });
  }

  function init() {
    var form = $('ngd-contact-form');
    if (!form) return;

    var fields = {
      name: $('contact-name'),
      company: $('contact-company'),
      email: $('contact-email'),
      mobile: $('contact-mobile'),
      country: $('contact-country'),
      subject: $('contact-subject'),
      message: $('contact-message'),
    };

    initCounter(fields.message);
    initSubjectShortcuts(fields);

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('input', function () {
        setInvalid(fields[key], false);
      });
      fields[key].addEventListener('change', function () {
        setInvalid(fields[key], false);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearAlert();
      if (!validate(fields)) {
        showAlert('danger',
          'Please complete the highlighted fields — every enquiry needs ' +
          'a name, a valid email, a mobile number, a country, a subject ' +
          'and a few sentences.');
        return;
      }
      /* keys mirror the future Supabase `enquiries` columns */
      submitEnquiry({
        full_name: fields.name.value.trim(),
        company_name: fields.company.value.trim(),
        email: fields.email.value.trim(),
        mobile: fields.mobile.value.trim(),
        country: fields.country.value === 'other'
          ? 'Other'
          : fields.country.value,
        subject: fields.subject.options[fields.subject.selectedIndex].text,
        message: fields.message.value.trim(),
      }, form);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
