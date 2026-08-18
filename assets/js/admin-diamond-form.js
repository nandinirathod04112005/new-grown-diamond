/* ============================================================
   NEW GROWN DIAMOND — ADMIN ADD / EDIT DIAMOND FORM (STEP 5)
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

   EDIT loads and updates a single row by its immutable public_id.
   The image picker remains preview-only; image upload is outside
   this step.
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['stock_number', 'shape', 'carat', 'color', 'clarity', 'cut',
    'laboratory', 'availability'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;

  var state = {
    mode: 'add',
    userId: null,     /* the signed-in admin (created_by) */
    record: null,     /* edit: the verified Supabase row */
    imageFile: null,  /* File selected for preview (never uploaded) */
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
    } else {
      payload.updated_at = new Date().toISOString();
    }
    return payload;
  }

  /* ---------------- real Supabase errors → safe messages ---------------- */

  function isDuplicateError(error) {
    return error && (error.code === '23505' ||
      /duplicate key|already exists/i.test(error.message || ''));
  }

  function mapDbError(error) {
    console.error('[NGD Admin Diamond] save failed:', error);
    if (!error) return 'Saving failed. Please try again.';
    var msg = error.message || '';
    if (isDuplicateError(error)) {
      return 'That stock number already exists in the inventory — stock numbers must be unique.';
    }
    if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) {
      return 'Your account is not allowed to change diamonds. Only an active admin can do that.';
    }
    if (error.code === 'PGRST204' || error.code === '42703') {
      return 'The inventory could not accept this change. Please contact an administrator.';
    }
    if (/failed to fetch|networkerror|fetch failed|load failed/i.test(msg) || error.code === '') {
      return 'Could not reach Supabase — check your connection and try again. Nothing was saved.';
    }
    return 'The diamond could not be saved. Please review the form and try again.';
  }

  async function updateDiamond(payload, form) {
    var sb = window.ngdSupabase;
    var duplicate = await sb.from('diamonds').select('id, public_id')
      .eq('stock_number', payload.stock_number).limit(2);
    if (duplicate.error) throw duplicate.error;
    if ((duplicate.data || []).some(function (row) { return row.id !== state.record.id; })) {
      setInvalid(field('stock_number'), true);
      field('stock_number').focus();
      showAlert('danger', 'That stock number already exists in the inventory — stock numbers must be unique.');
      return false;
    }

    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var res = await sb.from('diamonds').update(payload)
      .eq('public_id', state.record.public_id).eq('id', state.record.id).select('id');
    if (res.error) {
      if (isDuplicateError(res.error)) setInvalid(field('stock_number'), true);
      showAlert('danger', mapDbError(res.error));
      return false;
    }
    if (!res.data || res.data.length !== 1) {
      showAlert('danger', 'This diamond no longer exists or could not be verified. Nothing was changed.');
      return false;
    }
    state.record = Object.assign({}, state.record, payload);
    clearDirty();
    showAlert('success', payload.stock_number + ' was updated successfully.');
    return true;
  }

  /* ---------------- the live save (add mode) ---------------- */

  async function saveDiamond(payload, mode, form) {
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    var sb = window.ngdSupabase;
    var label = payload.stock_number;

    /* friendly duplicate check first (the DB unique constraint is the
       real enforcement — a race still surfaces as 23505 below) */
    var existing = await sb.from('diamonds')
      .select('id')
      .eq('stock_number', label)
      .limit(1);
    if (!existing.error && existing.data && existing.data.length > 0) {
      showAlert('danger',
        label + ' already exists in the inventory — stock numbers must be unique.');
      var stockEl = field('stock_number');
      setInvalid(stockEl, true);
      stockEl.focus();
      return false;
    }

    var res = await sb.from('diamonds').insert(payload);
    if (res.error) {
      if (isDuplicateError(res.error)) setInvalid(field('stock_number'), true);
      showAlert('danger', mapDbError(res.error));
      return false;
    }

    clearDirty();
    if (mode === 'add-another') {
      showAlert('success',
        label + ' was added to the inventory (' + payload.public_id + '). ' +
        'The form has been cleared for the next stone.');
      form.reset();
      resetImage();
      window.scrollTo({ top: 0 });
    } else {
      showAlert('success', label + ' was added to the inventory. Returning to the list…');
      window.location.replace('diamonds.html?added=' + encodeURIComponent(label));
    }
    return true;
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

  /* ---------------- edit-mode live load + prefill ---------------- */

  function prefill(record) {
    var values = record;
    Object.keys(values).forEach(function (name) {
      var el = field(name);
      if (el && values[name] != null) el.value = values[name];
    });
    field('featured').checked = !!record.featured;
    field('active').checked = !!record.active;
    field('price_visible').checked = !!record.price_visible;

    var artBox = $('dia-current-art');
    if (artBox) {
      artBox.innerHTML = (window.NGD_GEM_ART || {})[String(record.shape).toLowerCase()] || '';
    }
  }

  function showNotFound(id) {
    $('dia-form-wrap').hidden = true;
    $('dia-notfound').hidden = false;
    $('dia-notfound-id').textContent = id || '(missing id)';
  }

  async function loadEditRecord(publicId) {
    var res = await window.ngdSupabase.from('diamonds').select('*')
      .eq('public_id', publicId).limit(2);
    if (res.error) throw res.error;
    return res.data && res.data.length === 1 ? res.data[0] : null;
  }

  async function archiveDiamond() {
    if (!window.confirm('Archive ' + state.record.stock_number + '? It will be deactivated and removed from the normal inventory list.')) return;
    setSaving(true, 'Update Diamond');
    try {
      var res = await window.ngdSupabase.from('diamonds').update({
        archived_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString()
      }).eq('public_id', state.record.public_id).eq('id', state.record.id).select('id');
      if (res.error) throw res.error;
      if (!res.data || res.data.length !== 1) throw new Error('record verification failed');
      clearDirty();
      showAlert('success', state.record.stock_number + ' was archived. Returning to the inventory…');
      window.location.replace('diamonds.html?archived=' + encodeURIComponent(state.record.stock_number));
    } catch (err) {
      showAlert('danger', mapDbError(err));
      setSaving(false, 'Update Diamond');
    }
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

      if (state.mode === 'edit') {
        clearAlert();
        if (!validate(form)) {
          showAlert('danger',
            'Please complete the highlighted fields — required values and ' +
            'number ranges are marked inline.');
          return;
        }
        var payload = buildPayload(form);
        setSaving(true, submitLabel);
        updateDiamond(payload, form).catch(function (err) {
          showAlert('danger', mapDbError(err));
        }).finally(function () { setSaving(false, submitLabel); });
        return;
      }

      runAdd('add');
    });

    var another = $('dia-save-another');
    if (another) {
      another.addEventListener('click', function () {
        if (!state.saving) runAdd('add-another');
      });
    }

    var archive = $('dia-archive');
    if (archive) {
      archive.addEventListener('click', archiveDiamond);
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
      if (!id || !/^DIA-[A-Z0-9]{8}$/i.test(id)) {
        showNotFound(id);
        return;
      }
      try {
        state.record = await loadEditRecord(id);
      } catch (err) {
        console.error('[NGD Admin Diamond] load failed:', err);
        showAlert('danger', 'The diamond could not be loaded. Check your connection and try again.');
        $('dia-form-wrap').hidden = true;
        return;
      }
      if (!state.record) {
        showNotFound(id);
        return;
      }
      $('dia-editing-id').textContent = state.record.stock_number;
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
