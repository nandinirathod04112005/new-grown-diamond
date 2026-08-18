(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { var d=document.createElement('div'); d.textContent=v==null?'':String(v); return d.innerHTML; };
  var label = function (v) { return String(v || '').replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();}); };
  async function init() {
    var auth = await window.NGDAuth.requireCustomer(); if (!auth) return;
    var name = (auth.profile.full_name || '').trim(); document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function(el){el.textContent=name.split(/\s+/)[0]||'there';});
    var result = await window.ngdSupabase.from('enquiries').select('public_id,subject,message,product_type,diamond_id,jewellery_id,status,admin_note,created_at,diamonds(stock_number),jewellery(sku)').order('created_at',{ascending:false});
    if (result.error) { console.error('[NGD] Customer enquiries load failed', result.error); $('enquiries-alert').innerHTML='<div class="ngd-alert ngd-alert-danger">We could not load your enquiries. Please refresh and try again.</div>'; return; }
    var rows=result.data||[]; $('enquiries-empty').hidden=!!rows.length;
    $('enquiries-list').innerHTML=rows.map(function(r){var ref=r.diamonds&&r.diamonds.stock_number||r.jewellery&&r.jewellery.sku; var product=r.product_type?label(r.product_type)+' · '+(ref||r.diamond_id||r.jewellery_id):'—'; return '<article class="ngd-req-card"><div class="d-flex justify-content-between gap-3"><div><strong>'+esc(r.subject)+'</strong><span class="d-block small ngd-text-muted">'+esc(r.public_id+' · '+new Date(r.created_at).toLocaleDateString())+'</span></div><span class="ngd-status-chip">'+esc(label(r.status))+'</span></div><dl class="ngd-req-meta"><div><dt>Product</dt><dd>'+esc(product)+'</dd></div></dl><p class="text-break">'+esc(r.message)+'</p>'+(r.admin_note?'<div class="ngd-edu-note mt-3"><p class="mb-0"><strong>Admin response</strong><br>'+esc(r.admin_note)+'</p></div>':'')+'</article>';}).join('');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
