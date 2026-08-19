/* Public, read-only product data adapter.  Keep the selected columns deliberately
   narrow: private/admin columns must never be downloaded by storefront pages. */
(function () {
  'use strict';

  function diamond(row) {
    return {
      databaseId: row.id, id: row.public_id, stock: row.stock_number,
      shape: row.shape || '', carat: Number(row.carat || 0), colour: row.color || '',
      clarity: row.clarity || '', cut: row.cut || '', lab: row.laboratory || '',
      growth: row.growth_method || '', availability: row.availability || 'On Request',
      polish: row.polish || '—', symmetry: row.symmetry || '—',
      fluorescence: row.fluorescence || '—', report: row.report_number || row.certificate_number || '—',
      measurements: row.measurements || '—', depthPct: row.depth_percentage,
      tablePct: row.table_percentage == null ? '—' : row.table_percentage,
      ratio: Number(row.ratio || 0), imageUrl: row.image_url || '',
      priceVisible: row.price_visible === true, price: row.total_price, currency: row.currency || 'USD'
    };
  }

  function jewellery(row) {
    return {
      databaseId: row.id, id: row.public_id, sku: row.sku, name: row.product_name || '',
      category: row.category || '', subcategory: row.subcategory || '',
      description: row.short_description || row.description || '', fullDesc: row.description || '',
      weightCt: row.diamond_weight == null ? null : Number(row.diamond_weight),
      availability: row.availability || 'On Request', metal: row.metal || '—',
      metalKarat: row.metal_karat || '—', metalColour: row.metal_color || '—',
      diamondPieces: Number(row.diamond_pieces || 0), diamondQuality: row.diamond_quality,
      diamondShape: row.diamond_shape, certificateNo: row.certificate_number,
      grossWeight: Number(row.gross_weight || 0), size: row.size || '—',
      priceVisible: row.price_visible === true, price: row.price, currency: row.currency || 'USD', images: []
    };
  }

  var diamondColumns = 'id,public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,fluorescence,laboratory,growth_method,report_number,certificate_number,measurements,depth_percentage,table_percentage,ratio,availability,image_url,price_visible,total_price,currency';
  var jewelleryColumns = 'id,public_id,sku,product_name,category,subcategory,short_description,description,diamond_weight,availability,metal,metal_karat,metal_color,diamond_pieces,diamond_quality,diamond_shape,certificate_number,gross_weight,size,price_visible,price,currency';

  async function diamonds(publicId) {
    if (!window.ngdSupabase) throw new Error('unavailable');
    var q = window.ngdSupabase.from('diamonds').select(diamondColumns)
      .eq('active', true).is('archived_at', null);
    if (publicId) q = q.eq('public_id', publicId).limit(1);
    var result = await q;
    if (result.error) throw new Error('query_failed');
    return (result.data || []).map(diamond);
  }

  async function jewelleryRows(publicId) {
    if (!window.ngdSupabase) throw new Error('unavailable');
    var q = window.ngdSupabase.from('jewellery').select(jewelleryColumns)
      .eq('active', true).is('archived_at', null);
    if (publicId) q = q.eq('public_id', publicId).limit(1);
    var result = await q;
    if (result.error) throw new Error('query_failed');
    var rows = (result.data || []).map(jewellery);
    if (!rows.length) return rows;
    var ids = rows.map(function (p) { return p.databaseId; });
    var images = await window.ngdSupabase.from('jewellery_images')
      .select('jewellery_id,image_url,alt_text,is_primary,sort_order').in('jewellery_id', ids)
      .order('sort_order', { ascending: true });
    if (images.error) throw new Error('images_failed');
    rows.forEach(function (piece) {
      piece.images = (images.data || []).filter(function (img) { return img.jewellery_id === piece.databaseId; })
        .sort(function (a, b) { return (b.is_primary === true) - (a.is_primary === true) || (a.sort_order || 0) - (b.sort_order || 0); });
      piece.imageUrl = piece.images[0] ? piece.images[0].image_url : '';
    });
    return rows;
  }

  function money(value, currency) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(Number(value));
  }

  window.NGDPublicProducts = { diamonds: diamonds, jewellery: jewelleryRows, money: money };
})();
