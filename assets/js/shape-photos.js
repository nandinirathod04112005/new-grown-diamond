/* ============================================================
   NEW GROWN DIAMOND — SHAPE CARD PHOTOGRAPHS
   ------------------------------------------------------------
   Each Cut Collection card prefers a real photographed stone
   over its line-art: drop cutouts at

     assets/images/shapes/<shape>.webp   (round, oval, emerald,
     pear, princess, cushion, radiant, marquise)

   and the matching card swaps automatically. The Round card
   falls back to the hero photograph (the shipped round
   brilliant), so it always carries a real stone. Cards without
   a photograph keep the engraved line-art — nothing fake.
   ============================================================ */
(function () {
  'use strict';

  var cards = document.querySelectorAll('#diamond-shapes .ngd-shape-card');
  if (!cards.length) return;

  var FALLBACK = { round: 'assets/images/hero/hero-diamond.webp' };

  cards.forEach(function (card) {
    var key = '';
    try {
      key = (new URL(card.href, window.location.href).searchParams.get('shape') || '').toLowerCase();
    } catch (e) { /* leave the line-art */ }
    if (!key) return;
    var media = card.querySelector('.ngd-shape-media');
    if (!media) return;

    var candidates = ['assets/images/shapes/' + key + '.webp'];
    if (FALLBACK[key]) candidates.push(FALLBACK[key]);

    (function tryNext(index) {
      if (index >= candidates.length) return;
      var img = new Image();
      img.onload = function () {
        img.className = 'ngd-shape-photo';
        img.alt = '';
        img.decoding = 'async';
        media.appendChild(img);
        media.classList.add('has-photo');
      };
      img.onerror = function () { tryNext(index + 1); };
      img.src = candidates[index];
    })(0);
  });
})();
