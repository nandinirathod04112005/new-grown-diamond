/* ============================================================
   NEW GROWN DIAMOND — homepage featured products (LIVE)
   ------------------------------------------------------------
   Renders the "Signature stones" grid and the Fine Jewellery
   featured row from Supabase — the same single source of truth
   as the admin panel and the public catalogue:

     diamonds:  active = true AND archived_at IS NULL,
                featured first; the newest active stones fill in
                when nothing is featured; a quiet empty/error
                state otherwise. Cards come from the shared
                NGDDiamondCard renderer, so the homepage always
                matches the inventory (image_path photo or gem
                art, details by immutable DIA- public id).

     jewellery: active = true AND archived_at IS NULL AND
                featured = true, primary photo from
                public.jewellery_images. The block stays hidden
                when nothing is featured, leaving the category
                navigation exactly as designed.

   A Supabase failure must never break the homepage: each
   section fails alone, with calm copy and no raw errors.
   ============================================================ */
(function () {
  'use strict';

  /* Storefront columns only — prices stay on the details pages,
     where price_visible gates them; they are never selected here. */
  var DIA_COLUMNS = 'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,' +
    'availability,image_path,featured,created_at';
  var JEW_COLUMNS = 'id,public_id,sku,product_name,category,subcategory,short_description,' +
    'diamond_weight,availability,featured,created_at';
  var JEW_AVAIL = { available: 'In Stock', made_to_order: 'Made to Order', sold: 'Sold' };

  function mapStone(d) {
    return {
      id: d.stock_number || d.public_id || '—',
      publicId: d.public_id || '',
      shape: d.shape || '—',
      carat: Number(d.carat) || 0,
      colour: d.color || '—',
      clarity: d.clarity || '—',
      cut: d.cut || '—',
      lab: d.laboratory || '—',
      availability: d.availability || 'On Request',
      image_path: d.image_path || null,
      featured: !!d.featured
    };
  }

  function mapPiece(p) {
    return {
      id: p.sku || p.public_id || '—',
      publicId: p.public_id || '',
      rowId: p.id,
      name: p.product_name || '—',
      category: p.category || 'Other',
      description: p.short_description || '',
      weightCt: p.diamond_weight === null || p.diamond_weight === undefined
        ? null : Number(p.diamond_weight),
      availability: JEW_AVAIL[p.availability] || p.availability || 'On Request',
      image_path: null,
      featured: !!p.featured
    };
  }

  function stateHtml(message) {
    return '<div class="col-12" data-home-diamonds-state>' +
      '<p class="ngd-lead text-center py-5 mb-0">' + message +
      ' <a class="ngd-link" href="diamonds.html">Browse the full inventory</a>.</p></div>';
  }

  async function loadFeaturedDiamonds() {
    var grid = document.getElementById('featured-diamonds-grid');
    if (!grid) return;
    try {
      if (!window.ngdSupabase || !window.NGDDiamondCard) throw new Error('unavailable');
      var query = function (featuredOnly) {
        var q = window.ngdSupabase.from('diamonds').select(DIA_COLUMNS)
          .eq('active', true).is('archived_at', null);
        if (featuredOnly) q = q.eq('featured', true);
        return q.order('created_at', { ascending: false }).limit(6);
      };
      var res = await query(true);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        var latest = await query(false);
        if (latest.error) throw latest.error;
        rows = latest.data || [];
      }
      if (!rows.length) {
        grid.innerHTML = stateHtml('Our next signature stones are being graded.');
      } else {
        grid.innerHTML = rows.map(mapStone).map(window.NGDDiamondCard.cardHtml).join('');
        if (window.NGDTilt) window.NGDTilt(grid);
      }
    } catch (error) {
      console.error('[NGD] Featured diamonds failed to load', error);
      grid.innerHTML = stateHtml('The showcase could not load right now.');
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  async function loadFeaturedJewellery() {
    var wrap = document.getElementById('featured-jewellery');
    var grid = document.getElementById('featured-jewellery-grid');
    if (!wrap || !grid) return;
    try {
      if (!window.ngdSupabase || !window.NGDJewelCard) return; // block simply stays hidden
      var res = await window.ngdSupabase.from('jewellery').select(JEW_COLUMNS)
        .eq('active', true).is('archived_at', null).eq('featured', true)
        .order('created_at', { ascending: false }).limit(4);
      if (res.error) throw res.error;
      var rows = (res.data || []).map(mapPiece);
      if (!rows.length) return; // nothing featured — the section keeps its category design
      var imgs = await window.ngdSupabase.from('jewellery_images')
        .select('jewellery_id,image_path').eq('is_primary', true)
        .in('jewellery_id', rows.map(function (r) { return r.rowId; }));
      if (!imgs.error) {
        var byId = {};
        (imgs.data || []).forEach(function (img) { byId[img.jewellery_id] = img.image_path; });
        rows.forEach(function (row) { row.image_path = byId[row.rowId] || null; });
      }
      grid.innerHTML = rows.map(window.NGDJewelCard.cardHtml).join('');
      wrap.hidden = false;
      if (window.NGDTilt) window.NGDTilt(grid);
    } catch (error) {
      console.error('[NGD] Featured jewellery failed to load', error);
      wrap.hidden = true; // never break the homepage over a showcase row
    }
  }

  function init() {
    loadFeaturedDiamonds();
    loadFeaturedJewellery();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
