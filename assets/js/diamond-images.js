/* Shared Supabase Storage helpers for the single diamond product image. */
(function () {
  'use strict';

  var BUCKET = 'diamond-images';
  var FALLBACK = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">' +
    '<rect width="640" height="480" fill="#f4f0e7"/>' +
    '<path d="M320 105 449 218 320 375 191 218Z" fill="#fff" stroke="#b48c47" stroke-width="9"/>' +
    '<path d="m191 218 79-72 50 229 50-229 79 72H191Zm79-72 50 72 50-72" fill="none" stroke="#d1b675" stroke-width="7"/>' +
    '<text x="320" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#716959">Image coming soon</text></svg>');

  function url(path) {
    if (!path || !window.ngdSupabase) return FALLBACK;
    var result = window.ngdSupabase.storage.from(BUCKET).getPublicUrl(path);
    return result && result.data && result.data.publicUrl ? result.data.publicUrl : FALLBACK;
  }

  function extension(file) {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  }

  function randomName() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function path(publicId, file) {
    return 'diamonds/' + String(publicId).replace(/[^A-Z0-9-]/gi, '') + '/' + randomName() + '.' + extension(file);
  }

  window.NGDDiamondImages = { bucket: BUCKET, fallback: FALLBACK, url: url, path: path };
}());
