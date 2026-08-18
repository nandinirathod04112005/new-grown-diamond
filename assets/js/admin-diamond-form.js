/* ============================================================
   NEW GROWN DIAMOND — ADMIN ADD / EDIT DIAMOND FORM (STEP 32)
   ------------------------------------------------------------
   One controller powers both pages, selected by
   <body data-diamond-form="add|edit">. Guarded by requireAdmin().

   ADD is LIVE: a valid submit inserts the row into
   public.diamonds through the shared Supabase client — field
   names ARE the table columns. The controller generates a
   unique public_id (DIA-XXXXXXXX), stamps created_by with the
   signed-in admin's user id, rejects duplicate stock numbers
   (pre-checked, and the database unique constraint is handled
   too), maps real Supabase errors to safe messages, and on
   success redirects back to the inventory, which re-reads the
   table so the new stone appears in the real list.

   EDIT stays an honest demo until the Edit step: it prefills
   from the demo catalogue and says plainly that updating is not
   wired yet. The image picker previews locally only — Storage
   uploads arrive in a later phase.
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['stock_number', 'shape', 'carat', 'color', 'clarity', 'cut',
    'laboratory', 'availability'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 5 * 1024 * 1024;

  var state = {
    mode: 'add',
    userId: null,     /* the signed-in admin (created_by) */
    record: null,     /* edit: the demo record being edited */
    imageFile: null,  /* validated File selected for upload */
    dirty: false,
    saving: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function field(name) {
    return document.querySelector('[name="' + name + '"]');
  }

  /* ---------------- demo record (edit mode only) ---------------- */

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

  function demoCommercials(d) {
    var base = { D: 1350, E: 1250, F: 1150, G: 1050, H: 950 }[d.colour] || 900;
    var perCarat = Math.round(base + d.carat * 220);
    return {
      price_per_carat: perCarat,
      total_price: Math.round(perCarat * d.carat),
      currency: 'USD',
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

  /* ---------------- payload ---------------- */

  /** Unique storefront id, e.g. DIA-7K2M9XQ4 (unambiguous charset). */
  function generatePublicId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var buf = new Uint32Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
    } else {
      for (var j = 0; j < 8; j++) buf[j] = Math.floor(Math.random() * 4294967296);
    }
    for (var i = 0; i < 8; i++) out += chars[buf[i] % chars.length];
    return 'DIA-' + out;
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
    }
    return payload;
  }

  /* ---------------- real Supabase errors → safe messages ---------------- */

  function isDuplicateError(error) {
    return error && (error.code === '23505' ||
      /duplicate key|already exists/i.test(error.message || ''));
  }

  function mapDbError(error) {
    console.error('[NGD Add Diamond] insert failed:', error);
    if (!error) return 'Saving failed. Please try again.';
    var msg = error.message || '';
    if (isDuplicateError(error)) {
      return 'That stock number already exists in the inventory — stock numbers must be unique.';
    }
    if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) {
      return 'Your account is not allowed to add diamonds — only an active admin can (enforced by Row Level Security).';
    }
    if (error.code === 'PGRST204' || error.code === '42703') {
      return 'The diamonds table does not match the form (' + msg + '). Check the column names in Supabase.';
    }
    if (/failed to fetch|networkerror|fetch failed|load failed/i.test(msg) || error.code === '') {
      return 'Could not reach Supabase — check your connection and try again. Nothing was saved.';
    }
    return 'Supabase rejected the save: ' + msg;
  }

  /* ---------------- live add/edit save + Storage upload ---------------- */

  function safeExtension(file) {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  }

  function randomToken() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function uploadImage(publicId) {
    if (!state.imageFile) return null;
    var safeId = String(publicId).replace(/[^A-Za-z0-9_-]/g, '-');
    var path = 'diamonds/' + safeId + '/' + randomToken() + '.' + safeExtension(state.imageFile);
    var uploaded = await window.ngdSupabase.storage.from(window.NGDDiamondImages.bucket)
      .upload(path, state.imageFile, { cacheControl: '3600', upsert: false, contentType: state.imageFile.type });
    if (uploaded.error) throw new Error('Image upload failed: ' + uploaded.error.message);
    return path;
  }

  async function removeUploaded(path) {
    if (!path) return;
    var result = await window.ngdSupabase.storage.from(window.NGDDiamondImages.bucket).remove([path]);
    if (result.error) console.error('[NGD Diamond Image] cleanup failed:', result.error);
  }

  async function saveDiamond(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var sb = window.ngdSupabase;
    var label = payload.stock_number;
    var oldPath = state.record && state.record.image_path;
    var publicId = (state.record ? state.record.public_id : payload.public_id) || label;
    var newPath = null;

    if (state.mode === 'add') {
      var existing = await sb.from('diamonds').select('id').eq('stock_number', label).limit(1);
      if (!existing.error && existing.data && existing.data.length) {
        showAlert('danger', label + ' already exists in the inventory — stock numbers must be unique.');
        setInvalid(field('stock_number'), true);
        return false;
      }
    }

    try {
      newPath = await uploadImage(publicId);
    } catch (uploadError) {
      showAlert('danger', uploadError.message + '. Nothing was changed and the previous image is still in place.');
      return false;
    }
    if (newPath) payload.image_path = newPath;

    var query = state.mode === 'edit'
      ? sb.from('diamonds').update(payload).eq('id', state.record.id)
      : sb.from('diamonds').insert(payload);
    var res = await query;
    if (res.error) {
      await removeUploaded(newPath); // never leave an orphan when the row save fails
      showAlert('danger', mapDbError(res.error));
      return false;
    }

    // Replacement ordering is intentional: upload -> database update -> old delete.
    if (newPath && oldPath && oldPath !== newPath) await removeUploaded(oldPath);
    clearDirty();
    if (mode === 'add-another') {
      showAlert('success', label + ' was added. The form has been cleared for the next stone.');
      form.reset(); resetImage(); window.scrollTo({ top: 0 });
    } else {
      showAlert('success', label + (state.mode === 'edit' ? ' was updated' : ' was added') + '. Returning to the list…');
      window.location.replace('diamonds.html?' + (state.mode === 'edit' ? 'updated=' : 'added=') + encodeURIComponent(label));
    }
    return true;
  }

  /* ---------------- validated image picker ---------------- */

  function imageError(message) {
    var box = $('dia-image-error');
    box.textContent = message || '';
    box.hidden = !message;
  }

  function inputReset() {
    var input = $('dia-file');
    if (input) input.value = '';
  }

  function acceptFile(file) {
    if (!file) return;
    if (IMAGE_TYPES.indexOf(file.type) === -1) {
      state.imageFile = null;
      inputReset();
      imageError('That file type isn’t supported — use JPG, JPEG, PNG or WEBP.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      state.imageFile = null;
      inputReset();
      imageError('That image is larger than 5 MB — please choose a smaller file.');
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

  /* ---------------- edit-mode database prefill ---------------- */

  function prefillRow(record) {
    Object.keys(record).forEach(function (name) {
      var el = field(name);
      if (!el || record[name] == null) return;
      if (el.type === 'checkbox') el.checked = !!record[name];
      else el.value = record[name];
    });
    var artBox = $('dia-current-art');
    if (artBox) artBox.innerHTML = window.NGDDiamondImages.picture(
      record.image_path, record.shape,
      (record.stock_number || record.public_id) + ' diamond', 'ngd-dia-preview');
  }

  function prefill(record) {
    var extras = demoCommercials(record);
    var values = {
      stock_number: record.id,
      report_number: record.report,
      shape: record.shape,
      carat: record.carat,
      color: record.colour,
      clarity: record.clarity,
      cut: record.cut,
      polish: record.polish,
      symmetry: record.symmetry,
      fluorescence: record.fluorescence,
      laboratory: record.lab,
      certificate_number: record.report,
      certificate_url: extras.certificate_url,
      measurements: record.measurements,
      depth_percentage: record.depthPct,
      table_percentage: record.tablePct,
      ratio: record.ratio,
      growth_method: record.growth,
      location: record.growth === 'CVD' ? 'Surat atelier' : 'Mumbai vault',
      availability: record.availability,
      price_per_carat: extras.price_per_carat,
      total_price: extras.total_price,
      currency: extras.currency,
      internal_notes: extras.internal_notes
    };
    Object.keys(values).forEach(function (name) {
      var el = field(name);
      if (el && values[name] != null) el.value = values[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;
    field('price_visible').checked = false;

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

  function setSaving(saving, label) {
    state.saving = saving;
    var btn = $('dia-submit');
    if (!btn) return;
    btn.disabled = saving;
    btn.textContent = saving ? 'Saving…' : label;
    var another = $('dia-save-another');
    if (another) another.disabled = saving;
  }

  function initButtons(form) {
    var submitLabel = state.mode === 'edit' ? 'Update Diamond' : 'Save Diamond';

    async function runAdd(mode) {
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
        await saveDiamond(payload, mode, form);
      } catch (err) {
        showAlert('danger', mapDbError(err));
      }
      setSaving(false, submitLabel);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (state.saving) return;

      runAdd(state.mode === 'edit' ? 'edit' : 'add');
    });

    var another = $('dia-save-another');
    if (another) {
      another.addEventListener('click', function () {
        if (!state.saving) runAdd('add-another');
      });
    }

    var archive = $('dia-archive');
    if (archive) {
      archive.addEventListener('click', function () {
        var id = state.record ? state.record.id : 'This diamond';
        showAlert('info',
          id + ' — Archive is UI-only for now: nothing was archived or ' +
          'deleted anywhere. The real action arrives with the Edit step.');
      });
    }
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return; // a redirect is already happening

    state.userId = res.user.id;
    state.mode = document.body.getAttribute('data-diamond-form') || 'add';
    var form = $('ngd-diamond-form');
    if (!form) return;

    if (state.mode === 'edit') {
      var id = new URLSearchParams(window.location.search).get('id');
      var found = id ? await window.ngdSupabase.from('diamonds').select('*')
        .or('stock_number.eq.' + id + ',public_id.eq.' + id).limit(1) : { data: [] };
      if (found.error || !found.data || !found.data[0]) {
        showNotFound(id);
        return;
      }
      state.record = found.data[0];
      $('dia-editing-id').textContent = state.record.stock_number || state.record.public_id;
      prefillRow(state.record);
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
