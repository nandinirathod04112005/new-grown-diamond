/* ============================================================
   NEW GROWN DIAMOND — SHARED DIAMOND CARD RENDERER
   ------------------------------------------------------------
   Renders the dark showcase card used by the inventory grid and
   the details page's "Similar stones" section. View Details
   links to diamond-details.html?id=<public_id> for live rows
   (publicId), falling back to the row's display id for the
   demo cards still used on the homepage sections.
   ============================================================ */
(function () {
  'use strict';

  /* Live rows come from the database — escape everything interpolated. */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function artFor(d) {
    /* live rows carry image_path (Supabase Storage); demo rows fall back
       to the gold gem art, as does anything without a usable URL */
    if (d.image_path && window.ngdStorageUrl) {
      var url = window.ngdStorageUrl('diamond-images', d.image_path);
      if (url) {
        return '<img class="ngd-media-photo" src="' + esc(url) + '" alt="' +
          esc(d.shape) + ' lab-grown diamond" loading="lazy">';
      }
    }
    var art = window.NGD_GEM_ART || {};
    return art[String(d.shape || '').toLowerCase()] || art.round || '';
  }

  function availBadge(d) {
    var cls = d.availability === 'In Stock' ? 'ngd-avail-stock' : 'ngd-avail-request';
    return '<span class="ngd-avail ' + cls + '">' + esc(d.availability) + '</span>';
  }

  function detailsUrl(d) {
    return 'diamond-details.html?id=' + encodeURIComponent(d.publicId || d.id);
  }

  /* Compare toggle — only on pages that load the shared compare state
     (assets/js/diamond-compare.js) and only for live rows with a public
     id. Rendered with its CURRENT state so re-renders (filters,
     pagination) stay honest; behaviour is delegated to the compare
     module, so nothing here can break the card's own links. */
  function compareToggleHtml(d) {
    var compare = window.NGDDiamondCompare;
    if (!compare || !d.publicId) return '';
    var on = compare.has(d.publicId);
    return '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm ngd-cmp-toggle' +
      (on ? ' is-on' : '') + '" data-ngd-compare="' + esc(d.publicId) +
      '" data-off-label="Compare" data-on-label="✓ Added" aria-pressed="' + (on ? 'true' : 'false') +
      '" aria-label="Compare ' + esc(d.shape) + ' ' + d.carat.toFixed(2) + ' ct (' + esc(d.id) + ')">' +
      (on ? '✓ Added' : 'Compare') + '</button>';
  }

  function cardHtml(d) {
    return (
      '<div class="col-12 col-md-6 col-xl-4">' +
      '<article class="ngd-card ngd-card-dark ngd-card-3d ngd-diamond-card h-100" data-ngd-tilt data-diamond-id="' + esc(d.id) + '">' +
      '<div class="ngd-diamond-media ngd-depth-1">' + artFor(d) + '</div>' +
      '<div class="ngd-diamond-body">' +
      '<div class="d-flex justify-content-between align-items-baseline gap-2">' +
      '<h3 class="ngd-diamond-title">' + esc(d.shape) + '</h3>' +
      '<span class="ngd-diamond-carat">' + d.carat.toFixed(2) + ' ct</span>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-1">' +
      '<span class="ngd-stock-no">' + esc(d.id) + '</span>' + availBadge(d) +
      '</div>' +
      '<dl class="ngd-diamond-specs">' +
      '<div><dt>Shape</dt><dd>' + esc(d.shape) + '</dd></div>' +
      '<div><dt>Carat</dt><dd>' + d.carat.toFixed(2) + '</dd></div>' +
      '<div><dt>Colour</dt><dd>' + esc(d.colour) + '</dd></div>' +
      '<div><dt>Clarity</dt><dd>' + esc(d.clarity) + '</dd></div>' +
      '<div><dt>Cut</dt><dd>' + esc(d.cut) + '</dd></div>' +
      '<div><dt>Laboratory</dt><dd>' + esc(d.lab) + '</dd></div>' +
      '</dl>' +
      '<div class="d-flex gap-2 ngd-cmp-cardrow">' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm flex-grow-1" href="' + detailsUrl(d) + '">View Details</a>' +
      compareToggleHtml(d) +
      '</div>' +
      '</div></article></div>'
    );
  }

  window.NGDDiamondCard = {
    esc: esc,
    artFor: artFor,
    availBadge: availBadge,
    detailsUrl: detailsUrl,
    cardHtml: cardHtml
  };
})();
