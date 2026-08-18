(function () {
  'use strict';
  var rows = [], query = '', status = 'all', type = 'all', from = '', to = '';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; };
  var label = function (v) { return String(v || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); };
  var date = function (v) { return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  function toast(kind, message) { $('adm-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + kind + '" role="status">' + esc(message) + '</div>'; }
  function product(r) { var ref = r.diamonds && r.diamonds.stock_number || r.jewellery && r.jewellery.sku; return r.product_type ? label(r.product_type) + ' · ' + (ref || r.diamond_id || r.jewellery_id) : '—'; }
  function filtered() { return rows.filter(function (r) {
    var hay = [r.public_id, r.full_name, r.company_name, r.email, r.subject, r.message].join(' ').toLowerCase();
    var day = r.created_at.slice(0, 10);
    return (!query || hay.indexOf(query.toLowerCase()) !== -1) && (status === 'all' || r.status === status) &&
      (type === 'all' || r.product_type === type) && (!from || day >= from) && (!to || day <= to);
  }); }
  function actions(r) { return '<button class="ngd-btn ngd-btn-outline ngd-btn-sm" data-view="' + esc(r.id) + '">View</button>'; }
  function render() {
    var list = filtered();
    $('adm-table-body').innerHTML = list.map(function (r) { return '<tr data-adm-row="' + esc(r.public_id) + '"><td class="ngd-stock-cell">' + esc(r.public_id) +
      '</td><td><strong>' + esc(r.full_name) + '</strong>' + (!r.user_id ? '<span class="d-block small ngd-text-muted">Guest</span>' : '') +
      '</td><td>' + esc(r.company_name || '—') + '</td><td>' + esc(r.email) + '</td><td>' + esc(r.subject) + '</td><td>' + esc(label(r.product_type || 'General')) +
      '</td><td>' + esc(product(r)) + '</td><td>' + esc(date(r.created_at)) + '</td><td><span class="ngd-status-chip">' + esc(label(r.status)) +
      '</span></td><td class="text-end">' + actions(r) + '</td></tr>'; }).join('');
    $('adm-cards-wrap').innerHTML = list.map(function (r) { return '<article class="ngd-req-card"><strong>' + esc(r.subject) + '</strong><p class="small ngd-text-muted">' +
      esc(r.public_id + ' · ' + r.full_name + ' · ' + date(r.created_at)) + '</p><div class="d-flex justify-content-between"><span class="ngd-status-chip">' + esc(label(r.status)) + '</span>' + actions(r) + '</div></article>'; }).join('');
    $('adm-count').textContent = list.length + ' of ' + rows.length + ' enquiries';
    $('adm-table-card').hidden = !list.length; $('adm-cards-wrap').hidden = !list.length;
    $('adm-no-match').hidden = !rows.length || !!list.length; $('adm-stage-empty').hidden = !!rows.length;
    document.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { detail(rows.find(function (r) { return r.id === b.dataset.view; })); }; });
  }
  function detail(r) {
    var panel = $('enq-detail'); panel.hidden = false;
    panel.innerHTML = '<div class="d-flex justify-content-between"><div><h2 class="ngd-title fs-5">' + esc(r.subject) + '</h2><p class="small ngd-text-muted">' + esc(r.public_id + ' · ' + r.full_name + ' · ' + r.email) +
      '</p></div><button class="ngd-icon-btn" id="enq-close" aria-label="Close">×</button></div><p class="text-break">' + esc(r.message) + '</p><div class="row g-3 ngd-form"><div class="col-md-4"><label class="form-label" for="enq-status">Status</label><select class="form-select" id="enq-status">' +
      ['new','in_progress','responded','closed'].map(function (s) { return '<option value="'+s+'" '+(s===r.status?'selected':'')+'>'+label(s)+'</option>'; }).join('') +
      '</select></div><div class="col-md-8"><label class="form-label" for="enq-note">Internal admin note</label><textarea class="form-control" id="enq-note" rows="3"></textarea></div></div><button class="ngd-btn ngd-btn-gold ngd-btn-sm mt-3" id="enq-save">Save changes</button>';
    $('enq-note').value = r.admin_note || ''; $('enq-close').onclick = function () { panel.hidden = true; };
    $('enq-save').onclick = async function () {
      var button = this; button.disabled = true;
      var changes = { status: $('enq-status').value, admin_note: $('enq-note').value.trim() || null };
      var result = await window.ngdSupabase.from('enquiries').update(changes).eq('id', r.id).select().single();
      button.disabled = false;
      if (result.error) { console.error('[NGD] Enquiry update failed', result.error); toast('danger', 'Changes could not be saved. Please try again.'); return; }
      Object.assign(r, result.data); toast('success', r.public_id + ' was updated.'); render(); detail(r);
    };
  }
  async function load() {
    $('adm-stage-loading').hidden = false;
    var result = await window.ngdSupabase.from('enquiries').select('*,diamonds(stock_number),jewellery(sku)').order('created_at', { ascending: false });
    $('adm-stage-loading').hidden = true;
    if (result.error) { console.error('[NGD] Enquiries load failed', result.error); $('adm-stage-error').hidden = false; return; }
    rows = result.data || []; $('adm-stage-error').hidden = true; render();
  }
  async function init() {
    var auth = await window.NGDAuth.requireAdmin(); if (!auth) return;
    ['new','in_progress','responded','closed'].forEach(function (s) { $('adm-f-status').add(new Option(label(s), s)); });
    ['diamond','jewellery'].forEach(function (s) { $('adm-f-type').add(new Option(label(s), s)); });
    $('adm-search').oninput = function () { query=this.value; render(); }; $('adm-f-status').onchange=function(){status=this.value;render();};
    $('adm-f-type').onchange=function(){type=this.value;render();}; $('adm-f-from').onchange=function(){from=this.value;render();}; $('adm-f-to').onchange=function(){to=this.value;render();};
    $('adm-clear').onclick=function(){query='';status=type='all';from=to=''; ['adm-search','adm-f-from','adm-f-to'].forEach(function(id){$(id).value='';}); $('adm-f-status').value=$('adm-f-type').value='all';render();};
    $('adm-retry').onclick=load; await load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
