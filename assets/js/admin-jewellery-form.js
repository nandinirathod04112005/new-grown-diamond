/* ============================================================
   NEW GROWN DIAMOND — ADMIN ADD / EDIT JEWELLERY FORM (LIVE)
   ------------------------------------------------------------
   One controller powers both pages, selected by
   <body data-jewellery-form="add|edit">. Guarded by requireAdmin().

   ADD is live: it validates the form, rejects duplicate SKUs,
   generates JEW-XXXXXXXX, stamps the authenticated admin id and
   inserts into public.jewellery.

   EDIT loads and updates a single row by its immutable public_id
   (edit-jewellery.html?id=JEW-XXXXXXXX): every column prefills,
   a save PATCHes the row (with updated_at) and verifies exactly
   one record changed, duplicate SKUs are rejected excluding the
   piece itself, and Archive soft-deletes — archived_at + inactive,
   never a hard delete. The image picker stays a local preview;
   jewellery photo uploads are a later phase.
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['sku', 'product_name', 'category'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;

  var state = {
    mode: 'add',
    userId: null,
    record: null,     /* edit: the verified Supabase row */
    images: [],       /* ordered gallery: {uid, name, sizeLabel, src, file} */
    primaryUid: null,
    nextUid: 1,
    dirty: false,
    saving: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function field(name) {
    return document.querySelector('[name="' + name + '"]');
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
    if (el.validity && el.validity.badInput) return false;
    if (el.value.trim() === '') return !el.required;
    var v = parseFloat(el.value);
    if (!isFinite(v)) return false;
    var min = el.getAttribute('min');
    var max = el.getAttribute('max');
    if (min !== null && v < parseFloat(min)) return false;
    if (max !== null && v > parseFloat(max)) return false;
    if (el.name === 'diamond_pieces' && !Number.isInteger(v)) return false;
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

  /* ---------------- live Supabase save (add + edit) ---------------- */

  function generatePublicId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var values = new Uint32Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else for (var j = 0; j < values.length; j++) values[j] = Math.floor(Math.random() * 4294967296);
    var id = ''; for (var i = 0; i < values.length; i++) id += chars[values[i] % chars.length];
    return 'JEW-' + id;
  }

  function buildPayload(form) {
    var payload = {};
    form.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') payload[el.name] = el.checked;
      else if (el.type === 'number') payload[el.name] = el.value === '' ? null : parseFloat(el.value);
      else payload[el.name] = el.value.trim() === '' ? null : el.value.trim();
    });
    if (state.mode === 'add') {
      payload.public_id = generatePublicId();
      payload.created_by = state.userId;
    } else {
      payload.updated_at = new Date().toISOString();
    }
    return payload;
  }

  /* Database errors are converted into useful, non-sensitive messages. */
  function duplicateError(error) {
    return error && (error.code === '23505' || /duplicate key|already exists/i.test(error.message || ''));
  }

  function dbMessage(error) {
    console.error('[NGD Admin Jewellery] save failed:', error);
    if (duplicateError(error)) return 'That SKU already exists in the inventory — SKUs must be unique.';
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')))
      return 'Your account is not allowed to change jewellery — only an active admin can (enforced by Row Level Security).';
    if (error && (error.code === 'PGRST204' || error.code === '42703'))
      return 'The jewellery table does not match the form. Check its column names in Supabase.';
    return 'Supabase rejected the save: ' + ((error && error.message) || 'Please check your connection and try again.');
  }

  function setSaving(saving, label) {
    state.saving = saving;
    var btn = $('jw-submit');
    if (btn) {
      btn.disabled = saving;
      btn.textContent = saving ? 'Saving…' : label;
    }
    var another = $('jw-save-another');
    if (another) another.disabled = saving;
    var archive = $('jw-archive');
    if (archive) archive.disabled = saving;
  }

  async function saveJewellery(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var buttons = [$('jw-submit'), $('jw-save-another')].filter(Boolean);
    buttons.forEach(function (button) { button.disabled = true; });
    var existing = await window.ngdSupabase.from('jewellery').select('id').ilike('sku', payload.sku).limit(1);
    if (!existing.error && existing.data && existing.data.length) {
      setInvalid(field('sku'), true); field('sku').focus(); showAlert('danger', payload.sku + ' already exists in the inventory — SKUs must be unique.');
      buttons.forEach(function (button) { button.disabled = false; }); return false;
    }
    var result = await window.ngdSupabase.from('jewellery').insert(payload);
    if (result.error) { if (duplicateError(result.error)) setInvalid(field('sku'), true); showAlert('danger', dbMessage(result.error)); buttons.forEach(function (button) { button.disabled = false; }); return false; }
    clearDirty();
    if (mode === 'add-another') { showAlert('success', payload.sku + ' was added. The form is ready for another piece.'); form.reset(); resetGallery(); window.scrollTo({ top: 0 }); }
    else { showAlert('success', payload.sku + ' was added to the inventory. Returning to the list…'); window.location.replace('jewellery.html?added=' + encodeURIComponent(payload.sku)); }
    buttons.forEach(function (button) { button.disabled = false; });
    return true;
  }

  /* ---------------- live update + soft archive (edit mode) ---------------- */

  async function updateJewellery(payload, form) {
    var sb = window.ngdSupabase;
    /* duplicate SKU check that ignores the piece being edited (the
       case-insensitive unique index is the real enforcement) */
    var duplicate = await sb.from('jewellery').select('id')
      .ilike('sku', payload.sku).limit(2);
    if (duplicate.error) throw duplicate.error;
    if ((duplicate.data || []).some(function (row) { return row.id !== state.record.id; })) {
      setInvalid(field('sku'), true);
      field('sku').focus();
      showAlert('danger', payload.sku + ' already exists in the inventory — SKUs must be unique.');
      return false;
    }

    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var res = await sb.from('jewellery').update(payload)
      .eq('public_id', state.record.public_id).eq('id', state.record.id).select('id');
    if (res.error) {
      if (duplicateError(res.error)) setInvalid(field('sku'), true);
      showAlert('danger', dbMessage(res.error));
      return false;
    }
    if (!res.data || res.data.length !== 1) {
      showAlert('danger', 'This piece no longer exists or could not be verified. Nothing was changed.');
      return false;
    }
    state.record = Object.assign({}, state.record, payload);
    clearDirty();
    showAlert('success', payload.sku + ' was updated successfully. Returning to the inventory…');
    window.setTimeout(function () {
      window.location.replace('jewellery.html?updated=' + encodeURIComponent(payload.sku));
    }, 700);
    return true;
  }

  /** Soft delete only: stamps archived_at + deactivates. Never a hard DELETE. */
  async function archiveJewellery() {
    if (!window.confirm('Archive ' + state.record.sku + '? It will be deactivated and removed from the normal inventory list.')) return;
    setSaving(true, 'Update Jewellery');
    try {
      var res = await window.ngdSupabase.from('jewellery').update({
        archived_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString()
      }).eq('public_id', state.record.public_id).eq('id', state.record.id).select('id');
      if (res.error) throw res.error;
      if (!res.data || res.data.length !== 1) throw new Error('record verification failed');
      clearDirty();
      showAlert('success', state.record.sku + ' was archived. Returning to the inventory…');
      window.location.replace('jewellery.html?archived=' + encodeURIComponent(state.record.sku));
    } catch (err) {
      showAlert('danger', dbMessage(err));
      setSaving(false, 'Update Jewellery');
    }
  }

  async function loadEditRecord(publicId) {
    var res = await window.ngdSupabase.from('jewellery').select('*')
      .eq('public_id', publicId).limit(2);
    if (res.error) throw res.error;
    return res.data && res.data.length === 1 ? res.data[0] : null;
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

  /* ---------------- edit-mode prefill (live row) ---------------- */

  function prefill(record) {
    Object.keys(record).forEach(function (name) {
      var el = field(name);
      if (el && el.type !== 'checkbox' && record[name] != null) el.value = record[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;
    field('price_visible').checked = !!record.price_visible;
  }

  function showNotFound(id) {
    $('jw-form-wrap').hidden = true;
    $('jw-notfound').hidden = false;
    $('jw-notfound-id').textContent = id || '(no id)';
  }

  /* ---------------- boot ---------------- */

  function initButtons(form) {
    var submitLabel = state.mode === 'edit' ? 'Update Jewellery' : 'Save Jewellery';

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (state.saving) return;
      clearAlert();
      if (!validate(form)) {
        showAlert('danger',
          'Please complete the highlighted fields — required values and ' +
          'number ranges are marked inline.');
        return;
      }
      var payload = buildPayload(form);
      setSaving(true, submitLabel);
      try {
        if (state.mode === 'edit') await updateJewellery(payload, form);
        else await saveJewellery(payload, 'add', form);
      } catch (err) {
        showAlert('danger', dbMessage(err));
      }
      setSaving(false, submitLabel);
    });

    var another = $('jw-save-another');
    if (another) {
      another.addEventListener('click', async function () {
        if (state.saving) return;
        clearAlert();
        if (!validate(form)) {
          showAlert('danger',
            'Please complete the highlighted fields — required values and ' +
            'number ranges are marked inline.');
          return;
        }
        var payload = buildPayload(form);
        setSaving(true, submitLabel);
        try {
          await saveJewellery(payload, 'add-another', form);
        } catch (err) {
          showAlert('danger', dbMessage(err));
        }
        setSaving(false, submitLabel);
      });
    }

    var archive = $('jw-archive');
    if (archive) {
      archive.addEventListener('click', function () {
        if (!state.saving) archiveJewellery();
      });
    }
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening
    state.userId = res.user.id;

    var fullName = (res.profile.full_name || '').trim();
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) {
      el.textContent = fullName ? fullName.split(/\s+/)[0] : 'there';
    });

    state.mode = document.body.getAttribute('data-jewellery-form') || 'add';
    var form = $('ngd-jewellery-form');
    if (!form) return;

    if (state.mode === 'edit') {
      var id = new URLSearchParams(window.location.search).get('id');
      if (!id || !/^JEW-[A-Z0-9]{8}$/i.test(id)) {
        showNotFound(id);
        return;
      }
      try {
        state.record = await loadEditRecord(id);
      } catch (err) {
        console.error('[NGD Admin Jewellery] load failed:', err);
        showAlert('danger', 'The piece could not be loaded. Check your connection and try again.');
        $('jw-form-wrap').hidden = true;
        return;
      }
      if (!state.record) {
        showNotFound(id);
        return;
      }
      $('jw-editing-id').textContent = state.record.sku || state.record.public_id;
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
