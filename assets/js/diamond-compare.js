/* ============================================================
   NEW GROWN DIAMOND — shared diamond compare state
   ------------------------------------------------------------
   One source of truth for the customer's compare selection,
   used by the inventory grid, the details page and
   compare-diamonds.html.

   localStorage holds ONLY public diamond ids (max 4):
     ngdDiamondCompare = ["DIA-XXXXXXXX", …]
   Never product objects, prices, tokens or anything private —
   Supabase stays the source of truth for actual diamond data,
   and the stored list is re-validated on every read.

   The module also renders the floating compare bar (hidden at
   zero selections, Compare Now active from two), keeps every
   [data-ngd-compare] toggle's pressed state in sync — including
   across browser tabs via the storage event — and exposes:

     window.NGDDiamondCompare
       .list() .count() .has(id) .add(id) .remove(id)
       .toggle(id) .clear() .onChange(fn) .refresh()
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ngdDiamondCompare';
  var MAX = 4;
  var ID_RE = /^DIA-[A-Z0-9]{8}$/;
  var listeners = [];
  var messageTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* Every read re-validates: only well-formed public ids survive,
     deduplicated, capped at MAX — tampered storage can't hurt us. */
  function read() {
    var out = [];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(raw)) return out;
      var seen = {};
      raw.forEach(function (id) {
        if (typeof id !== 'string') return;
        var normalized = id.trim().toUpperCase();
        if (ID_RE.test(normalized) && !seen[normalized] && out.length < MAX) {
          seen[normalized] = true;
          out.push(normalized);
        }
      });
    } catch (_error) { /* unreadable storage = empty selection */ }
    return out;
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (_error) { /* private mode — selection lives for this page only */ }
    notify();
  }

  function notify() {
    refresh();
    var list = read();
    listeners.forEach(function (fn) {
      try { fn(list); } catch (error) { console.error('[NGD Compare] listener failed', error); }
    });
  }

  function normalize(id) {
    return String(id == null ? '' : id).trim().toUpperCase();
  }

  var api = {
    MAX: MAX,
    list: read,
    count: function () { return read().length; },
    has: function (id) { return read().indexOf(normalize(id)) !== -1; },
    add: function (id) {
      var normalized = normalize(id);
      if (!ID_RE.test(normalized)) return { ok: false, on: false, reason: 'invalid' };
      var list = read();
      if (list.indexOf(normalized) !== -1) return { ok: true, on: true };
      if (list.length >= MAX) return { ok: false, on: false, reason: 'full' };
      list.push(normalized);
      write(list);
      return { ok: true, on: true };
    },
    remove: function (id) {
      var normalized = normalize(id);
      var list = read().filter(function (item) { return item !== normalized; });
      write(list);
      return { ok: true, on: false };
    },
    toggle: function (id) {
      return api.has(id) ? api.remove(id) : api.add(id);
    },
    clear: function () { write([]); },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    refresh: function () { refresh(); }
  };
  window.NGDDiamondCompare = api;

  /* ---- pressed-state sync for every toggle on the page ---- */
  function syncToggles(list) {
    document.querySelectorAll('[data-ngd-compare]').forEach(function (button) {
      var on = list.indexOf(normalize(button.getAttribute('data-ngd-compare'))) !== -1;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', String(on));
      var label = button.getAttribute(on ? 'data-on-label' : 'data-off-label');
      if (label) button.textContent = label;
    });
  }

  /* ---- floating compare bar (not on the compare page itself) ---- */
  var bar = null;

  function root() { return window.NGD_SITE_ROOT || './'; }

  function buildBar() {
    if (bar || document.body.hasAttribute('data-ngd-compare-page')) return;
    bar = document.createElement('div');
    bar.id = 'ngd-compare-bar';
    bar.className = 'ngd-cmp-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Diamond comparison selection');
    bar.hidden = true;
    if (document.querySelector('.ngd-sticky-cta')) bar.classList.add('is-above-sticky');
    bar.innerHTML =
      '<div class="ngd-cmp-bar-inner">' +
      '<div class="ngd-cmp-bar-head"><strong>Compare Diamonds</strong>' +
      '<span class="ngd-cmp-bar-count" data-cmp-count aria-live="polite">0 selected</span></div>' +
      '<div class="ngd-cmp-chips" data-cmp-chips></div>' +
      '<div class="ngd-cmp-bar-actions">' +
      '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-cmp-clear>Clear</button>' +
      '<a class="ngd-btn ngd-btn-gold ngd-btn-sm" data-cmp-go href="' + esc(root()) + 'compare-diamonds.html">Compare Now</a>' +
      '</div>' +
      '<p class="ngd-cmp-bar-msg" data-cmp-msg role="status" hidden></p>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector('[data-cmp-clear]').addEventListener('click', function () { api.clear(); });
    bar.querySelector('[data-cmp-go]').addEventListener('click', function (event) {
      if (this.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        message('Add at least 2 diamonds to compare.');
      }
    });
  }

  function message(text) {
    if (!bar) return;
    var el = bar.querySelector('[data-cmp-msg]');
    el.textContent = text;
    el.hidden = false;
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(function () { el.hidden = true; }, 4000);
  }

  function syncBar(list) {
    if (!bar) return;
    bar.hidden = list.length === 0;
    document.body.classList.toggle('ngd-compare-open', list.length > 0 && !bar.hidden);
    bar.querySelector('[data-cmp-count]').textContent =
      list.length + ' selected' + (list.length >= MAX ? ' · maximum reached' : '');
    bar.querySelector('[data-cmp-chips]').innerHTML = list.map(function (id) {
      return '<span class="ngd-cmp-chip"><span class="ngd-cmp-chip-mark" aria-hidden="true">◆</span>' +
        '<span>' + esc(id) + '</span>' +
        '<button type="button" class="ngd-cmp-chip-x" data-cmp-remove="' + esc(id) + '" ' +
        'aria-label="Remove ' + esc(id) + ' from comparison">×</button></span>';
    }).join('');
    bar.querySelectorAll('[data-cmp-remove]').forEach(function (button) {
      button.onclick = function () { api.remove(button.getAttribute('data-cmp-remove')); };
    });
    var go = bar.querySelector('[data-cmp-go]');
    var ready = list.length >= 2;
    go.classList.toggle('is-disabled', !ready);
    go.setAttribute('aria-disabled', String(!ready));
    go.setAttribute('title', ready ? 'Open the side-by-side comparison' : 'Add at least 2 diamonds to compare');
  }

  function refresh() {
    var list = read();
    syncToggles(list);
    syncBar(list);
  }

  /* ---- one delegated click handler for every compare toggle ---- */
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-ngd-compare]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    var result = api.toggle(button.getAttribute('data-ngd-compare'));
    if (!result.ok && result.reason === 'full') {
      message('You can compare up to 4 diamonds.');
    }
  });

  /* Another tab changed the selection — mirror it here. */
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) notify();
  });

  function init() {
    buildBar();
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
