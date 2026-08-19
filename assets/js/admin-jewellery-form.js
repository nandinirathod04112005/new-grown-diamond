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
   never a hard delete.

   IMAGES are live in both modes, backed by the `jewellery-images`
   Storage bucket + the public.jewellery_images table
   (jewellery_id, image_path, sort_order, is_primary). Files are
   stored under jewellery/<public_id>/<random>.<ext> — never the
   original filename. ADD queues the validated previews and
   uploads them right after the product row is inserted (first /
   starred image becomes primary); EDIT operates on the real
   gallery immediately — upload, set-primary (exactly one), arrow
   reorder writing sort_order, and confirmed delete (row first,
   then the Storage object, then re-electing the first remaining
   image as primary). A failed row insert removes the just
   uploaded file so no orphan is left behind.
   ============================================================ */
(function () {
  'use strict';

  var REQUIRED = ['sku', 'product_name', 'category'];

  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_MAX_BYTES = 5 * 1024 * 1024;
  var IMAGE_BUCKET = 'jewellery-images';
  var EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  var state = {
    mode: 'add',
    userId: null,
    record: null,     /* edit: the verified Supabase row */
    images: [],       /* add: queued {uid, name, sizeLabel, src, file}
                         edit: live {uid, rowId, path, src, name, sortOrder, isPrimary} */
    primaryUid: null,
    nextUid: 1,
    dirty: false,
    saving: false,
    galleryBusy: false
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
    function markFromEvent(event) {
      /* edit-mode gallery uploads save immediately — only field changes
         leave unsaved work behind */
      if (state.mode === 'edit' && event.target && event.target.id === 'jw-file') return;
      markDirty();
    }
    form.addEventListener('input', markFromEvent);
    form.addEventListener('change', markFromEvent);
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
    var result = await window.ngdSupabase.from('jewellery').insert(payload).select('id');
    if (result.error) { if (duplicateError(result.error)) setInvalid(field('sku'), true); showAlert('danger', dbMessage(result.error)); buttons.forEach(function (button) { button.disabled = false; }); return false; }
    clearDirty();

    /* the queued gallery uploads right after the product row exists */
    var queued = state.images.length;
    if (queued) {
      var newId = result.data && result.data[0] && result.data[0].id;
      var outcome = newId
        ? await uploadQueuedImages(newId, payload.public_id)
        : { done: 0, reason: 'the new row could not be read back' };
      if (outcome.done < queued) {
        showAlert('danger', payload.sku + ' was added with ' + outcome.done + ' of ' + queued +
          ' image(s). The rest could not be uploaded — ' + outcome.reason +
          ' Open the piece in Edit Jewellery to add the remaining photos.');
        resetGallery();
        buttons.forEach(function (button) { button.disabled = false; });
        return false;
      }
    }

    if (mode === 'add-another') { showAlert('success', payload.sku + ' was added. The form is ready for another piece.'); form.reset(); resetGallery(); window.scrollTo({ top: 0 }); }
    else { showAlert('success', payload.sku + ' was added to the inventory. Returning to the list…'); window.location.replace('jewellery.html?added=' + encodeURIComponent(payload.sku)); }
    buttons.forEach(function (button) { button.disabled = false; });
    return true;
  }

  /** ADD mode: upload the queued previews in gallery order and insert one
      jewellery_images row per photo. Stops at the first failure so
      sort_order stays contiguous; a row that fails after its upload has
      the fresh Storage file removed again (no orphans). */
  async function uploadQueuedImages(jewelleryId, publicId) {
    var ordered = state.images.slice();
    var primaryUid = state.primaryUid !== null ? state.primaryUid
      : (ordered.length ? ordered[0].uid : null);
    var done = 0;
    for (var i = 0; i < ordered.length; i++) {
      var entry = ordered[i];
      var path = imagePathFor(publicId, entry.file);
      try {
        await uploadImage(path, entry.file);
      } catch (err) {
        return { done: done, reason: mapStorageError(err) };
      }
      var ins = await window.ngdSupabase.from('jewellery_images').insert({
        jewellery_id: jewelleryId,
        image_path: path,
        sort_order: i + 1,
        is_primary: entry.uid === primaryUid
      }).select('id');
      if (ins.error || !ins.data || ins.data.length !== 1) {
        await removeImageQuietly(path);
        console.error('[NGD Admin Jewellery] image row insert failed:', ins.error);
        return { done: done, reason: 'the image row could not be saved.' };
      }
      done++;
    }
    return { done: done, reason: '' };
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

  /* ---------------- Storage upload (jewellery-images bucket) ---------------- */

  /** Never the original filename: jewellery/<public_id>/<random>.<ext> */
  function imagePathFor(publicId, file) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var buf = new Uint32Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
    } else {
      for (var j = 0; j < 16; j++) buf[j] = Math.floor(Math.random() * 4294967296);
    }
    var token = '';
    for (var i = 0; i < 16; i++) token += chars[buf[i] % chars.length];
    return 'jewellery/' + publicId + '/' + token + '.' + (EXT_BY_TYPE[file.type] || 'jpg');
  }

  function mapStorageError(error) {
    console.error('[NGD Admin Jewellery] image upload failed:', error);
    var msg = (error && error.message) || '';
    if ((error && (error.statusCode === '403' || error.status === 403)) ||
      /row-level security|not.?authorized|policy|access denied/i.test(msg)) {
      return 'Your account is not allowed to upload jewellery images — only an active admin can.';
    }
    if (/bucket.*not.*found/i.test(msg)) {
      return 'The jewellery-images bucket does not exist yet — run ' +
        'supabase/jewellery-images.sql in the Supabase SQL Editor first.';
    }
    return 'The image could not be uploaded. Check your connection and try again.';
  }

  async function uploadImage(path, file) {
    var res = await window.ngdSupabase.storage.from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (res.error) throw res.error;
    return path;
  }

  /** Best-effort delete — a leftover file must never block the flow. */
  async function removeImageQuietly(path) {
    if (!path) return;
    try {
      var res = await window.ngdSupabase.storage.from(IMAGE_BUCKET).remove([path]);
      if (res.error) console.warn('[NGD Admin Jewellery] image cleanup failed:', res.error);
    } catch (err) {
      console.warn('[NGD Admin Jewellery] image cleanup failed:', err);
    }
  }

  /* ---------------- live gallery (edit mode) ---------------- */

  async function loadImages(jewelleryId) {
    var res = await window.ngdSupabase.from('jewellery_images')
      .select('id,image_path,sort_order,is_primary')
      .eq('jewellery_id', jewelleryId)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  /** Re-read the piece's gallery from the table — the DB is the truth. */
  async function reloadImages() {
    var rows = await loadImages(state.record.id);
    state.images = rows.map(function (row, idx) {
      return {
        uid: state.nextUid++,
        rowId: row.id,
        path: row.image_path,
        src: window.ngdStorageUrl ? window.ngdStorageUrl(IMAGE_BUCKET, row.image_path) : '',
        name: 'Image ' + (idx + 1),
        sizeLabel: row.is_primary ? 'primary' : '',
        sortOrder: row.sort_order,
        isPrimary: !!row.is_primary,
        file: null
      };
    });
    var primary = state.images.filter(function (e) { return e.isPrimary; })[0];
    state.primaryUid = primary ? primary.uid
      : (state.images.length ? state.images[0].uid : null);
    renderGallery();
  }

  function mapImagesError(error) {
    console.error('[NGD Admin Jewellery] gallery change failed:', error);
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(error.message || ''))) {
      return 'Your account is not allowed to change jewellery images — only an active admin can.';
    }
    if (error && (error.code === '42P01' || /jewellery_images/.test(error.message || ''))) {
      return 'The jewellery_images table is missing — run supabase/jewellery-images.sql in the Supabase SQL Editor first.';
    }
    return 'The gallery change could not be saved. Check your connection and try again.';
  }

  function setGalleryBusy(busy) {
    state.galleryBusy = busy;
    var browse = $('jw-browse');
    if (browse) browse.disabled = busy;
  }

  /** EDIT mode: validated files upload immediately — Storage first, then
      the jewellery_images row (sort_order appended; the very first photo
      of a piece becomes primary). A failed row insert removes the fresh
      file again so no orphan is left. */
  async function uploadEditFiles(files, rejectedNote) {
    setGalleryBusy(true);
    var failed = 0;
    var reason = '';
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var path = imagePathFor(state.record.public_id, file);
      try {
        await uploadImage(path, file);
      } catch (err) {
        failed++; if (!reason) reason = mapStorageError(err);
        continue;
      }
      var nextOrder = state.images.reduce(function (max, e) {
        return Math.max(max, e.sortOrder || 0);
      }, 0) + 1;
      var ins = await window.ngdSupabase.from('jewellery_images').insert({
        jewellery_id: state.record.id,
        image_path: path,
        sort_order: nextOrder,
        is_primary: state.images.length === 0
      }).select('id');
      if (ins.error || !ins.data || ins.data.length !== 1) {
        await removeImageQuietly(path);
        console.error('[NGD Admin Jewellery] image row insert failed:', ins.error);
        failed++; if (!reason) reason = 'the image row could not be saved.';
        continue;
      }
      state.images.push({ uid: state.nextUid++, rowId: ins.data[0].id, path: path, sortOrder: nextOrder, isPrimary: state.images.length === 0 });
    }
    try {
      await reloadImages();
    } catch (err) {
      if (!reason) reason = mapImagesError(err);
    }
    setGalleryBusy(false);
    var notes = [];
    if (rejectedNote) notes.push(rejectedNote);
    if (failed) notes.push(failed + ' image(s) could not be added — ' + reason);
    imageError(notes.join(' '));
  }

  /** EDIT mode: set-primary / reorder / delete write through Supabase and
      the gallery re-reads after every change. */
  async function liveGalleryAction(act, uid) {
    if (state.galleryBusy) return;
    var idx = findImage(uid);
    if (idx === -1) return;
    var entry = state.images[idx];
    var sb = window.ngdSupabase;
    if (act === 'remove' &&
      !window.confirm('Remove this image from ' + (state.record.sku || state.record.public_id) +
        '? The photo will be deleted permanently.')) return;
    imageError('');
    setGalleryBusy(true);
    try {
      if (act === 'primary') {
        /* exactly ONE primary: clear the piece's flags, then set the chosen
           row (the DB's partial unique index enforces the invariant too) */
        var clear = await sb.from('jewellery_images').update({ is_primary: false })
          .eq('jewellery_id', state.record.id).select('id');
        if (clear.error) throw clear.error;
        var set = await sb.from('jewellery_images').update({ is_primary: true })
          .eq('id', entry.rowId).eq('jewellery_id', state.record.id).select('id');
        if (set.error) throw set.error;
        if (!set.data || set.data.length !== 1) throw new Error('primary verification failed');
      } else if (act === 'left' || act === 'right') {
        var target = act === 'left' ? idx - 1 : idx + 1;
        if (target < 0 || target >= state.images.length) { setGalleryBusy(false); return; }
        var order = state.images.slice();
        var moved = order.splice(idx, 1)[0];
        order.splice(target, 0, moved);
        /* renumber 1..N — also heals gaps or duplicate sort values */
        for (var i = 0; i < order.length; i++) {
          if (order[i].sortOrder === i + 1) continue;
          var res = await sb.from('jewellery_images').update({ sort_order: i + 1 })
            .eq('id', order[i].rowId).select('id');
          if (res.error) throw res.error;
        }
      } else if (act === 'remove') {
        /* the row first (a stray Storage file is invisible; a row without
           its file would render broken), then the object, then re-elect
           the first remaining image as primary if needed */
        var del = await sb.from('jewellery_images').delete()
          .eq('id', entry.rowId).eq('jewellery_id', state.record.id).select('id');
        if (del.error) throw del.error;
        if (!del.data || del.data.length !== 1) throw new Error('delete verification failed');
        await removeImageQuietly(entry.path);
        if (entry.isPrimary) {
          var rest = await loadImages(state.record.id);
          if (rest.length) {
            var promote = await sb.from('jewellery_images').update({ is_primary: true })
              .eq('id', rest[0].id).select('id');
            if (promote.error) throw promote.error;
          }
        }
      } else {
        setGalleryBusy(false);
        return;
      }
      await reloadImages();
    } catch (err) {
      imageError(mapImagesError(err));
      try { await reloadImages(); } catch (ignored) { /* keep the message */ }
    }
    setGalleryBusy(false);
  }

  /* ---------------- multi-image gallery UI ---------------- */

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
    if (state.mode === 'edit') {
      liveGalleryAction(act, uid);
      return;
    }
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
    var accepted = [];

    files.forEach(function (file) {
      if (IMAGE_TYPES.indexOf(file.type) === -1) {
        rejected.push(file.name + ' (type isn’t supported — use JPG, JPEG, PNG or WEBP)');
        return;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        rejected.push(file.name + ' (larger than 5 MB)');
        return;
      }
      accepted.push(file);
    });

    var rejectedNote = rejected.length ? 'Not added — ' + rejected.join('; ') + '.' : '';

    /* EDIT: valid files upload to Storage + jewellery_images immediately */
    if (state.mode === 'edit') {
      if (state.galleryBusy) {
        imageError('Please wait — the gallery is still saving the previous change.');
        return;
      }
      if (accepted.length) uploadEditFiles(accepted, rejectedNote);
      else imageError(rejectedNote);
      return;
    }

    /* ADD: valid files queue locally and upload right after the save */
    accepted.forEach(function (file) {
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

    imageError(rejectedNote);
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
      try {
        await reloadImages();
      } catch (err) {
        console.error('[NGD Admin Jewellery] images load failed:', err);
        imageError(mapImagesError(err));
      }
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
