/* Shared, read-only helpers for jewellery images stored in Supabase Storage. */
(function () {
  'use strict';
  var BUCKET = 'jewellery-images';
  function publicUrl(path) {
    if (!path || !window.ngdSupabase) return '';
    return window.ngdSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  function primary(images) {
    images = (images || []).slice().sort(function (a, b) {
      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
    return images.filter(function (image) { return image.is_primary; })[0] || images[0] || null;
  }
  window.NGDJewelleryImages = { bucket: BUCKET, publicUrl: publicUrl, primary: primary };
})();
