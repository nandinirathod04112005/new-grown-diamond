/* ============================================================
   NEW GROWN DIAMOND — ADMIN ADD / EDIT DIAMOND FORM (STEP 25)
   ------------------------------------------------------------
   One controller powers both pages, selected by
   <body data-diamond-form="add|edit">. Guarded by requireAdmin().

   HONEST BY DESIGN: no database exists, so Save / Update never
   pretend anything was stored. A valid submit builds the exact
   Supabase-ready payload (snake_case field names matching the
   future `diamonds` table), exposes it on the form as
   data-ngd-payload for inspection, and says plainly that
   nothing was saved. The image picker validates and previews
   locally only — no file leaves the browser. Archive on the
   edit page is UI-only and says so.

   FUTURE SUPABASE SEAM
   --------------------
   saveDiamond(payload, mode) is the single function the
   backend phase replaces with insert/update (+ Storage upload
   for the image file held in state.imageFile).
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['stock_number', 'shape', 'carat', 'colour', 'clarity', 'cut',
    'laboratory', 'availability'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;

  var state = {
    mode: 'add',
    record: null,     /* edit: the demo record being edited */
    imageFile: null,  /* File selected for preview (never uploaded) */
    dirty: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function field(name) {
    return document.querySelector('[name="' + name + '"]');
  }

  /* ---------------- demo record (edit mode) ---------------- */

  /* Mirrors the deterministic admin augmentation used by
     assets/js/admin-diamonds.js — keep the two in step. */
  function adminAugment(d, i) {
    return Object.assign({}, d, {
      featured: i % 5 === 0 || i % 7 === 0,
      active: i % 9 !== 4
    });
  }

  function demoRecord(id) {
    var list = window.NGD_DEMO_DIAMONDS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return adminAugment(list[i], i);
    }
    return null;
  }

  /* Deterministic demo pricing/location for fields the public demo
     catalogue does not carry. Clearly samples, never claimed live. */
  function demoCommercials(d) {
    var base = { D: 1350, E: 1250, F: 1150, G: 1050, H: 950 }[d.colour] || 900;
    var perCarat = Math.round(base + d.carat * 220);
    return {
      price_per_carat: perCarat,
      total_price: Math.round(perCarat * d.carat),
      currency: 'USD',
      price_visibility: 'on_request',
      location: d.growth === 'CVD' ? 'Surat atelier' : 'Mumbai vault',
      certificate_url: 'https://example.com/reports/' + d.report,
      internal_notes: 'Demo record — sample note for layout preview.'
    };
  }

  /* ---------------- alerts + dirty tracking ---------------- */

  function showAlert(type, message) {
    var box = $('dia-alert');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
    div.scrollIntoView({ block: 'nearest' });
  }

  function clearAlert() {
    $('dia-alert').innerHTML = '';
  }

  function markDirty() {
    state.dirty = true;
  }

  function clearDirty() {
    state.dirty = false;
  }

  function initUnsavedWarning(form) {
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    window.addEventListener('beforeunload', function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      /* required by Chrome for the native dialog */
      event.returnValue = '';
    });
  }

  /* ---------------- validation ---------------- */

  function setInvalid(el, invalid) {
    el.classList.toggle('is-invalid', invalid);
    if (invalid) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  function numberOk(el) {
    if (el.value.trim() === '') return !el.required;
    var v = parseFloat(el.value);
    if (isNaN(v)) return false;
    var min = el.getAttribute('min');
    var max = el.getAttribute('max');
    if (min !== null && v < parseFloat(min)) return false;
    if (max !== null && v > parseFloat(max)) return false;
    return true;
  }

  function validate(form) {
    var firstBad = null;

    function check(el, ok) {
      setInvalid(el, !ok);
      if (!ok && !firstBad) firstBad = el;
    }

    REQUIRED.forEach(function (name) {
      var el = field(name);
      if (!el) return;
      var ok = el.type === 'number' ? numberOk(el) : el.value.trim() !== '';
      check(el, ok);
    });

    form.querySelectorAll('input[type="number"]').forEach(function (el) {
      if (el.classList.contains('is-invalid')) return;
      check(el, numberOk(el));
    });

    var url = field('certificate_url');
    if (url && url.value.trim() !== '') {
      check(url, /^https?:\/\/\S+$/i.test(url.value.trim()));
    }

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function bindLiveClear(form) {
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      ['input', 'change'].forEach(function (evt) {
        el.addEventListener(evt, function () { setInvalid(el, false); });
      });
    });
  }

  /* ---------------- payload + honest save ---------------- */

  function buildPayload(form) {
    var payload = {};
    form.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') payload[el.name] = el.checked;
      else if (el.type === 'number') payload[el.name] = el.value === '' ? null : parseFloat(el.value);
      else payload[el.name] = el.value.trim() === '' ? null : el.value.trim();
    });
    payload.image_filename = state.imageFile ? state.imageFile.name : null;
    return payload;
  }

  /**
   * Future-backend seam. Today it only records the payload on the form
   * (data-ngd-payload) and tells the truth: nothing was saved.
   */
  function saveDiamond(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var label = payload.stock_number || 'The diamond';
    if (mode === 'add-another') {
      showAlert('info',
        label + ' is valid and its payload is ready — but nothing was ' +
        'saved: the database arrives with the Supabase phase. The form ' +
        'has been cleared so you can preview another entry.');
    } else if (mode === 'edit') {
      showAlert('info',
        label + ' is valid and its update payload is ready — but nothing ' +
        'was saved: the database arrives with the Supabase phase.');
    } else {
      showAlert('info',
        label + ' is valid and its payload is ready — but nothing was ' +
        'saved: the database arrives with the Supabase phase. ' +
        'saveDiamond() in admin-diamond-form.js is the wiring point.');
    }
  }

  /* ---------------- image picker (preview only) ---------------- */

  function imageError(message) {
    var box = $('dia-image-error');
    box.textContent = message || '';
    box.hidden = !message;
  }

  function acceptFile(file) {
    if (!file) return;
    if (IMAGE_TYPES.indexOf(file.type) === -1) {
      imageError('That file type isn’t supported — use JPG, JPEG, PNG or WEBP.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      imageError('That image is larger than 10 MB — please choose a smaller file.');
      return;
    }
    imageError('');
    state.imageFile = file;
    markDirty();
    var reader = new FileReader();
    reader.onload = function () {
      $('dia-preview-img').src = String(reader.result);
      $('dia-preview-name').textContent = file.name +
        ' · ' + (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      $('dia-drop').hidden = true;
      $('dia-preview').hidden = false;
    };
    reader.readAsDataURL(file);
  }

  function resetImage() {
    state.imageFile = null;
    $('dia-file').value = '';
    $('dia-preview-img').removeAttribute('src');
    $('dia-preview').hidden = true;
    $('dia-drop').hidden = false;
    imageError('');
  }

  function initImagePicker() {
    var drop = $('dia-drop');
    var input = $('dia-file');

    $('dia-browse').addEventListener('click', function () { input.click(); });
    $('dia-replace').addEventListener('click', function () { input.click(); });
    $('dia-remove').addEventListener('click', function () {
      resetImage();
      markDirty();
    });

    input.addEventListener('change', function () {
      acceptFile(input.files && input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (event) {
        event.preventDefault();
        drop.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      drop.addEventListener(evt, function (event) {
        event.preventDefault();
        drop.classList.remove('is-drag');
      });
    });
    drop.addEventListener('drop', function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      acceptFile(file);
    });
  }

  /* ---------------- edit-mode prefill ---------------- */

  function prefill(record) {
    var extras = demoCommercials(record);
    var values = {
      stock_number: record.id,
      report_number: record.report,
      shape: record.shape,
      carat: record.carat,
      colour: record.colour,
      clarity: record.clarity,
      cut: record.cut,
      polish: record.polish,
      symmetry: record.symmetry,
      fluorescence: record.fluorescence,
      laboratory: record.lab,
      certificate_number: record.report,
      certificate_url: extras.certificate_url,
      measurements: record.measurements,
      depth_pct: record.depthPct,
      table_pct: record.tablePct,
      ratio: record.ratio,
      growth_method: record.growth,
      location: extras.location,
      availability: record.availability,
      price_per_carat: extras.price_per_carat,
      total_price: extras.total_price,
      currency: extras.currency,
      price_visibility: extras.price_visibility,
      internal_notes: extras.internal_notes
    };
    Object.keys(values).forEach(function (name) {
      var el = field(name);
      if (el && values[name] != null) el.value = values[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;

    /* current artwork stands in for the stone's photo */
    var artBox = $('dia-current-art');
    if (artBox) {
      artBox.innerHTML = (window.NGD_GEM_ART || {})[record.shape.toLowerCase()] || '';
    }
  }

  function showNotFound(id) {
    $('dia-form-wrap').hidden = true;
    $('dia-notfound').hidden = false;
    $('dia-notfound-id').textContent = id || '(no id)';
  }

  /* ---------------- boot ---------------- */

  function initButtons(form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearAlert();
      if (!validate(form)) {
        showAlert('danger',
          'Please complete the highlighted fields — required values and ' +
          'number ranges are marked inline.');
        return;
      }
      var payload = buildPayload(form);
      clearDirty();
      saveDiamond(payload, state.mode === 'edit' ? 'edit' : 'add', form);
    });

    var another = $('dia-save-another');
    if (another) {
      another.addEventListener('click', function () {
        clearAlert();
        if (!validate(form)) {
          showAlert('danger',
            'Please complete the highlighted fields — required values and ' +
            'number ranges are marked inline.');
          return;
        }
        var payload = buildPayload(form);
        saveDiamond(payload, 'add-another', form);
        form.reset();
        resetImage();
        clearDirty();
        window.scrollTo({ top: 0 });
      });
    }

    var archive = $('dia-archive');
    if (archive) {
      archive.addEventListener('click', function () {
        var id = state.record ? state.record.id : 'This diamond';
        showAlert('info',
          id + ' — Archive is UI-only for now: nothing was archived or ' +
          'deleted anywhere. The Diamond Inventory page previews the ' +
          'archive behaviour, and the real action arrives with the ' +
          'Supabase phase.');
      });
    }
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening

    var fullName = (res.profile.full_name || '').trim();
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) {
      el.textContent = fullName ? fullName.split(/\s+/)[0] : 'there';
    });

    state.mode = document.body.getAttribute('data-diamond-form') || 'add';
    var form = $('ngd-diamond-form');
    if (!form) return;

    if (state.mode === 'edit') {
      var id = new URLSearchParams(window.location.search).get('id');
      state.record = id ? demoRecord(id) : null;
      if (!state.record) {
        showNotFound(id);
        return;
      }
      $('dia-editing-id').textContent = state.record.id;
      prefill(state.record);
    }

    initImagePicker();
    bindLiveClear(form);
    initButtons(form);
    initUnsavedWarning(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
