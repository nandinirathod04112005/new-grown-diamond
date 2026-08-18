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
    if (el.getAttribute('step') === '1' && !Number.isInteger(v)) return false;
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
    if (Object.prototype.hasOwnProperty.call(payload, 'price_visible')) {
      payload.price_visible = payload.price_visible === null ? null : payload.price_visible === 'true';
    }
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

  /** Persist a validated add/edit payload; RLS remains authoritative. */
  async function saveJewellery(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    delete payload.images;
    payload.updated_at = new Date().toISOString();
    var query = mode === 'edit'
      ? window.ngdSupabase.from('jewellery').update(payload).eq('public_id', state.record.public_id).select('public_id').maybeSingle()
      : window.ngdSupabase.from('jewellery').insert(payload).select('public_id').single();
    var result = await query;
    if (result.error) {
      var duplicate = result.error.code === '23505';
      showAlert('danger', duplicate
        ? 'That SKU is already in use. Enter a unique SKU and try again.'
        : 'Jewellery could not be saved. ' + (result.error.message || 'Please try again.'));
      return false;
    }
    if (!result.data) {
      showAlert('danger', 'Jewellery could not be saved. The product may no longer exist.');
      return false;
    }
    state.record = Object.assign({}, state.record || {}, payload, { public_id: result.data.public_id });
    showAlert('success', (payload.sku || 'Jewellery') + ' was saved successfully.');
    clearDirty();
    return true;
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
    var values = {
      sku: record.sku,
      product_name: record.product_name,
      category: record.category,
      subcategory: record.subcategory,
      short_description: record.short_description,
      description: record.description,
      metal: record.metal,
      metal_karat: record.metal_karat,
      metal_color: record.metal_color,
      gross_weight: record.gross_weight,
      diamond_weight: record.diamond_weight,
      diamond_pieces: record.diamond_pieces,
      diamond_quality: record.diamond_quality,
      diamond_shape: record.diamond_shape,
      certificate_number: record.certificate_number,
      size: record.size,
      price: record.price,
      currency: record.currency,
      price_visible: record.price_visible == null ? null : String(record.price_visible),
      internal_notes: record.internal_notes,
      availability: record.availability
    };
    Object.keys(values).forEach(function (name) {
      var el = field(name);
      if (el && values[name] != null) el.value = values[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;

    /* Image management is deliberately outside this phase. */
  }

  function showNotFound(id) {
    $('jw-form-wrap').hidden = true;
    $('jw-notfound').hidden = false;
    $('jw-notfound-id').textContent = id || '(no id)';
  }

  /* ---------------- boot ---------------- */

  function initButtons(form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearAlert();
      if (!validate(form)) {
        showAlert('danger',
          'Please complete the highlighted fields — required values and ' +
          'number ranges are marked inline.');
        return;
      }
      var payload = buildPayload(form);
      var submit = $('jw-submit');
      submit.disabled = true;
      await saveJewellery(payload, state.mode === 'edit' ? 'edit' : 'add', form);
      submit.disabled = false;
    });

    var another = $('jw-save-another');
    if (another) {
      another.addEventListener('click', async function () {
        clearAlert();
        if (!validate(form)) {
          showAlert('danger',
            'Please complete the highlighted fields — required values and ' +
            'number ranges are marked inline.');
          return;
        }
        var payload = buildPayload(form);
        another.disabled = true;
        var saved = await saveJewellery(payload, 'add-another', form);
        another.disabled = false;
        if (!saved) return;
        form.reset();
        resetGallery();
        clearDirty();
        window.scrollTo({ top: 0 });
      });
    }

    var archive = $('jw-archive');
    if (archive) {
      archive.addEventListener('click', async function () {
        if (!window.confirm('Archive this jewellery product? It will be removed from the normal inventory.')) return;
        archive.disabled = true;
        var result = await window.ngdSupabase.from('jewellery').update({
          active: false, archived_at: new Date().toISOString(), updated_at: new Date().toISOString()
        }).eq('public_id', state.record.public_id).select('public_id').maybeSingle();
        archive.disabled = false;
        if (result.error || !result.data) {
          showAlert('danger', 'Jewellery could not be archived. ' + ((result.error && result.error.message) || 'The product may no longer exist.'));
          return;
        }
        clearDirty();
        window.location.href = 'jewellery.html';
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
      var id = (new URLSearchParams(window.location.search).get('id') || '').trim();
      var validId = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(id);
      var loaded = validId
        ? await window.ngdSupabase.from('jewellery').select('*').eq('public_id', id).maybeSingle()
        : { data: null, error: null };
      state.record = loaded.data;
      if (!state.record) {
        showNotFound(id);
        if (loaded.error) showAlert('danger', 'Jewellery could not be loaded. ' + loaded.error.message);
        return;
      }
      $('jw-editing-id').textContent = state.record.public_id;
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
