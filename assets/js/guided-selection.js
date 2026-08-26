/* ============================================================
   NEW GROWN DIAMOND — GUIDED SELECTION (homepage panel)
   ------------------------------------------------------------
   A premium doorway into the Smart Diamond Finder: the four
   selects build the finder's own shareable-link vocabulary
   (shape / minCarat / maxCarat / clarity), and the finder
   restores the selections and runs the search on arrival.
   Navigation goes through the shared page-transition engine.
   Test API: window.NGDGuided = { buildUrl }.
   ============================================================ */
(function () {
  'use strict';

  var form = document.querySelector('[data-ngd-guided]');
  if (!form) return;

  var shapeEl = document.getElementById('gs-shape');
  var fromEl = document.getElementById('gs-carat-from');
  var toEl = document.getElementById('gs-carat-to');
  var clarityEl = document.getElementById('gs-clarity');

  function buildUrl() {
    var params = new URLSearchParams();
    if (shapeEl.value) params.set('shape', shapeEl.value);
    if (fromEl.value) params.set('minCarat', fromEl.value);
    if (toEl.value) params.set('maxCarat', toEl.value);
    if (clarityEl.value) params.set('clarity', clarityEl.value);
    var qs = params.toString();
    return 'diamond-finder.html' + (qs ? '?' + qs : '');
  }

  /* keep the carat range sane: "to" never sits below "from" */
  function fixRange() {
    var from = parseFloat(fromEl.value);
    var to = parseFloat(toEl.value);
    if (!(from > to)) return;
    var options = Array.prototype.slice.call(toEl.options);
    for (var i = 0; i < options.length; i++) {
      if (parseFloat(options[i].value || options[i].text) >= from) {
        toEl.value = options[i].value || options[i].text;
        return;
      }
    }
    toEl.value = options[options.length - 1].value || options[options.length - 1].text;
  }
  fromEl.addEventListener('change', fixRange);
  toEl.addEventListener('change', fixRange);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var url = buildUrl();
    if (window.NGDPageTransitions && typeof window.NGDPageTransitions.navigate === 'function') {
      window.NGDPageTransitions.navigate(url);
    } else {
      window.location.href = url;
    }
  });

  window.NGDGuided = { buildUrl: buildUrl };
})();
