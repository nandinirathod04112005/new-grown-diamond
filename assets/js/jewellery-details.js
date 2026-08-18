/* Public jewellery details and ordered Supabase image gallery. */
(function () {
  'use strict';
  var product=document.getElementById('jd-product'); if(!product)return;
  var id=new URLSearchParams(location.search).get('id'), notFound=document.getElementById('jd-notfound'), sticky=document.getElementById('jd-sticky');
  function unavailable(error){product.classList.add('d-none');if(sticky)sticky.classList.add('d-none');notFound.classList.remove('d-none');notFound.querySelector('.ngd-title').textContent=error?'Jewellery details unavailable':'Product not available';notFound.querySelector('.ngd-text-muted').textContent=error?'Please check your connection and try again.':'This piece is no longer in the public collection.';document.title='Product not available — New Grown Diamond';}
  function val(v){return v===null||v===undefined||v===''?'—':String(v);}
  function price(p){if(!p.price_visible)return 'Price on Request';var n=p.price==null?null:Number(p.price);return n===null||!isFinite(n)?'Price on Request':new Intl.NumberFormat(undefined,{style:'currency',currency:p.currency||'USD'}).format(n);}
  async function boot(){
    product.setAttribute('aria-busy','true');
    if(!id||!window.ngdIsSupabaseConfigured||!window.ngdIsSupabaseConfigured())return unavailable(!id?false:true);
    var res=await window.ngdSupabase.from('jewellery').select('public_id,sku,product_name,category,subcategory,short_description,full_description,metal,metal_karat,metal_colour,gross_weight,diamond_weight,diamond_pieces,diamond_quality,diamond_shape,certificate_number,size,availability,price_visible,price,currency,jewellery_images(image_url,alt_text,sort_order,is_primary)').eq('public_id',id).eq('active',true).is('archived_at',null).maybeSingle();
    if(res.error)return unavailable(true);if(!res.data)return unavailable(false);var p=res.data, shared=window.NGDJewelCard;
    var images=(p.jewellery_images||[]).slice().sort(function(a,b){return (b.is_primary?1:0)-(a.is_primary?1:0)||(Number(a.sort_order)||0)-(Number(b.sort_order)||0);});
    document.title=val(p.product_name)+' · '+p.public_id+' — New Grown Diamond';document.getElementById('jd-sku').textContent=p.public_id;document.getElementById('jd-name').textContent=val(p.product_name);
    document.getElementById('jd-chips').innerHTML=shared.availBadge({availability:p.availability})+'<span class="ngd-badge">'+val(p.category)+'</span>'+(p.diamond_weight==null?'':'<span class="ngd-weight-chip">'+Number(p.diamond_weight).toFixed(2)+' ct diamonds</span>');
    document.getElementById('jd-short').textContent=val(p.short_description);document.getElementById('jd-fulldesc').textContent=val(p.full_description);document.getElementById('jd-price').textContent=price(p);
    var fields=[['Product Name',p.product_name],['SKU',p.sku||p.public_id],['Category',p.category],['Subcategory',p.subcategory],['Metal',p.metal],['Metal Karat',p.metal_karat],['Metal Colour',p.metal_colour],['Diamond Weight',p.diamond_weight==null?'—':Number(p.diamond_weight).toFixed(2)+' ct'],['Diamond Pieces',p.diamond_pieces],['Diamond Quality',p.diamond_quality],['Diamond Shape',p.diamond_shape],['Certificate Number',p.certificate_number],['Gross Weight',p.gross_weight==null?'—':p.gross_weight+' g'],['Size',p.size],['Availability',p.availability]];
    document.getElementById('jd-specs').innerHTML=fields.map(function(f){return '<div><dt>'+f[0]+'</dt><dd>'+val(f[1])+'</dd></div>';}).join('');
    var fallback=shared.artFor({category:p.category||''});function imageHtml(img){return '<img src="'+encodeURI(img.image_url)+'" alt="'+val(img.alt_text==='—'?p.product_name:img.alt_text)+'">';}var active=images[0]?imageHtml(images[0]):fallback;
    document.getElementById('jd-stage-inner').innerHTML=active;var thumbs=document.getElementById('jd-thumbs');thumbs.innerHTML=images.length?images.map(function(img,i){return '<button type="button" class="ngd-thumb ngd-thumb-light'+(i?'':' is-active')+'" data-index="'+i+'" aria-label="View image '+(i+1)+'">'+imageHtml(img)+'</button>';}).join(''):'<button type="button" class="ngd-thumb ngd-thumb-light is-active">'+fallback+'</button>';
    thumbs.addEventListener('click',function(e){var b=e.target.closest('[data-index]');if(!b)return;var i=Number(b.dataset.index);document.getElementById('jd-stage-inner').innerHTML=imageHtml(images[i]);thumbs.querySelectorAll('.ngd-thumb').forEach(function(x){x.classList.toggle('is-active',x===b);});});
    document.getElementById('jd-cert-text').textContent=p.certificate_number?'Certificate '+p.certificate_number:'Certificate information available on request.';document.getElementById('jd-spec-table').innerHTML='<div class="col-12"><dl>'+fields.map(function(f){return '<div class="ngd-spec-row"><dt>'+f[0]+'</dt><dd>'+val(f[1])+'</dd></div>';}).join('')+'</dl></div>';document.getElementById('jd-similar').innerHTML='';product.removeAttribute('aria-busy');
  }
  boot().catch(function(){unavailable(true);});
})();
