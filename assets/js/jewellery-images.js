/* Shared, public-safe helpers for jewellery photography in Supabase Storage. */
(function () {
  'use strict';

  var BUCKET = 'jewellery-images';

  function publicUrl(path) {
    if (!path || !window.ngdSupabase) return '';
    return window.ngdSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function attachUrls(rows) {
    return (rows || []).map(function (row) {
      return Object.assign({}, row, { image_url: publicUrl(row.image_path) });
    });
  }

  async function load(productId) {
    if (!window.ngdSupabase || !productId) return [];
    var result = await window.ngdSupabase.from('jewellery_images')
      .select('id,jewellery_id,image_path,sort_order,is_primary')
      .eq('jewellery_id', productId).order('sort_order', { ascending: true });
    if (result.error) throw result.error;
    return attachUrls(result.data);
  }

  window.NGDJewelleryImages = {
    bucket: BUCKET,
    publicUrl: publicUrl,
    attachUrls: attachUrls,
    load: load
  };
})();
