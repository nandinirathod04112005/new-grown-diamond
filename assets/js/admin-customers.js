/* Live, RLS-protected administration of customer profiles. */
(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var ALLOWED_STATUSES = ['active', 'inactive', 'suspended'];
  var state = { rows: [], query: '', status: 'all', sort: 'joined-desc', page: 1, detailId: null };
  function $(id) { return document.getElementById(id); }
  function esc(value) { var d = document.createElement('div'); d.textContent = value == null ? '' : String(value); return d.innerHTML; }
  function pretty(value) { value = String(value || ''); return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'; }
  function date(value) { if (!value) return '—'; var d = new Date(value); return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  function initials(name) { var p = String(name || 'Customer').trim().split(/\s+/); return ((p[0][0] || '') + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function fill(field, value) { document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) { el.textContent = value; }); }

  function toast(message, error) {
    $('adm-toast').innerHTML = '<div class="ngd-alert ' + (error ? 'ngd-alert-error' : 'ngd-alert-success') + '" role="status">' + esc(message) + '</div>';
  }
  function showStage(stage) {
    $('adm-stage-loading').hidden = stage !== 'loading'; $('adm-stage-error').hidden = stage !== 'error';
    $('adm-stage-empty').hidden = stage !== 'empty'; $('adm-table-card').hidden = stage !== 'rows';
    $('adm-cards-wrap').hidden = stage !== 'rows'; $('adm-pagination').hidden = stage !== 'rows';
  }

  async function loadCustomers() {
    showStage('loading'); $('adm-count').textContent = 'Loading customers…';
    var res = await window.ngdSupabase.from('profiles')
      .select('id, full_name, company_name, phone, account_status, created_at')
      .eq('role', 'customer').order('created_at', { ascending: false });
    if (res.error) { showStage('error'); $('adm-count').textContent = 'Customers could not be loaded'; throw res.error; }
    state.rows = res.data || []; state.page = 1; render();
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    var rows = state.rows.filter(function (r) {
      var haystack = [r.full_name, r.company_name, r.phone].join(' ').toLowerCase();
      return (!q || haystack.indexOf(q) !== -1) && (state.status === 'all' || r.account_status === state.status);
    });
    rows.sort(state.sort === 'name' ? function (a, b) { return String(a.full_name || '').localeCompare(String(b.full_name || '')); }
      : state.sort === 'company' ? function (a, b) { return String(a.company_name || '').localeCompare(String(b.company_name || '')); }
        : function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    return rows;
  }
  function statusChip(status) { var cls = status === 'active' ? 'is-good' : status === 'suspended' ? 'is-gold' : 'is-dim'; return '<span class="ngd-status-chip ' + cls + '">' + esc(pretty(status)) + '</span>'; }
  function viewButton(r) { return '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-adm-view aria-label="View ' + esc(r.full_name || 'customer') + '">View Details</button>'; }
  function tableRow(r) { return '<tr data-adm-row="' + esc(r.id) + '"><td><strong>' + esc(r.full_name || '—') + '</strong></td><td>' + esc(r.company_name || '—') + '</td><td>' + esc(r.phone || '—') + '</td><td>' + statusChip(r.account_status) + '</td><td class="text-nowrap">' + esc(date(r.created_at)) + '</td><td class="text-end">' + viewButton(r) + '</td></tr>'; }
  function card(r) { return '<article class="ngd-req-card" data-adm-row="' + esc(r.id) + '"><div class="d-flex align-items-center gap-3"><span class="ngd-init-avatar">' + esc(initials(r.full_name)) + '</span><div class="flex-grow-1"><strong>' + esc(r.full_name || '—') + '</strong><span class="d-block small ngd-text-muted">' + esc(r.company_name || 'Individual account') + '</span></div>' + statusChip(r.account_status) + '</div><dl class="ngd-req-meta"><div><dt>Phone</dt><dd>' + esc(r.phone || '—') + '</dd></div><div><dt>Joined</dt><dd>' + esc(date(r.created_at)) + '</dd></div></dl>' + viewButton(r) + '</article>'; }
  function bindViews(root) { root.querySelectorAll('[data-adm-view]').forEach(function (b) { b.addEventListener('click', function () { openDetail(b.closest('[data-adm-row]').getAttribute('data-adm-row')); }); }); }
  function pagination(total) {
    var pages = Math.ceil(total / PAGE_SIZE), html = '';
    if (pages > 1) { html = '<nav aria-label="Customer pages"><ul class="pagination ngd-pagination mb-0">'; for (var i = 1; i <= pages; i++) html += '<li class="page-item ' + (i === state.page ? 'active' : '') + '"><button class="page-link" data-page="' + i + '">' + i + '</button></li>'; html += '</ul></nav>'; }
    $('adm-pagination').innerHTML = html; $('adm-pagination').querySelectorAll('[data-page]').forEach(function (b) { b.onclick = function () { state.page = Number(b.dataset.page); render(); }; });
  }
  function render() {
    var rows = filtered(), start = (state.page - 1) * PAGE_SIZE; if (start >= rows.length) { state.page = 1; start = 0; }
    var shown = rows.slice(start, start + PAGE_SIZE), empty = state.rows.length === 0;
    $('adm-table-body').innerHTML = shown.map(tableRow).join(''); $('adm-cards-wrap').innerHTML = shown.map(card).join('');
    bindViews($('adm-table-body')); bindViews($('adm-cards-wrap')); pagination(rows.length);
    $('adm-count').textContent = rows.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + PAGE_SIZE, rows.length) + ' of ' + rows.length + ' customers' : (empty ? 'No customers' : 'No matching customers');
    $('adm-filter-count').textContent = state.status === 'all' ? '' : '1'; $('adm-filter-count').classList.toggle('d-none', state.status === 'all');
    showStage(empty ? 'empty' : 'rows'); $('adm-no-match').hidden = empty || rows.length !== 0;
  }

  function recordLabel(type, r) { return esc(r.public_id || r.reference || r.id || type.slice(0, -1)); }
  function relatedRows(type, rows) {
    if (!rows.length) return '<p class="ngd-text-muted small mb-0">No ' + esc(type) + ' for this customer yet.</p>';
    return rows.slice(0, 5).map(function (r) { return '<div class="ngd-dash-row"><div><strong class="small">' + recordLabel(type, r) + '</strong><span class="d-block small ngd-text-muted">' + esc(date(r.created_at)) + '</span></div>' + statusChip(r.status) + '</div>'; }).join('');
  }
  async function fetchRelated(userId) {
    var names = ['quotes', 'holds', 'inspections', 'enquiries'];
    var results = await Promise.all(names.map(function (name) { return window.ngdSupabase.from(name).select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5); }));
    var out = {}; names.forEach(function (name, i) { out[name] = results[i].error ? null : (results[i].data || []); }); return out;
  }
  async function openDetail(id) {
    var r = state.rows.find(function (x) { return x.id === id; }); if (!r) return;
    state.detailId = id; var panel = $('cust-detail'); panel.hidden = false; panel.innerHTML = '<p class="ngd-text-muted mb-0">Loading customer details…</p>';
    var related = await fetchRelated(id); if (state.detailId !== id) return;
    var options = ALLOWED_STATUSES.map(function (s) { return '<option value="' + s + '" ' + (s === r.account_status ? 'selected' : '') + '>' + pretty(s) + '</option>'; }).join('');
    panel.innerHTML = '<div class="d-flex flex-wrap align-items-center gap-3"><span class="ngd-init-avatar">' + esc(initials(r.full_name)) + '</span><div class="flex-grow-1"><h2 class="ngd-title fs-5 mb-0">' + esc(r.full_name || '—') + '</h2><span class="small ngd-text-muted">' + esc(r.company_name || 'Individual account') + '</span></div><button class="ngd-btn ngd-btn-outline ngd-btn-sm" id="cust-detail-close">Close</button></div>' +
      '<dl class="ngd-req-meta mt-3"><div><dt>Full name</dt><dd>' + esc(r.full_name || '—') + '</dd></div><div><dt>Company</dt><dd>' + esc(r.company_name || '—') + '</dd></div><div><dt>Phone</dt><dd>' + esc(r.phone || '—') + '</dd></div><div><dt>Account status</dt><dd>' + statusChip(r.account_status) + '</dd></div><div><dt>Joined</dt><dd>' + esc(date(r.created_at)) + '</dd></div></dl>' +
      '<div class="ngd-form mt-3"><label class="form-label" for="cust-status">Change account status</label><div class="d-flex gap-2"><select class="form-select" id="cust-status">' + options + '</select><button class="ngd-btn ngd-btn-dark ngd-btn-sm" id="cust-status-save">Save</button></div></div>' +
      ['quotes', 'holds', 'inspections', 'enquiries'].map(function (name) { return '<section class="mt-3" data-cust-sec="' + name + '"><h3 class="ngd-eyebrow mb-2">Recent ' + pretty(name) + '</h3>' + (related[name] === null ? '<p class="ngd-text-muted small mb-0">' + pretty(name) + ' are not available.</p>' : relatedRows(name, related[name])) + '</section>'; }).join('');
    $('cust-detail-close').onclick = function () { panel.hidden = true; state.detailId = null; };
    $('cust-status-save').onclick = function () { updateStatus(r, $('cust-status').value, this); };
  }
  async function updateStatus(row, newStatus, button) {
    if (ALLOWED_STATUSES.indexOf(newStatus) === -1 || newStatus === row.account_status) return;
    button.disabled = true; button.textContent = 'Saving…';
    var res = await window.ngdSupabase.rpc('admin_set_customer_status', { target_user_id: row.id, new_status: newStatus });
    if (res.error || res.data !== newStatus) { toast('Status was not changed' + (res.error ? ': ' + res.error.message : '.'), true); button.disabled = false; button.textContent = 'Save'; return; }
    row.account_status = newStatus; toast((row.full_name || 'Customer') + ' is now ' + newStatus + '.'); render(); await openDetail(row.id);
  }
  function toolbar() {
    ALLOWED_STATUSES.forEach(function (s) { var o = document.createElement('option'); o.value = s; o.textContent = pretty(s); $('adm-f-status').appendChild(o); });
    $('adm-search').oninput = function () { state.query = this.value; state.page = 1; render(); };
    $('adm-sort').onchange = function () { state.sort = this.value; render(); };
    $('adm-f-status').onchange = function () { state.status = this.value; state.page = 1; render(); };
    $('adm-clear').onclick = function () { state.query = ''; state.status = 'all'; state.page = 1; $('adm-search').value = ''; $('adm-f-status').value = 'all'; render(); };
    $('adm-retry').onclick = function () { loadCustomers().catch(function () {}); };
  }
  async function init() { var auth = await window.NGDAuth.requireAdmin(); if (!auth) return; fill('first_name', String(auth.profile.full_name || 'there').split(/\s+/)[0]); toolbar(); await loadCustomers().catch(function (e) { console.error('[Admin customers]', e); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
