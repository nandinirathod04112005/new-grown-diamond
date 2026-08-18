/* Public diamond details, loaded by public_id from the RLS-protected catalogue. */
(function () {
  'use strict';
  var product = document.getElementById('dd-product');
  if (!product) return;
  var id = new URLSearchParams(location.search).get('id');
  var sticky = document.getElementById('dd-sticky');
  var notFound = document.getElementById('dd-notfound');
  function unavailable(error) {
    product.classList.add('d-none'); if (sticky) sticky.classList.add('d-none');
    notFound.classList.remove('d-none');
    notFound.querySelector('.ngd-title').textContent = error ? 'Diamond details unavailable' : 'Diamond not available';
    notFound.querySelector('.ngd-text-muted').textContent = error ? 'Please check your connection and try again.' : 'This diamond is no longer in the public inventory.';
    document.title = 'Diamond not available — New Grown Diamond';
  }
  function val(v) { return v === null || v === undefined || v === '' ? '—' : String(v); }
  function money(d) {
    if (!d.price_visible) return 'Price on Request';
    var amount = d.total_price == null ? null : Number(d.total_price);
    return amount === null || !isFinite(amount) ? 'Price on Request' : new Intl.NumberFormat(undefined, {style:'currency', currency:d.currency || 'USD'}).format(amount);
  }
  async function boot() {
    product.setAttribute('aria-busy', 'true');
    if (!id || !window.ngdIsSupabaseConfigured || !window.ngdIsSupabaseConfigured()) return unavailable(!id ? false : true);
    var res = await window.ngdSupabase.from('diamonds')
      .select('public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,fluorescence,laboratory,report_number,certificate_number,certificate_url,measurements,depth_percentage,table_percentage,ratio,growth_method,availability,image_url,price_visible,total_price,currency')
      .eq('public_id', id).eq('active', true).is('archived_at', null).maybeSingle();
    if (res.error) return unavailable(true); if (!res.data) return unavailable(false);
    var d=res.data, shared=window.NGDDiamondCard;
    document.title=d.public_id+' · '+val(d.shape)+' — New Grown Diamond';
    document.getElementById('dd-stock').textContent=d.public_id;
    document.getElementById('dd-title').textContent=val(d.shape)+' · '+Number(d.carat || 0).toFixed(2)+' ct';
    document.getElementById('dd-lab-badge').textContent=val(d.laboratory)+' Certified';
    document.getElementById('dd-chips').innerHTML=shared.availBadge({availability:d.availability})+'<span class="ngd-badge">'+val(d.growth_method)+' grown</span>';
    document.getElementById('dd-sub').textContent=val(d.color)+' colour · '+val(d.clarity)+' clarity · '+val(d.cut)+' cut';
    document.getElementById('dd-price').textContent=money(d);
    var fields=[['Stock Number',d.stock_number || d.public_id],['Shape',d.shape],['Carat',Number(d.carat||0).toFixed(2)],['Colour',d.color],['Clarity',d.clarity],['Cut',d.cut],['Polish',d.polish],['Symmetry',d.symmetry],['Fluorescence',d.fluorescence],['Laboratory',d.laboratory],['Report Number',d.report_number||d.certificate_number],['Measurements',d.measurements],['Depth %',d.depth_percentage == null?'—':d.depth_percentage+'%'],['Table %',d.table_percentage == null?'—':d.table_percentage+'%'],['Ratio',d.ratio],['Growth Method',d.growth_method],['Availability',d.availability]];
    document.getElementById('dd-specs').innerHTML=fields.map(function(f){return '<div><dt>'+f[0]+'</dt><dd>'+val(f[1])+'</dd></div>';}).join('');
    var visual=d.image_url?'<img src="'+encodeURI(d.image_url)+'" alt="'+val(d.shape)+' lab-grown diamond">':shared.artFor({shape:d.shape||'Round'});
    document.getElementById('dd-stage-inner').innerHTML=visual; document.getElementById('dd-thumbs').innerHTML='<button class="ngd-thumb is-active" type="button" aria-label="Primary image">'+visual+'</button>';
    document.getElementById('dd-cert-lab').textContent=val(d.laboratory)+' Laboratory'; document.getElementById('dd-cert-no').textContent=val(d.report_number||d.certificate_number);
    document.getElementById('dd-spec-table').innerHTML='<div class="col-12"><dl>'+fields.map(function(f){return '<div class="ngd-spec-row"><dt>'+f[0]+'</dt><dd>'+val(f[1])+'</dd></div>';}).join('')+'</dl></div>';
    document.getElementById('dd-similar').innerHTML=''; product.removeAttribute('aria-busy');
  }
  boot().catch(function(){ unavailable(true); });
})();
