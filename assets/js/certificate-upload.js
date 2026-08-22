/* ============================================================
   NEW GROWN DIAMOND — shared admin certificate upload helper
   ------------------------------------------------------------
   One home (window.NGDCertUpload) for everything the Add/Edit
   Diamond and Add/Edit Jewellery consoles need to manage
   uploaded grading certificates in the public
   product-certificates bucket:

     validate(file)            → { ok, reason } (PDF/JPG/PNG/WEBP, ≤10 MB)
     describe(file)            → honest filename / size / kind text
     upload(kind, publicId, f) → { path, url } under
                                 <kind>/<publicId>/<random>.<ext>
                                 (never the original filename)
     ownedPath(url)            → storage path when the URL lives in
                                 OUR bucket, null for external links
     removeOwned(url)          → best-effort delete of an owned file
                                 (external URLs are never touched)
     mapError(error)           → admin-friendly failure copy

   The forms keep the proven image ordering: upload the NEW file
   first, write the database, and only then delete a replaced
   owned file — a failed save deletes the fresh upload instead,
   so no orphans either way. RLS on the bucket (active admins
   write, everyone reads) is the real enforcement.
   ============================================================ */
(function () {
  'use strict';

  var BUCKET = 'product-certificates';
  var MAX_BYTES = 10 * 1024 * 1024;
  var EXT_BY_TYPE = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  var KIND_BY_TYPE = {
    'application/pdf': 'PDF certificate',
    'image/jpeg': 'Image certificate (JPG)',
    'image/png': 'Image certificate (PNG)',
    'image/webp': 'Image certificate (WEBP)'
  };

  function validate(file) {
    if (!file) return { ok: false, reason: 'Choose a certificate file first.' };
    if (!EXT_BY_TYPE[file.type]) {
      return { ok: false, reason: 'Certificates must be PDF, JPG, PNG or WEBP — got ' + (file.type || 'an unknown type') + '.' };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, reason: 'Certificates must be 10 MB or smaller — this file is ' + sizeText(file.size) + '.' };
    }
    return { ok: true };
  }

  function sizeText(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function describe(file) {
    return {
      name: file.name || 'certificate',
      sizeText: sizeText(file.size || 0),
      kindText: KIND_BY_TYPE[file.type] || 'Certificate'
    };
  }

  /** Never the original filename: <kind>/<public_id>/<random>.<ext> */
  function pathFor(kind, publicId, file) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var buf = new Uint32Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
    } else {
      for (var j = 0; j < 16; j++) buf[j] = Math.floor(Math.random() * 4294967296);
    }
    var token = '';
    for (var i = 0; i < 16; i++) token += chars[buf[i] % chars.length];
    return kind + '/' + publicId + '/' + token + '.' + EXT_BY_TYPE[file.type];
  }

  async function upload(kind, publicId, file) {
    var path = pathFor(kind, publicId, file);
    var res = await window.ngdSupabase.storage.from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (res.error) throw res.error;
    return { path: path, url: window.ngdStorageUrl(BUCKET, path) };
  }

  function ownedPath(url) {
    if (!url || !window.ngdStorageUrl) return null;
    /* the bucket's public prefix, derived from a probe path (the helper
       returns '' for an empty path, so ask for one and strip it again) */
    var probe = window.ngdStorageUrl(BUCKET, 'ngd-probe');
    if (!probe || probe.indexOf('ngd-probe') === -1) return null;
    var prefix = probe.slice(0, probe.lastIndexOf('ngd-probe'));
    if (String(url).indexOf(prefix) !== 0) return null;
    var path = String(url).slice(prefix.length).split('?')[0];
    return path || null;
  }

  /** Deletes only files in OUR bucket — external certificate URLs are
      never touched. Best effort: a leftover file is only untidy. */
  async function removeOwned(url) {
    var path = ownedPath(url);
    if (!path) return false;
    try {
      var res = await window.ngdSupabase.storage.from(BUCKET).remove([path]);
      if (res.error) throw res.error;
      return true;
    } catch (error) {
      console.warn('[NGD Certificates] old certificate file could not be removed:', error);
      return false;
    }
  }

  function mapError(error) {
    console.error('[NGD Certificates] upload failed:', error);
    var msg = (error && error.message) || '';
    if ((error && (error.statusCode === '403' || error.status === 403)) ||
      /row-level security|not.?authorized|policy|access denied/i.test(msg)) {
      return 'Your account is not allowed to upload certificates — only an active admin can.';
    }
    if (/bucket.*not.*found/i.test(msg)) {
      return 'The product-certificates bucket does not exist yet — run ' +
        'supabase/product-certificates.sql in the Supabase SQL Editor first.';
    }
    if (/payload too large|exceeded|maximum allowed size/i.test(msg)) {
      return 'The certificate is larger than the 10 MB limit.';
    }
    return 'The certificate could not be uploaded, so nothing was saved. ' +
      'Check your connection and try again.';
  }

  window.NGDCertUpload = {
    BUCKET: BUCKET,
    MAX_BYTES: MAX_BYTES,
    validate: validate,
    describe: describe,
    upload: upload,
    ownedPath: ownedPath,
    removeOwned: removeOwned,
    mapError: mapError
  };
})();
