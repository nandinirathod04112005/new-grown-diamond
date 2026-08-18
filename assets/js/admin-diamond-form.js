/* New Grown Diamond — live admin Add / Edit diamond controller. */
(function () {
  'use strict';

  var REQUIRED = ['stock_number', 'shape', 'carat', 'color', 'clarity', 'cut',
    'laboratory', 'availability'];
  var PUBLIC_ID_PATTERN = /^DIA-[A-Z0-9]{8}$/;
  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  var state = { mode: 'add', userId: null, record: null, imageFile: null,
    dirty: false, saving: false };

  function $(id) { return document.getElementById(id); }
  function field(name) { return document.querySelector('[name="' + name + '"]'); }
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
  function clearAlert() { $('dia-alert').innerHTML = ''; }
  function setInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle('is-invalid', invalid);
    if (invalid) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }
  function numberOk(el) {
    if (el.value.trim() === '') return !el.required;
    var value = Number(el.value);
    if (!Number.isFinite(value)) return false;
    var min = el.getAttribute('min');
    var max = el.getAttribute('max');
    return !(min !== null && value < Number(min)) && !(max !== null && value > Number(max));
  }
  function validate(form) {
    var firstBad = null;
    function check(el, ok) {
      setInvalid(el, !ok);
      if (!ok && !firstBad) firstBad = el;
    }
    REQUIRED.forEach(function (name) {
      var el = field(name);
      check(el, el.type === 'number' ? numberOk(el) : el.value.trim() !== '');
    });
    form.querySelectorAll('input[type="number"]').forEach(function (el) {
      if (!el.classList.contains('is-invalid')) check(el, numberOk(el));
    });
    var url = field('certificate_url');
    if (url && url.value.trim()) check(url, /^https?:\/\/\S+$/i.test(url.value.trim()));
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function generatePublicId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var values = new Uint32Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else values.forEach(function (_v, i) { values[i] = Math.floor(Math.random() * 0xffffffff); });
    return 'DIA-' + Array.from(values).map(function (v) { return chars[v % chars.length]; }).join('');
  }
  function formValues(form) {
    var payload = {};
    form.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') payload[el.name] = el.checked;
      else if (el.type === 'number') payload[el.name] = el.value === '' ? null : Number(el.value);
      else payload[el.name] = el.value.trim() === '' ? null : el.value.trim();
    });
    return payload;
  }
  function isDuplicate(error) {
    return error && (error.code === '23505' || /duplicate key|already exists/i.test(error.message || ''));
  }
  function isNetwork(error) {
    return error && /failed to fetch|networkerror|fetch failed|load failed/i.test(error.message || '');
  }
  function safeError(error, action) {
    console.error('[NGD Diamond] ' + action + ' failed:', error);
    if (isDuplicate(error)) return 'That stock number already exists — stock numbers must be unique.';
    if (isNetwork(error)) return 'Could not reach the inventory service. Check your connection and try again.';
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(error.message || ''))) {
      return 'Your account is not permitted to change diamonds.';
    }
    return 'The diamond could not be ' + action + '. Please try again.';
  }
  async function duplicateStock(stock, excludePublicId) {
    var query = window.ngdSupabase.from('diamonds').select('public_id').eq('stock_number', stock).limit(1);
    if (excludePublicId) query = query.neq('public_id', excludePublicId);
    var result = await query;
    if (result.error) throw result.error;
    return result.data && result.data.length > 0;
  }
  function setSaving(saving) {
    state.saving = saving;
    var button = $('dia-submit');
    button.disabled = saving;
    button.textContent = saving ? 'Saving…' : (state.mode === 'edit' ? 'Update Diamond' : 'Save Diamond');
    var another = $('dia-save-another');
    if (another) another.disabled = saving;
    var archive = $('dia-archive');
    if (archive) archive.disabled = saving;
  }
  function clearDirty() { state.dirty = false; }

  async function save(form, addAnother) {
    clearAlert();
    if (!validate(form)) {
      showAlert('danger', 'Please complete the highlighted fields with valid values.');
      return;
    }
    var payload = formValues(form);
    if (state.mode === 'edit' && state.record.active !== false && payload.active === false &&
      !window.confirm('Deactivate ' + (state.record.stock_number || state.record.public_id) +
        '? Customers will no longer see it.')) return;
    form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    setSaving(true);
    try {
      var duplicate = await duplicateStock(payload.stock_number,
        state.mode === 'edit' ? state.record.public_id : null);
      if (duplicate) {
        setInvalid(field('stock_number'), true);
        field('stock_number').focus();
        showAlert('danger', 'That stock number already exists — stock numbers must be unique.');
        return;
      }
      var result;
      if (state.mode === 'edit') {
        payload.updated_at = new Date().toISOString();
        result = await window.ngdSupabase.from('diamonds').update(payload)
          .eq('public_id', state.record.public_id).is('archived_at', null).select('public_id');
        if (!result.error && (!result.data || result.data.length !== 1)) {
          showNotFound(state.record.public_id);
          return;
        }
      } else {
        payload.public_id = generatePublicId();
        payload.created_by = state.userId;
        result = await window.ngdSupabase.from('diamonds').insert(payload).select('public_id');
      }
      if (result.error) throw result.error;
      clearDirty();
      if (state.mode === 'edit') {
        showAlert('success', payload.stock_number + ' was updated successfully. Returning to the inventory…');
        window.setTimeout(function () {
          window.location.replace('diamonds.html?updated=' + encodeURIComponent(payload.stock_number));
        }, 500);
      } else if (addAnother) {
        showAlert('success', payload.stock_number + ' was added. The form is ready for another diamond.');
        form.reset(); resetImage(); window.scrollTo({ top: 0 });
      } else {
        window.location.replace('diamonds.html?added=' + encodeURIComponent(payload.stock_number));
      }
    } catch (error) {
      if (isDuplicate(error)) setInvalid(field('stock_number'), true);
      showAlert('danger', safeError(error, state.mode === 'edit' ? 'updated' : 'saved'));
    } finally {
      setSaving(false);
    }
  }

  function prefill(record) {
    Object.keys(record).forEach(function (name) {
      var el = field(name);
      if (!el || record[name] == null) return;
      if (el.type === 'checkbox') el.checked = !!record[name];
      else el.value = record[name];
    });
    ['featured', 'active', 'price_visible'].forEach(function (name) {
      var el = field(name); if (el) el.checked = !!record[name];
    });
    var art = $('dia-current-art');
    if (art) art.innerHTML = (window.NGD_GEM_ART || {})[String(record.shape || '').toLowerCase()] || '';
  }
  function showNotFound(id) {
    $('dia-form-wrap').hidden = true;
    $('dia-notfound').hidden = false;
    $('dia-notfound-id').textContent = id || '(no id)';
  }
  async function loadEdit(publicId) {
    var result = await window.ngdSupabase.from('diamonds').select('*')
      .eq('public_id', publicId).is('archived_at', null).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }
  async function archiveDiamond() {
    if (!state.record || state.saving) return;
    if (!window.confirm('Archive ' + state.record.stock_number + '? It will be deactivated and removed from the normal inventory.')) return;
    setSaving(true);
    try {
      var now = new Date().toISOString();
      var result = await window.ngdSupabase.from('diamonds')
        .update({ archived_at: now, active: false, updated_at: now })
        .eq('public_id', state.record.public_id).is('archived_at', null).select('public_id');
      if (result.error) throw result.error;
      if (!result.data || result.data.length !== 1) { showNotFound(state.record.public_id); return; }
      clearDirty();
      showAlert('success', state.record.stock_number + ' was archived. Returning to the inventory…');
      window.setTimeout(function () { window.location.replace('diamonds.html?archived=1'); }, 500);
    } catch (error) { showAlert('danger', safeError(error, 'archived')); }
    finally { setSaving(false); }
  }

  function imageError(message) { var box = $('dia-image-error'); box.textContent = message || ''; box.hidden = !message; }
  function resetImage() {
    state.imageFile = null; $('dia-file').value = ''; $('dia-preview-img').removeAttribute('src');
    $('dia-preview').hidden = true; $('dia-drop').hidden = false; imageError('');
  }
  function acceptFile(file) {
    if (!file) return;
    if (IMAGE_TYPES.indexOf(file.type) < 0) return imageError('Use a JPG, PNG or WEBP image.');
    if (file.size > IMAGE_MAX_BYTES) return imageError('Choose an image smaller than 10 MB.');
    imageError(''); state.imageFile = file; state.dirty = true;
    var reader = new FileReader();
    reader.onload = function () { $('dia-preview-img').src = String(reader.result); $('dia-preview-name').textContent = file.name;
      $('dia-drop').hidden = true; $('dia-preview').hidden = false; };
    reader.readAsDataURL(file);
  }
  function initImagePicker() {
    var drop = $('dia-drop'), input = $('dia-file');
    $('dia-browse').onclick = $('dia-replace').onclick = function () { input.click(); };
    $('dia-remove').onclick = function () { resetImage(); state.dirty = true; };
    input.onchange = function () { acceptFile(input.files && input.files[0]); };
    ['dragenter', 'dragover'].forEach(function (event) { drop.addEventListener(event, function (e) { e.preventDefault(); drop.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (event) { drop.addEventListener(event, function (e) { e.preventDefault(); drop.classList.remove('is-drag'); }); });
    drop.addEventListener('drop', function (e) { acceptFile(e.dataTransfer && e.dataTransfer.files[0]); });
  }
  function bind(form) {
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      ['input', 'change'].forEach(function (event) { el.addEventListener(event, function () { setInvalid(el, false); state.dirty = true; }); });
    });
    form.addEventListener('submit', function (event) { event.preventDefault(); if (!state.saving) save(form, false); });
    var another = $('dia-save-another'); if (another) another.onclick = function () { if (!state.saving) save(form, true); };
    var archive = $('dia-archive'); if (archive) archive.onclick = archiveDiamond;
    window.addEventListener('beforeunload', function (event) { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  }
  async function init() {
    var auth = await window.NGDAuth.requireAdmin();
    if (!auth) return;
    state.userId = auth.user.id;
    state.mode = document.body.getAttribute('data-diamond-form') || 'add';
    var form = $('ngd-diamond-form'); if (!form) return;
    if (state.mode === 'edit') {
      var publicId = new URLSearchParams(window.location.search).get('id');
      if (!publicId || !PUBLIC_ID_PATTERN.test(publicId)) { showNotFound(publicId); return; }
      try { state.record = await loadEdit(publicId); }
      catch (error) { showAlert('danger', safeError(error, 'loaded')); $('dia-form-wrap').hidden = true; return; }
      if (!state.record) { showNotFound(publicId); return; }
      $('dia-editing-id').textContent = state.record.stock_number || state.record.public_id;
      prefill(state.record);
    }
    initImagePicker(); bind(form);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
