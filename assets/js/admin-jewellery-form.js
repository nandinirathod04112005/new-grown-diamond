/* Admin jewellery add/edit form backed by public.jewellery. Images remain local previews only. */
(function () {
  'use strict';

  var REQUIRED = ['sku', 'product_name', 'category'];
  var EDITABLE = ['sku', 'product_name', 'category', 'subcategory', 'short_description',
    'description', 'metal', 'metal_karat', 'metal_color', 'diamond_weight',
    'diamond_pieces', 'diamond_quality', 'diamond_shape', 'certificate_number',
    'gross_weight', 'size', 'price', 'currency', 'price_visible', 'availability',
    'featured', 'active', 'internal_notes'];
  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  var PUBLIC_ID_PATTERN = /^JEW-[A-Z0-9]{8}$/;
  var state = { mode: 'add', userId: null, record: null, images: [], primaryUid: null,
    nextUid: 1, dirty: false, saving: false };

  function $(id) { return document.getElementById(id); }
  function field(name) { return document.querySelector('[name="' + name + '"]'); }
  function showAlert(type, message) {
    var box = $('jw-alert'); box.innerHTML = '';
    var div = document.createElement('div'); div.className = 'ngd-alert ngd-alert-' + type;
    div.setAttribute('role', type === 'success' ? 'status' : 'alert'); div.textContent = message;
    box.appendChild(div); div.scrollIntoView({ block: 'nearest' });
  }
  function clearAlert() { $('jw-alert').innerHTML = ''; }
  function markDirty() { state.dirty = true; }
  function clearDirty() { state.dirty = false; }
  function setInvalid(el, invalid) {
    if (!el) return; el.classList.toggle('is-invalid', invalid);
    if (invalid) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function numberOk(el) {
    if (el.validity && el.validity.badInput) return false;
    if (el.value.trim() === '') return true;
    var value = Number(el.value); if (!Number.isFinite(value)) return false;
    var min = el.getAttribute('min'), max = el.getAttribute('max');
    if (min !== null && value < Number(min)) return false;
    if (max !== null && value > Number(max)) return false;
    return el.name !== 'diamond_pieces' || Number.isInteger(value);
  }
  function validate(form) {
    var firstBad = null;
    function check(el, ok) { setInvalid(el, !ok); if (!ok && !firstBad) firstBad = el; }
    REQUIRED.forEach(function (name) { var el = field(name); check(el, !!el && el.value.trim() !== ''); });
    ['price', 'diamond_weight', 'gross_weight', 'diamond_pieces'].forEach(function (name) {
      var el = field(name); if (el && !el.classList.contains('is-invalid')) check(el, numberOk(el));
    });
    if (firstBad) firstBad.focus(); return !firstBad;
  }
  function bindLiveClear(form) {
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      ['input', 'change'].forEach(function (eventName) {
        el.addEventListener(eventName, function () { setInvalid(el, false); markDirty(); });
      });
    });
  }
  function generatePublicId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', values = new Uint32Array(8), out = '';
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else for (var j = 0; j < 8; j++) values[j] = Math.floor(Math.random() * 4294967296);
    for (var i = 0; i < values.length; i++) out += chars[values[i] % chars.length];
    return 'JEW-' + out;
  }
  function buildPayload() {
    var payload = {};
    EDITABLE.forEach(function (name) {
      var el = field(name); if (!el) return;
      if (el.type === 'checkbox') payload[name] = el.checked;
      else if (el.type === 'number') payload[name] = el.value.trim() === '' ? null : Number(el.value);
      else payload[name] = el.value.trim() === '' ? null : el.value.trim();
    });
    return payload;
  }
  function duplicateError(error) {
    return error && (error.code === '23505' || /duplicate key|already exists/i.test(error.message || ''));
  }
  function dbMessage(error, action) {
    console.error('[NGD Admin Jewellery] ' + action + ' failed:', error);
    if (duplicateError(error)) return 'That SKU already exists in the inventory — SKUs must be unique.';
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')))
      return 'Your account is not allowed to change jewellery. Only an active admin can perform this action.';
    if (error && (error.code === 'PGRST204' || error.code === '42703'))
      return 'The jewellery table does not match the form. Apply the Jewellery Edit migration and check its columns.';
    return 'Supabase rejected the ' + action + ': ' + ((error && error.message) || 'Please try again.');
  }
  async function skuExists(sku) {
    var query = window.ngdSupabase.from('jewellery').select('id').eq('sku', sku);
    if (state.record) query = query.neq('id', state.record.id);
    var result = await query.limit(1);
    if (result.error) throw result.error;
    return !!(result.data && result.data.length);
  }
  async function save(form, addAnother) {
    if (state.saving) return false;
    clearAlert();
    if (!validate(form)) { showAlert('danger', 'Please correct the highlighted required or numeric fields.'); return false; }
    var payload = buildPayload(); form.setAttribute('data-ngd-payload', JSON.stringify(payload));
    state.saving = true; $('jw-submit').disabled = true;
    try {
      if (await skuExists(payload.sku)) {
        setInvalid(field('sku'), true); field('sku').focus();
        showAlert('danger', payload.sku + ' already exists in the inventory — SKUs must be unique.'); return false;
      }
      if (state.mode === 'edit') {
        payload.updated_at = new Date().toISOString();
        var updated = await window.ngdSupabase.from('jewellery').update(payload)
          .eq('id', state.record.id).eq('public_id', state.record.public_id).select('id,sku').maybeSingle();
        if (updated.error) throw updated.error;
        if (!updated.data) { showNotFound(state.record.public_id); return false; }
        clearDirty(); showAlert('success', payload.sku + ' was updated successfully.'); return true;
      }
      payload.public_id = generatePublicId(); payload.created_by = state.userId;
      var inserted = await window.ngdSupabase.from('jewellery').insert(payload);
      if (inserted.error) throw inserted.error;
      clearDirty();
      if (addAnother) { showAlert('success', payload.sku + ' was added. The form is ready for another piece.'); form.reset(); resetGallery(); }
      else { window.location.replace('jewellery.html?added=' + encodeURIComponent(payload.sku)); }
      return true;
    } catch (error) {
      if (duplicateError(error)) setInvalid(field('sku'), true);
      showAlert('danger', dbMessage(error, state.mode === 'edit' ? 'update' : 'save')); return false;
    } finally { state.saving = false; $('jw-submit').disabled = false; }
  }
  function prefill(record) {
    EDITABLE.forEach(function (name) {
      var el = field(name); if (!el) return;
      if (el.type === 'checkbox') el.checked = !!record[name];
      else el.value = record[name] === null || record[name] === undefined ? '' : record[name];
    });
  }
  function showNotFound(id) {
    $('jw-form-wrap').hidden = true; $('jw-notfound').hidden = false;
    $('jw-notfound-id').textContent = id || '(missing or invalid id)';
  }
  async function loadRecord(publicId) {
    var result = await window.ngdSupabase.from('jewellery').select('*').eq('public_id', publicId).maybeSingle();
    if (result.error) throw result.error; return result.data;
  }
  async function archive() {
    if (!state.record || state.saving || !window.confirm('Archive ' + state.record.sku + '? It will be deactivated and removed from the normal inventory list.')) return;
    state.saving = true; $('jw-archive').disabled = true;
    var timestamp = new Date().toISOString();
    try {
      var result = await window.ngdSupabase.from('jewellery')
        .update({ archived_at: timestamp, active: false, updated_at: timestamp })
        .eq('id', state.record.id).eq('public_id', state.record.public_id).select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) { showNotFound(state.record.public_id); return; }
      clearDirty(); window.location.replace('jewellery.html?archived=' + encodeURIComponent(state.record.sku));
    } catch (error) { showAlert('danger', dbMessage(error, 'archive')); }
    finally { state.saving = false; $('jw-archive').disabled = false; }
  }

  /* Existing image UI remains a local-only preview; no Storage work is performed. */
  function imageError(message) { var box = $('jw-image-error'); box.textContent = message || ''; box.hidden = !message; }
  function renderGallery() {
    var wrap = $('jw-gallery-wrap'), grid = $('jw-gallery'); grid.innerHTML = ''; wrap.hidden = !state.images.length;
    state.images.forEach(function (img, index) {
      var tile = document.createElement('figure'); tile.className = 'ngd-img-tile';
      var frame = document.createElement('div'); frame.className = 'ngd-img-tile-frame';
      var image = document.createElement('img'); image.src = img.src; image.alt = 'Preview of ' + img.name; frame.appendChild(image);
      var caption = document.createElement('figcaption'); caption.className = 'ngd-img-tile-name'; caption.textContent = img.name;
      var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ngd-btn ngd-btn-outline ngd-btn-sm'; remove.textContent = 'Remove';
      remove.addEventListener('click', function () { state.images.splice(index, 1); markDirty(); renderGallery(); });
      tile.appendChild(frame); tile.appendChild(caption); tile.appendChild(remove); grid.appendChild(tile);
    });
  }
  function addFiles(fileList) {
    Array.prototype.slice.call(fileList || []).forEach(function (file) {
      if (IMAGE_TYPES.indexOf(file.type) < 0 || file.size > IMAGE_MAX_BYTES) { imageError('Use JPG, PNG or WEBP files no larger than 10 MB.'); return; }
      var reader = new FileReader(); reader.onload = function () { state.images.push({ name: file.name, src: String(reader.result) }); renderGallery(); markDirty(); }; reader.readAsDataURL(file);
    });
  }
  function resetGallery() { state.images = []; $('jw-file').value = ''; imageError(''); renderGallery(); }
  function initImagePicker() {
    var drop = $('jw-drop'), input = $('jw-file');
    $('jw-browse').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (name) { drop.addEventListener(name, function (event) { event.preventDefault(); }); });
    drop.addEventListener('drop', function (event) { addFiles(event.dataTransfer && event.dataTransfer.files); });
  }
  function initButtons(form) {
    form.addEventListener('submit', function (event) { event.preventDefault(); save(form, false); });
    var another = $('jw-save-another'); if (another) another.addEventListener('click', function () { save(form, true); });
    var archiveButton = $('jw-archive'); if (archiveButton) archiveButton.addEventListener('click', archive);
  }
  async function init() {
    var auth = await window.NGDAuth.requireAdmin(); if (!auth) return;
    state.userId = auth.user.id; state.mode = document.body.getAttribute('data-jewellery-form') || 'add';
    var form = $('ngd-jewellery-form'); if (!form) return;
    if (state.mode === 'edit') {
      var publicId = new URLSearchParams(window.location.search).get('id');
      if (!publicId || !PUBLIC_ID_PATTERN.test(publicId)) { showNotFound(publicId); return; }
      try { state.record = await loadRecord(publicId); }
      catch (error) { showAlert('danger', dbMessage(error, 'load')); showNotFound(publicId); return; }
      if (!state.record) { showNotFound(publicId); return; }
      $('jw-editing-id').textContent = state.record.public_id; prefill(state.record);
    }
    initImagePicker(); bindLiveClear(form); initButtons(form);
    window.addEventListener('beforeunload', function (event) { if (!state.dirty) return; event.preventDefault(); event.returnValue = ''; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
