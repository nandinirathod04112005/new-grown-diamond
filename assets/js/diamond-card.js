/* ============================================================
   NEW GROWN DIAMOND — SHARED DIAMOND CARD RENDERER
   ------------------------------------------------------------
   Renders the dark showcase card used by the inventory grid and
   the details page's "Similar stones" section. View Details
   links to diamond-details.html?id=<stock id> — the same URL
   pattern the future Supabase-backed pages will use.
   ============================================================ */
(function () {
  'use strict';

  function artFor(d) {
    var art = window.NGD_GEM_ART || {};
    return art[d.shape.toLowerCase()] || art.round || '';
  }

  function availBadge(d) {
    var cls = d.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return '<span class="ngd-avail ' + cls + '">' + d.availability + '</span>';
  }

  function detailsUrl(d) {
    return 'diamond-details.html?id=' + encodeURIComponent(d.id);
  }

  function cardHtml(d) {
    return (
      '<div class="col-12 col-md-6 col-xl-4">' +
      '<article class="ngd-card ngd-card-dark ngd-card-3d ngd-diamond-card h-100" data-ngd-tilt data-diamond-id="' + d.id + '">' +
      '<div class="ngd-diamond-media ngd-depth-1">' + artFor(d) + '</div>' +
      '<div class="ngd-diamond-body">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2">' +
      '<h3 class="ngd-diamond-title">' + d.shape + '</h3>' +
      '<span class="ngd-diamond-carat">' + d.carat.toFixed(2) + ' ct</span>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-1">' +
      '<span class="ngd-stock-no">' + d.id + '</span>' + availBadge(d) +
      '</div>' +
      '<dl class="ngd-diamond-specs">' +
      '<div><dt>Shape</dt><dd>' + d.shape + '</dd></div>' +
      '<div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + d.colour + '</dd></div>' +
      '<div><dt>Clarity</dt><dd>' + d.clarity + '</dd></div>' +
      '<div><dt>Cut</dt><dd>' + d.cut + '</dd></div>' +
      '<div><dt>Laboratory</dt><dd>' + d.lab + '</dd></div>' +
      '</dl>' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm ngd-btn-block" href="' + detailsUrl(d) + '">View Details</a>' +
      '</div></article></div>'
    );
  }

  window.NGDDiamondCard = {
    artFor: artFor,
    availBadge: availBadge,
    detailsUrl: detailsUrl,
    cardHtml: cardHtml
  };
})();
