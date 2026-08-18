/* ============================================================
   NEW GROWN DIAMOND — SHARED JEWELLERY CARD RENDERER
   ------------------------------------------------------------
   Renders the light atelier card used by the jewellery listing
   grid and the details page's "Similar pieces" section. View
   Details links to jewellery-details.html?id=<sku> — the same
   URL pattern the future Supabase-backed pages will use.
   ============================================================ */
(function () {
  'use strict';

  function artFor(p) {
    if (p.primaryImage) {
      return '<img class="ngd-jewel-photo" src="' + p.primaryImage + '" alt="' +
        String(p.name || 'Jewellery').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" loading="lazy">';
    }
    var art = window.NGD_JEWEL_ART || {};
    return art[p.category.toLowerCase()] || '';
  }

  function availBadge(p) {
    var cls = p.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return '<span class="ngd-avail ' + cls + '">' + p.availability + '</span>';
  }

  function detailsUrl(p) {
    return 'jewellery-details.html?id=' + encodeURIComponent(p.id);
  }

  function cardHtml(p) {
    var weight = p.weightCt !== null
      ? '<span class="ngd-weight-chip">' + p.weightCt.toFixed(2) + ' ct diamonds</span>'
      : '';
    return (
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-3">' +
      '<article class="ngd-card ngd-card-3d ngd-jewel-card h-100" data-ngd-tilt ' +
      'data-jewellery-id="' + p.id + '" data-category="' + p.category.toLowerCase() + '">' +
      '<div class="ngd-jewel-media">' +
      '<div class="ngd-jewel-figure">' + artFor(p) + '</div>' +
      '</div>' +
      '<div class="ngd-jewel-body">' +
      '<p class="ngd-jewel-cat">' + p.category + '</p>' +
      '<h3 class="ngd-jewel-name">' + p.name + '</h3>' +
      '<p class="ngd-jewel-desc">' + p.description + '</p>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3">' +
      availBadge(p) + weight +
      '</div>' +
      '<a class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-btn-block" href="' + detailsUrl(p) + '">View Details</a>' +
      '</div></article></div>'
    );
  }

  window.NGDJewelCard = {
    artFor: artFor,
    availBadge: availBadge,
    detailsUrl: detailsUrl,
    cardHtml: cardHtml
  };
})();
