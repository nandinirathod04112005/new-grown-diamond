/* ============================================================
   NEW GROWN DIAMOND — SHARED JEWELLERY CARD RENDERER
   ------------------------------------------------------------
   Renders the light atelier card used by the jewellery listing
   grid and the details page's "Similar pieces" section. View
   Details links to jewellery-details.html?id=<public_id> for
   live rows (publicId), falling back to the display id for the
   demo cards still used on the homepage section.
   ============================================================ */
(function () {
  'use strict';

  /* Live rows come from the database — escape everything interpolated. */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function artFor(p) {
    /* live rows carry image_path (the piece's primary photo in Supabase
       Storage, bucket jewellery-images); demo pieces fall back to the
       category art, as does anything without a usable URL */
    if (p.image_path && window.ngdStorageUrl) {
      var url = window.ngdStorageUrl('jewellery-images', p.image_path);
      if (url) {
        return '<img class="ngd-media-photo" src="' + esc(url) + '" alt="' +
          esc(p.name) + '" loading="lazy">';
      }
    }
    var art = window.NGD_JEWEL_ART || {};
    return art[String(p.category || '').toLowerCase()] || '';
  }

  function availBadge(p) {
    var cls = p.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return '<span class="ngd-avail ' + cls + '">' + esc(p.availability) + '</span>';
  }

  function detailsUrl(p) {
    return 'jewellery-details.html?id=' + encodeURIComponent(p.publicId || p.id);
  }

  function cardHtml(p) {
    var weight = p.weightCt !== null && p.weightCt !== undefined
      ? '<span class="ngd-weight-chip">' + Number(p.weightCt).toFixed(2) + ' ct diamonds</span>'
      : '';
    return (
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-3">' +
      '<article class="ngd-card ngd-card-3d ngd-jewel-card h-100" data-ngd-tilt ' +
      'data-jewellery-id="' + esc(p.id) + '" data-category="' + esc(String(p.category || '').toLowerCase()) + '">' +
      '<div class="ngd-jewel-media">' +
      '<div class="ngd-jewel-figure">' + artFor(p) + '</div>' +
      '</div>' +
      '<div class="ngd-jewel-body">' +
      '<p class="ngd-jewel-cat">' + esc(p.category) + '</p>' +
      '<h3 class="ngd-jewel-name">' + esc(p.name) + '</h3>' +
      '<p class="ngd-jewel-desc">' + esc(p.description) + '</p>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3">' +
      availBadge(p) + weight +
      '</div>' +
      '<a class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-btn-block" href="' + detailsUrl(p) + '">View Details</a>' +
      '</div></article></div>'
    );
  }

  window.NGDJewelCard = {
    esc: esc,
    artFor: artFor,
    availBadge: availBadge,
    detailsUrl: detailsUrl,
    cardHtml: cardHtml
  };
})();
