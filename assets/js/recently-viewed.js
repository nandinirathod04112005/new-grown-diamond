/* ============================================================
   NEW GROWN DIAMOND — shared Recently Viewed service
   ------------------------------------------------------------
   Device-local browsing history (window.NGDRecentlyViewed) for
   public diamonds and jewellery — never sent to Supabase.

   localStorage holds ONLY lightweight identifiers (max 12,
   newest first, duplicates move to the top):
     ngdRecentlyViewed = [{ type, id, viewedAt }, …]
   Never product objects, names, prices, tokens or anything
   private — every read re-validates the shape, so tampered or
   stale storage can never hurt a page, and a browser without
   localStorage simply leaves the feature silently off.

   Rendering always re-fetches the CURRENT public rows from
   Supabase in one batched query per product type (active,
   non-archived only); ids that no longer resolve are pruned.
   Sections opt in with markup:

     <section data-ngd-recent data-recent-type="all|diamond|jewellery"
              data-recent-limit="6" hidden>
       … <button data-recent-clear>…</button>
       <div data-recent-grid></div>
     </section>

   Cards reuse the shared NGDDiamondCard / NGDJewelCard
   renderers; the storage event keeps sections in sync across
   tabs. Details pages call add() only after a product really
   loaded — invalid, inactive or archived products are never
   recorded.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ngdRecentlyViewed';
  var MAX = 12;
  var ID_RE = { diamond: /^DIA-[A-Z0-9]{8}$/, jewellery: /^JEW-[A-Z0-9]{8}$/ };
  var listeners = [];

  /* Same storefront columns the homepage showcases read — no prices. */
  var DIA_COLUMNS = 'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,' +
    'availability,image_path';
  var JEW_COLUMNS = 'id,public_id,sku,product_name,category,subcategory,short_description,' +
    'diamond_weight,availability';
  var JEW_AVAIL = { available: 'In Stock', made_to_order: 'Made to Order', sold: 'Sold' };

  function mapStone(d) {
    return {
      productType: 'diamond',
      id: d.stock_number || d.public_id || '—',
      publicId: (d.public_id || '').toUpperCase(),
      shape: d.shape || '—',
      carat: Number(d.carat) || 0,
      colour: d.color || '—',
      clarity: d.clarity || '—',
      cut: d.cut || '—',
      lab: d.laboratory || '—',
      availability: d.availability || 'On Request',
      image_path: d.image_path || null
    };
  }

  function mapPiece(p) {
    return {
      productType: 'jewellery',
      id: p.sku || p.public_id || '—',
      publicId: (p.public_id || '').toUpperCase(),
      rowId: p.id,
      name: p.product_name || '—',
      category: p.category || 'Other',
      description: p.short_description || '',
      weightCt: p.diamond_weight === null || p.diamond_weight === undefined
        ? null : Number(p.diamond_weight),
      availability: JEW_AVAIL[p.availability] || p.availability || 'On Request',
      image_path: null
    };
  }

  /* ---- storage (silently disabled when unavailable) ---- */
  function read() {
    var out = [];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(raw)) return out;
      var seen = {};
      raw.forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        var type = entry.type === 'diamond' || entry.type === 'jewellery' ? entry.type : null;
        var id = typeof entry.id === 'string' ? entry.id.trim().toUpperCase() : '';
        if (!type || !ID_RE[type].test(id)) return;
        var dedupeKey = type + ':' + id;
        if (seen[dedupeKey] || out.length >= MAX) return;
        seen[dedupeKey] = true;
        out.push({ type: type, id: id, viewedAt: Number(entry.viewedAt) || 0 });
      });
    } catch (_error) { /* unavailable or unreadable storage = empty history */ }
    return out;
  }

  function write(list, silent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (_error) { /* private mode — the page keeps working without history */ }
    if (!silent) notify();
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (error) { console.error('[NGD Recent] listener failed', error); }
    });
  }

  var api = {
    MAX: MAX,
    getAll: read,
    add: function (type, id) {
      var normalized = String(id == null ? '' : id).trim().toUpperCase();
      if (!ID_RE[type] || !ID_RE[type].test(normalized)) return;
      var list = read().filter(function (entry) {
        return !(entry.type === type && entry.id === normalized);
      });
      list.unshift({ type: type, id: normalized, viewedAt: Date.now() });
      write(list.slice(0, MAX));
    },
    remove: function (type, id) {
      var normalized = String(id == null ? '' : id).trim().toUpperCase();
      write(read().filter(function (entry) {
        return !(entry.type === type && entry.id === normalized);
      }));
    },
    clear: function () { write([]); },
    trim: function () { write(read()); },

    /** Batched live lookup — one diamonds query + one jewellery query at
        most. Resolves { products, missing } with products in the given
        entry order; missing entries no longer exist publicly. */
    fetchLatestProducts: async function (entries) {
      var wanted = (entries || read()).slice();
      var byKey = {};
      var diamondIds = [];
      var jewelleryIds = [];
      wanted.forEach(function (entry) {
        (entry.type === 'diamond' ? diamondIds : jewelleryIds).push(entry.id);
      });
      if (diamondIds.length) {
        var dres = await window.ngdSupabase.from('diamonds').select(DIA_COLUMNS)
          .in('public_id', diamondIds).eq('active', true).is('archived_at', null);
        if (dres.error) throw dres.error;
        (dres.data || []).forEach(function (row) {
          var stone = mapStone(row);
          byKey['diamond:' + stone.publicId] = stone;
        });
      }
      if (jewelleryIds.length) {
        var jres = await window.ngdSupabase.from('jewellery').select(JEW_COLUMNS)
          .in('public_id', jewelleryIds).eq('active', true).is('archived_at', null);
        if (jres.error) throw jres.error;
        var pieces = (jres.data || []).map(mapPiece);
        if (pieces.length) {
          try {
            var imgs = await window.ngdSupabase.from('jewellery_images')
              .select('jewellery_id,image_path').eq('is_primary', true)
              .in('jewellery_id', pieces.map(function (p) { return p.rowId; }));
            if (!imgs.error) {
              var photoById = {};
              (imgs.data || []).forEach(function (img) { photoById[img.jewellery_id] = img.image_path; });
              pieces.forEach(function (piece) { piece.image_path = photoById[piece.rowId] || null; });
            }
          } catch (_ignored) { /* art fallback */ }
        }
        pieces.forEach(function (piece) { byKey['jewellery:' + piece.publicId] = piece; });
      }
      var products = [];
      var missing = [];
      wanted.forEach(function (entry) {
        var product = byKey[entry.type + ':' + entry.id];
        if (product) products.push(product); else missing.push(entry);
      });
      return { products: products, missing: missing };
    }
  };
  window.NGDRecentlyViewed = api;

  /* ---- section rendering ---- */
  function cardFor(product) {
    if (product.productType === 'diamond' && window.NGDDiamondCard) {
      return window.NGDDiamondCard.cardHtml(product);
    }
    if (product.productType === 'jewellery' && window.NGDJewelCard) {
      return window.NGDJewelCard.cardHtml(product);
    }
    return '';
  }

  /* Account pages live one level down — repoint the relative card links. */
  function fixLinks(grid) {
    var root = window.NGD_SITE_ROOT || '';
    if (!root || root === './') return;
    grid.querySelectorAll('a[href^="diamond-details.html"], a[href^="jewellery-details.html"]')
      .forEach(function (link) {
        link.setAttribute('href', root + link.getAttribute('href'));
      });
  }

  async function renderSection(section) {
    var grid = section.querySelector('[data-recent-grid]');
    if (!grid) return;
    var type = section.getAttribute('data-recent-type') || 'all';
    var limit = parseInt(section.getAttribute('data-recent-limit') || '6', 10) || 6;
    var entries = read().filter(function (entry) {
      return type === 'all' || entry.type === type;
    }).slice(0, limit);
    if (!entries.length) {
      section.hidden = true;
      grid.innerHTML = '';
      return;
    }
    try {
      if (!window.ngdSupabase) throw new Error('supabase unavailable');
      var result = await api.fetchLatestProducts(entries);
      if (result.missing.length) {
        /* those products are gone from the storefront — quietly forget them */
        var missingKeys = {};
        result.missing.forEach(function (entry) { missingKeys[entry.type + ':' + entry.id] = true; });
        write(read().filter(function (entry) {
          return !missingKeys[entry.type + ':' + entry.id];
        }), true);
      }
      var cards = result.products.map(cardFor).filter(Boolean);
      if (!cards.length) {
        section.hidden = true;
        grid.innerHTML = '';
        return;
      }
      grid.innerHTML = cards.join('');
      fixLinks(grid);
      section.hidden = false;
      if (window.NGDTilt) window.NGDTilt(grid);
    } catch (error) {
      /* history is a convenience — it never breaks a page */
      console.warn('[NGD Recent] section unavailable', error);
      section.hidden = true;
    }
  }

  function renderAll() {
    document.querySelectorAll('[data-ngd-recent]').forEach(renderSection);
  }

  function init() {
    document.querySelectorAll('[data-ngd-recent] [data-recent-clear]').forEach(function (button) {
      button.addEventListener('click', function () { api.clear(); });
    });
    listeners.push(renderAll);
    window.addEventListener('storage', function (event) {
      if (event.key === KEY || event.key === null) renderAll();
    });
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
