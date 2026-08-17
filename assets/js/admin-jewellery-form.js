/* ============================================================
   NEW GROWN DIAMOND — ADMIN ADD / EDIT JEWELLERY FORM (STEP 27)
   ------------------------------------------------------------
   One controller powers both pages, selected by
   <body data-jewellery-form="add|edit">. Guarded by requireAdmin().

   HONEST BY DESIGN: no database exists, so Save / Update never
   pretend anything was stored. A valid submit builds the exact
   Supabase-ready payload (snake_case field names matching the
   future `jewellery` table, plus an ordered images array with
   the primary flag), exposes it on the form as data-ngd-payload
   for inspection, and says plainly that nothing was saved. The
   multi-image picker validates and previews locally only — no
   file leaves the browser. Archive on the edit page is UI-only
   and says so.

   FUTURE SUPABASE SEAM
   --------------------
   saveJewellery(payload, mode) is the single function the
   backend phase replaces with insert/update (+ Storage uploads
   for the files held in state.images).
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['sku', 'product_name', 'category', 'short_description',
    'metal', 'availability'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;

  var state = {
    mode: 'add',
    record: null,     /* edit: the demo record being edited */
    images: [],       /* ordered gallery: {uid, name, sizeLabel, src|art, file} */
    primaryUid: null,
    nextUid: 1,
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
     assets/js/admin-jewellery.js — keep the two in step. */
  function adminAugment(p, i) {
    return Object.assign({}, p, {
      featured: i % 5 === 0 || i % 7 === 0,
      active: i % 9 !== 4
    });
  }

  function demoRecord(id) {
    var list = window.NGD_DEMO_JEWELLERY || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return adminAugment(list[i], i);
    }
    return null;
  }

  /* Deterministic demo pricing for fields the public demo collection
     does not carry. Clearly samples, never claimed live. */
  function demoCommercials(p) {
    return {
      price: Math.round((p.weightCt || 0.35) * 1450 + p.grossWeight * 42),
      currency: 'USD',
      price_visibility: 'on_request',
      internal_notes: 'Demo record — sample note for layout preview.'
    };
  }

  /* Edit mode opens with the piece's demo gallery: category artwork
     stands in for photography until real uploads arrive. */
  function demoGallery(record) {
    var art = (window.NGD_JEWEL_ART || {})[record.category.toLowerCase()] || '';
    return ['hero', 'angle', 'detail'].map(function (suffix) {
      return {
        uid: state.nextUid++,
        name: record.id + '-' + suffix + '.webp',
        sizeLabel: 'demo artwork',
        art: art,
        file: null
      };
    });
  }

  /* ---------------- alerts + dirty tracking ---------------- */

  function showAlert(type, message) {
    var box = $('jw-alert');
    box.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', 'alert');
    div.textContent = message;
    box.appendChild(div);
    div.scrollIntoView({ block: 'nearest' });
  }

  function clearAlert() {
    $('jw-alert').innerHTML = '';
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
    /* ordered gallery for the future jewellery_images table */
    payload.images = state.images.map(function (img, idx) {
      return {
        filename: img.name,
        position: idx + 1,
        is_primary: img.uid === state.primaryUid
      };
    });
    return payload;
  }

  /**
   * Future-backend seam. Today it only records the payload on the form
   * (data-ngd-payload) and tells the truth: nothing was saved.
   */
  function saveJewellery(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var label = payload.sku || 'The piece';
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
        'saveJewellery() in admin-jewellery-form.js is the wiring point.');
    }
  }

  /* ---------------- multi-image gallery (preview only) ---------------- */

  var TILE_ICONS = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  function imageError(message) {
    var box = $('jw-image-error');
    box.textContent = message || '';
    box.hidden = !message;
  }

  function tileButton(act, icon, title, label, opts) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ngd-icon-btn' + (opts && opts.on ? ' is-on' : '') +
      (opts && opts.danger ? ' is-danger' : '');
    btn.setAttribute('data-img-act', act);
    btn.title = title;
    btn.setAttribute('aria-label', label);
    if (opts && opts.disabled) btn.disabled = true;
    if (opts && opts.pressed !== undefined) btn.setAttribute('aria-pressed', String(opts.pressed));
    btn.innerHTML = icon;
    return btn;
  }

  function renderGallery() {
    var wrap = $('jw-gallery-wrap');
    var grid = $('jw-gallery');
    grid.innerHTML = '';
    wrap.hidden = state.images.length === 0;

    state.images.forEach(function (img, idx) {
      var isPrimary = img.uid === state.primaryUid;

      var tile = document.createElement('figure');
      tile.className = 'ngd-img-tile' + (isPrimary ? ' is-primary' : '');
      tile.setAttribute('data-img-uid', String(img.uid));

      var frame = document.createElement('div');
      frame.className = 'ngd-img-tile-frame';
      if (img.src) {
        var image = document.createElement('img');
        image.src = img.src;
        image.alt = 'Preview of ' + img.name;
        frame.appendChild(image);
      } else {
        frame.innerHTML = img.art || '';
      }
      if (isPrimary) {
        var badge = document.createElement('span');
        badge.className = 'ngd-status-chip is-gold';
        badge.textContent = 'Primary';
        frame.appendChild(badge);
      }
      tile.appendChild(frame);

      var caption = document.createElement('figcaption');
      caption.className = 'ngd-img-tile-name';
      caption.textContent = img.name + (img.sizeLabel ? ' · ' + img.sizeLabel : '');
      caption.title = img.name;
      tile.appendChild(caption);

      var actions = document.createElement('div');
      actions.className = 'ngd-img-tile-actions';
      actions.appendChild(tileButton('left', TILE_ICONS.left, 'Move earlier',
        'Move ' + img.name + ' earlier', { disabled: idx === 0 }));
      actions.appendChild(tileButton('right', TILE_ICONS.right, 'Move later',
        'Move ' + img.name + ' later', { disabled: idx === state.images.length - 1 }));
      actions.appendChild(tileButton('primary', TILE_ICONS.star,
        isPrimary ? 'Primary image' : 'Set as primary',
        isPrimary ? img.name + ' is the primary image' : 'Set ' + img.name + ' as primary',
        { on: isPrimary, pressed: isPrimary, disabled: isPrimary }));
      actions.appendChild(tileButton('remove', TILE_ICONS.remove, 'Remove',
        'Remove ' + img.name, { danger: true }));
      tile.appendChild(actions);

      grid.appendChild(tile);
    });
  }

  function findImage(uid) {
    for (var i = 0; i < state.images.length; i++) {
      if (state.images[i].uid === uid) return i;
    }
    return -1;
  }

  function galleryAction(act, uid) {
    var idx = findImage(uid);
    if (idx === -1) return;
    if (act === 'left' && idx > 0) {
      var prev = state.images[idx - 1];
      state.images[idx - 1] = state.images[idx];
      state.images[idx] = prev;
    } else if (act === 'right' && idx < state.images.length - 1) {
      var next = state.images[idx + 1];
      state.images[idx + 1] = state.images[idx];
      state.images[idx] = next;
    } else if (act === 'primary') {
      state.primaryUid = uid;
    } else if (act === 'remove') {
      var removed = state.images.splice(idx, 1)[0];
      if (removed.uid === state.primaryUid) {
        state.primaryUid = state.images.length ? state.images[0].uid : null;
      }
    } else {
      return;
    }
    markDirty();
    renderGallery();
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var rejected = [];

    files.forEach(function (file) {
      if (IMAGE_TYPES.indexOf(file.type) === -1) {
        rejected.push(file.name + ' (type isn’t supported — use JPG, JPEG, PNG or WEBP)');
        return;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        rejected.push(file.name + ' (larger than 10 MB)');
        return;
      }
      var entry = {
        uid: state.nextUid++,
        name: file.name,
        sizeLabel: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        src: '',
        file: file
      };
      state.images.push(entry);
      if (state.primaryUid === null) state.primaryUid = entry.uid;
      var reader = new FileReader();
      reader.onload = function () {
        entry.src = String(reader.result);
        renderGallery();
      };
      reader.readAsDataURL(file);
      markDirty();
    });

    imageError(rejected.length
      ? 'Not added — ' + rejected.join('; ') + '.'
      : '');
    renderGallery();
  }

  function resetGallery() {
    state.images = [];
    state.primaryUid = null;
    $('jw-file').value = '';
    imageError('');
    renderGallery();
  }

  function initImagePicker() {
    var drop = $('jw-drop');
    var input = $('jw-file');

    $('jw-browse').addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      addFiles(input.files);
      /* allow re-selecting the same file after a remove */
      input.value = '';
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
      addFiles(event.dataTransfer && event.dataTransfer.files);
    });

    $('jw-gallery').addEventListener('click', function (event) {
      var btn = event.target.closest('[data-img-act]');
      if (!btn || btn.disabled) return;
      var uid = parseInt(btn.closest('[data-img-uid]').getAttribute('data-img-uid'), 10);
      galleryAction(btn.getAttribute('data-img-act'), uid);
    });
  }

  /* ---------------- edit-mode prefill ---------------- */

  function prefill(record) {
    var extras = demoCommercials(record);
    var values = {
      sku: record.id,
      product_name: record.name,
      category: record.category,
      subcategory: record.subcategory,
      short_description: record.description,
      full_description: record.fullDesc,
      metal: record.metal,
      metal_karat: record.metalKarat,
      metal_colour: record.metalColour,
      gross_weight: record.grossWeight,
      diamond_weight: record.weightCt,
      diamond_pieces: record.diamondPieces,
      diamond_quality: record.diamondQuality,
      diamond_shape: record.diamondShape,
      certificate_number: record.certificateNo,
      size: record.size,
      price: extras.price,
      currency: extras.currency,
      price_visibility: extras.price_visibility,
      internal_notes: extras.internal_notes,
      availability: record.availability
    };
    Object.keys(values).forEach(function (name) {
      var el = field(name);
      if (el && values[name] != null) el.value = values[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;

    state.images = demoGallery(record);
    state.primaryUid = state.images.length ? state.images[0].uid : null;
    renderGallery();
  }

  function showNotFound(id) {
    $('jw-form-wrap').hidden = true;
    $('jw-notfound').hidden = false;
    $('jw-notfound-id').textContent = id || '(no id)';
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
      saveJewellery(payload, state.mode === 'edit' ? 'edit' : 'add', form);
    });

    var another = $('jw-save-another');
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
        saveJewellery(payload, 'add-another', form);
        form.reset();
        resetGallery();
        clearDirty();
        window.scrollTo({ top: 0 });
      });
    }

    var archive = $('jw-archive');
    if (archive) {
      archive.addEventListener('click', function () {
        var id = state.record ? state.record.id : 'This piece';
        showAlert('info',
          id + ' — Archive is UI-only for now: nothing was archived or ' +
          'deleted anywhere. The Jewellery Inventory page previews the ' +
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

    state.mode = document.body.getAttribute('data-jewellery-form') || 'add';
    var form = $('ngd-jewellery-form');
    if (!form) return;

    if (state.mode === 'edit') {
      var id = new URLSearchParams(window.location.search).get('id');
      state.record = id ? demoRecord(id) : null;
      if (!state.record) {
        showNotFound(id);
        return;
      }
      $('jw-editing-id').textContent = state.record.id;
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
