(function () {
  'use strict';
  var state = { rows: [], query: '', status: 'all' };
  function $(id) { return document.getElementById(id); }
  function esc(value) { var n = document.createElement('span'); n.textContent = value == null ? '' : String(value); return n.innerHTML; }
  function product(row) {
    var item = row.product_type === 'diamond' ? row.diamonds : row.jewellery;
    if (!item) return { name: 'Unavailable product', ref: '—' };
    return row.product_type === 'diamond'
      ? { name: (item.shape || 'Diamond') + ' · ' + Number(item.carat || 0).toFixed(2) + ' ct', ref: item.stock_number || item.public_id || item.id }
      : { name: item.name || item.product_name || 'Jewellery', ref: item.sku || item.public_id || item.id };
  }
  function notice(message, type) { $('hold-alert').innerHTML = '<div class="ngd-alert ngd-alert-' + type + '">' + esc(message) + '</div>'; }
  async function load() {
    $('hold-count').textContent = 'Loading…';
    var result = await window.ngdSupabase.from('holds').select('*, diamonds(*), jewellery(*)').order('requested_at', { ascending: false });
    if (result.error) throw result.error;
    var rows = result.data || [], ids = rows.map(function (r) { return r.user_id; });
    var profiles = ids.length ? await window.ngdSupabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
    var byId = {}; (profiles.data || []).forEach(function (p) { byId[p.id] = p; });
    state.rows = rows.map(function (r) { r.customer = byId[r.user_id] || {}; return r; }); render();
  }
  function visible() {
    var q = state.query.toLowerCase().trim();
    return state.rows.filter(function (row) { var p = product(row), c = row.customer;
      return (state.status === 'all' || row.status === state.status) && (!q || [row.public_id, p.name, p.ref, c.full_name, c.email].join(' ').toLowerCase().indexOf(q) !== -1);
    });
  }
  function render() {
    var rows = visible(); $('hold-count').textContent = 'Showing ' + rows.length + ' of ' + state.rows.length + ' hold requests';
    $('hold-rows').innerHTML = rows.map(function (row) { var p = product(row), c = row.customer;
      return '<tr data-hold-id="' + esc(row.id) + '"><td class="ngd-stock-cell">' + esc(row.public_id) + '</td><td><strong>' + esc(c.full_name || 'Customer') + '</strong><span class="small ngd-text-muted d-block">' + esc(c.email || row.user_id) + '</span></td><td><strong>' + esc(p.name) + '</strong><span class="small ngd-text-muted d-block">' + esc(p.ref) + '</span></td><td>' + esc(String(row.requested_at || row.created_at).slice(0, 10)) + '</td><td><span class="ngd-status-chip">' + esc(row.status) + '</span></td><td>' + esc(row.expires_at ? String(row.expires_at).slice(0, 10) : '—') + '</td><td><button class="ngd-btn ngd-btn-outline ngd-btn-sm" data-view type="button">View</button></td></tr>';
    }).join('');
    $('hold-rows').querySelectorAll('[data-view]').forEach(function (button) { button.onclick = function () { show(button.closest('tr').getAttribute('data-hold-id')); }; });
  }
  function show(id) {
    var row = state.rows.find(function (r) { return r.id === id; }); if (!row) return;
    var p = product(row), panel = $('hold-detail'); panel.hidden = false;
    panel.innerHTML = '<div class="d-flex justify-content-between"><div><span class="ngd-eyebrow">' + esc(row.public_id) + '</span><h2 class="ngd-title fs-5 mt-1">' + esc(p.name) + '</h2></div><button class="btn-close" id="hold-close" aria-label="Close"></button></div><p class="small"><strong>Customer message:</strong> ' + esc(row.customer_message || '—') + '</p><form class="ngd-form" id="hold-update"><div class="row g-2"><div class="col-md-4"><label class="form-label">Status</label><select class="form-select" id="edit-status">' + ['pending','active','released','expired','rejected'].map(function (s) { return '<option' + (s === row.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div><div class="col-md-4"><label class="form-label">Expiry date</label><input class="form-control" id="edit-expiry" type="datetime-local" value="' + esc(row.expires_at ? String(row.expires_at).slice(0, 16) : '') + '"></div><div class="col-12"><label class="form-label">Admin note</label><textarea class="form-control" id="edit-note" rows="3">' + esc(row.admin_note || '') + '</textarea></div></div><button class="ngd-btn ngd-btn-gold mt-3" id="hold-save" type="submit">Save Hold</button></form>';
    $('hold-close').onclick = function () { panel.hidden = true; };
    $('hold-update').onsubmit = async function (event) {
      event.preventDefault(); $('hold-save').disabled = true;
      var expiry = $('edit-expiry').value;
      var update = { status: $('edit-status').value, expires_at: expiry ? new Date(expiry).toISOString() : null, admin_note: $('edit-note').value.trim() || null };
      var result = await window.ngdSupabase.from('holds').update(update).eq('id', row.id).select().single();
      if (result.error) { notice('The hold could not be updated.', 'danger'); $('hold-save').disabled = false; return; }
      notice(row.public_id + ' updated.', 'success'); await load(); show(row.id);
    };
  }
  async function init() {
    var guard = await window.NGDAuth.requireAdmin(); if (!guard) return;
    try { await load(); } catch (error) { console.error('[NGD Admin Holds]', error); notice('Holds could not be loaded. Please retry.', 'danger'); }
    $('hold-search').oninput = function () { state.query = this.value; render(); };
    $('hold-status').onchange = function () { state.status = this.value; render(); };
    $('hold-retry').onclick = function () { load().catch(function () { notice('Holds could not be loaded.', 'danger'); }); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
