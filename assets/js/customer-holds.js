/* Authenticated customer's real Supabase hold history. */
(function () {
  'use strict';
  var rows = [];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (value) {
    var el = document.createElement('span'); el.textContent = value == null ? '' : String(value); return el.innerHTML;
  };
  var date = function (value) { return value ? new Date(value).toLocaleDateString() : '—'; };
  var title = function (r) {
    var p = r.product_type === 'diamond' ? r.diamonds : r.jewellery;
    if (!p) return r.product_type === 'diamond' ? 'Diamond' : 'Jewellery';
    return p.product_name || p.name || p.stock_number || p.sku || (r.product_type === 'diamond' ? 'Diamond' : 'Jewellery');
  };
  var ref = function (r) {
    var p = r.product_type === 'diamond' ? r.diamonds : r.jewellery;
    return (p && (p.stock_number || p.sku)) || (r.product_type === 'diamond' ? r.diamond_id : r.jewellery_id);
  };
  function chip(r) { return '<span class="ngd-status-chip">' + esc(r.status) + '</span>'; }
  function details(r) {
    return '<div class="ngd-req-detail" data-req-detail hidden><dl class="row small mb-2">' +
      '<dt class="col-sm-3">Hold ID</dt><dd class="col-sm-9">' + esc(r.public_id) + '</dd>' +
      '<dt class="col-sm-3">Product</dt><dd class="col-sm-9">' + esc(title(r)) + ' (' + esc(ref(r)) + ')</dd>' +
      '<dt class="col-sm-3">Your message</dt><dd class="col-sm-9">' + esc(r.customer_message || '—') + '</dd>' +
      '<dt class="col-sm-3">Admin note</dt><dd class="col-sm-9">' + esc(r.admin_note || '—') + '</dd></dl></div>';
  }
  function matching() {
    var q = $('req-search').value.trim().toLowerCase(), status = $('req-status').value;
    return rows.filter(function (r) {
      var day = (r.requested_at || '').slice(0, 10);
      return (status === 'all' || r.status === status) && (!$('req-from').value || day >= $('req-from').value) &&
        (!$('req-to').value || day <= $('req-to').value) && (!q || (r.public_id + ' ' + title(r) + ' ' + ref(r) + ' ' + r.status).toLowerCase().includes(q));
    });
  }
  function bind() {
    document.querySelectorAll('[data-hold-toggle]').forEach(function (button) {
      button.onclick = function () {
        var detail = button.closest('[data-hold-row]').querySelector('[data-req-detail]');
        detail.hidden = !detail.hidden; button.textContent = detail.hidden ? 'View Details' : 'Hide Details';
      };
    });
  }
  function render() {
    var visible = matching();
    $('req-count').textContent = 'Showing ' + visible.length + ' of ' + rows.length + ' holds';
    $('req-stage-loading').hidden = true; $('req-stage-error').hidden = true;
    $('req-stage-empty').hidden = rows.length !== 0; $('req-no-match').hidden = !rows.length || visible.length !== 0;
    $('req-table-wrap').innerHTML = visible.length ? '<div class="ngd-table-card"><div class="table-responsive"><table class="table ngd-table mb-0"><thead><tr><th>Hold ID</th><th>Product</th><th>Requested Date</th><th>Expiry Date</th><th>Status</th><th></th></tr></thead><tbody>' + visible.map(function (r) {
      return '<tr data-hold-row><td>' + esc(r.public_id) + '</td><td>' + esc(title(r)) + '<span class="d-block small ngd-text-muted">' + esc(ref(r)) + '</span></td><td>' + date(r.requested_at) + '</td><td>' + date(r.expires_at) + '</td><td>' + chip(r) + '</td><td><button class="ngd-btn ngd-btn-outline ngd-btn-sm" data-hold-toggle>View Details</button>' + details(r) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>' : '';
    $('req-cards-wrap').innerHTML = visible.map(function (r) { return '<article class="ngd-req-card" data-hold-row><div class="d-flex justify-content-between"><strong>' + esc(r.public_id) + '</strong>' + chip(r) + '</div><h2 class="fs-6 mt-3">' + esc(title(r)) + '</h2><p class="small ngd-text-muted">Requested ' + date(r.requested_at) + ' · Expires ' + date(r.expires_at) + '</p><button class="ngd-btn ngd-btn-outline ngd-btn-sm" data-hold-toggle>View Details</button>' + details(r) + '</article>'; }).join('');
    bind();
  }
  async function load() {
    $('req-stage-loading').hidden = false;
    var result = await window.ngdSupabase.from('holds').select('*, diamonds(*), jewellery(*)').order('requested_at', { ascending: false });
    if (result.error) { console.error('[NGD Holds] load failed:', result.error); $('req-stage-loading').hidden = true; $('req-stage-error').hidden = false; return; }
    rows = result.data || []; render();
  }
  async function init() {
    var auth = await window.NGDAuth.requireCustomer(); if (!auth) return;
    document.querySelectorAll('[data-ngd-field="first_name"]').forEach(function (el) { el.textContent = (auth.profile.full_name || 'there').split(/\s+/)[0]; });
    ['pending', 'active', 'released', 'expired', 'rejected'].forEach(function (s) { $('req-status').insertAdjacentHTML('beforeend', '<option value="' + s + '">' + s[0].toUpperCase() + s.slice(1) + '</option>'); });
    ['req-search', 'req-status', 'req-from', 'req-to'].forEach(function (id) { $(id).addEventListener(id === 'req-search' ? 'input' : 'change', render); });
    $('req-clear').onclick = function () { $('req-search').value = ''; $('req-status').value = 'all'; $('req-from').value = ''; $('req-to').value = ''; render(); };
    $('req-retry').onclick = load; await load();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
