/* Shared Supabase Storage helpers for the single diamond product image. */
(function () {
  'use strict';

  var BUCKET = 'diamond-images';

  function publicUrl(path) {
    if (!path || !window.ngdSupabase) return '';
    return window.ngdSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function fallback(shape) {
    return (window.NGD_GEM_ART || {})[String(shape || '').toLowerCase()] ||
      '<svg viewBox="0 0 160 110" role="img" aria-label="Diamond image unavailable"><polygon points="80,15 132,48 80,96 28,48" fill="#f2ecdc" stroke="#b48c47"/><text x="80" y="105" text-anchor="middle" font-size="8" fill="#6e6e76">Image unavailable</text></svg>';
  }

  function picture(path, shape, alt, className) {
    var url = publicUrl(path);
    if (!url) return fallback(shape);
    var img = document.createElement('img');
    img.src = url;
    img.alt = alt || 'Diamond product image';
    img.className = className || 'ngd-diamond-image';
    img.loading = 'lazy';
    return img.outerHTML;
  }

  window.NGDDiamondImages = { bucket: BUCKET, publicUrl: publicUrl, fallback: fallback, picture: picture };
})();
