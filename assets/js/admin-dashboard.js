/* New Grown Diamond — real-data admin dashboard. */
(function () {
  'use strict';

  var KPI_QUERIES = [
    { key: 'diamonds', table: 'diamonds', apply: function (q) { return q.is('archived_at', null); } },
    { key: 'jewellery', table: 'jewellery' },
    { key: 'customers', table: 'profiles', apply: function (q) { return q.eq('role', 'customer'); } },
    { key: 'pending_quotes', table: 'quotes', apply: pending },
    { key: 'pending_holds', table: 'holds', apply: pending },
    { key: 'pending_inspections', table: 'inspections', apply: pending },
    { key: 'enquiries', table: 'enquiries', apply: function (q) { return q.in('status', ['new', 'open']); } }
  ];

  var ACTIVITY_QUERIES = [
    { table: 'diamonds', select: 'id,stock_number,shape,created_at', title: 'Diamond added', icon: '◆', href: 'diamonds.html', describe: function (r) { return join([r.stock_number, r.shape]); } },
    { table: 'jewellery', select: 'id,sku,name,created_at', title: 'Jewellery added', icon: '✦', href: 'jewellery.html', describe: function (r) { return join([r.sku, r.name]); } },
    { table: 'profiles', select: 'id,full_name,created_at', title: 'Customer registered', icon: '●', href: 'customers.html', apply: function (q) { return q.eq('role', 'customer'); }, describe: function (r) { return r.full_name || 'Customer'; } },
    { table: 'quotes', select: 'id,public_id,status,created_at', title: 'Quote requested', icon: '❐', href: 'quotes.html', describe: requestDescription },
    { table: 'holds', select: 'id,public_id,status,created_at', title: 'Hold requested', icon: '◔', href: 'holds.html', describe: requestDescription },
    { table: 'inspections', select: 'id,public_id,status,created_at', title: 'Inspection requested', icon: '⌕', href: 'inspections.html', describe: requestDescription },
    { table: 'enquiries', select: 'id,public_id,subject,status,created_at', title: 'Enquiry received', icon: '✉', href: 'enquiries.html', describe: function (r) { return join([r.public_id, r.subject]); } }
  ];

  function pending(q) { return q.eq('status', 'pending'); }
  function join(values) { return values.filter(Boolean).join(' · ') || 'Record added'; }
  function requestDescription(r) { return join([r.public_id, r.status]); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }
  function fill(field, value) {
    document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) { el.textContent = value; });
  }
  function pretty(value, fallback) {
    var v = (value == null ? '' : String(value)).trim();
    return v || fallback || '—';
  }
  function setKpi(key, value, failed) {
    var card = document.querySelector('[data-admin-kpi="' + key + '"]');
    if (!card) return;
    card.classList.toggle('is-unavailable', !!failed);
    var el = card.querySelector('[data-admin-kpi-value]');
    if (el) el.textContent = failed ? '—' : String(value);
  }
  function setStatus(kind, message) {
    var node = document.querySelector('[data-admin-dashboard-status]');
    if (!node) return;
    node.className = kind === 'error' ? 'ngd-alert ngd-alert-warning mt-3' : 'ngd-dash-metric-note mt-2 mb-0';
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    node.textContent = message;
  }

  async function loadKpis() {
    var failed = 0;
    await Promise.all(KPI_QUERIES.map(async function (item) {
      try {
        var query = window.ngdSupabase.from(item.table).select('id', { count: 'exact', head: true });
        if (item.apply) query = item.apply(query);
        var result = await query;
        if (result.error) throw result.error;
        setKpi(item.key, result.count || 0, false);
      } catch (_) {
        failed += 1;
        setKpi(item.key, 0, true);
      }
    }));
    return failed;
  }

  function renderActivity(items, failed) {
    var feed = document.querySelector('[data-admin-feed]');
    if (!feed) return;
    feed.setAttribute('aria-busy', 'false');
    if (!items.length) {
      feed.innerHTML = '<div class="ngd-empty-state py-4" data-admin-activity-empty><strong>' +
        (failed ? 'Activity is unavailable' : 'No recent activity') + '</strong><p class="small ngd-text-muted mb-0">' +
        (failed ? 'Please refresh the page or try again later.' : 'New records will appear here as they are created.') + '</p></div>';
      return;
    }
    feed.innerHTML = items.map(function (item) {
      return '<div class="ngd-dash-row"><span class="ngd-icon-tile">' + escapeHtml(item.icon) + '</span>' +
        '<div class="flex-grow-1 min-w-0"><strong>' + escapeHtml(item.title) + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + escapeHtml(item.description) + ' · ' +
        escapeHtml(new Date(item.created_at).toLocaleString()) + '</span></div>' +
        '<a class="ngd-link small" href="' + escapeHtml(item.href) + '">View</a></div>';
    }).join('');
  }

  async function loadActivity() {
    var failed = 0;
    var groups = await Promise.all(ACTIVITY_QUERIES.map(async function (item) {
      try {
        var query = window.ngdSupabase.from(item.table).select(item.select).order('created_at', { ascending: false }).limit(10);
        if (item.apply) query = item.apply(query);
        var result = await query;
        if (result.error) throw result.error;
        return (result.data || []).map(function (row) {
          return { title: item.title, icon: item.icon, href: item.href, description: item.describe(row), created_at: row.created_at };
        });
      } catch (_) { failed += 1; return []; }
    }));
    var items = [].concat.apply([], groups).filter(function (item) { return item.created_at; })
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 10);
    renderActivity(items, failed === ACTIVITY_QUERIES.length);
    return failed;
  }

  async function loadAdminData() {
    setStatus('loading', 'Loading live dashboard data…');
    var results = await Promise.all([loadKpis(), loadActivity()]);
    var failures = results[0] + results[1];
    setStatus(failures ? 'error' : 'ready', failures
      ? 'Some dashboard data could not be loaded. Available figures are still shown.'
      : 'Live counts from Supabase. Values update when records are added or their status changes.');
  }

  async function init() {
    var res = await window.NGDAuth.requireAdmin();
    if (!res) return;
    var profile = res.profile;
    var fullName = pretty(profile.full_name, '');
    fill('first_name', fullName ? fullName.split(/\s+/)[0] : 'there');
    fill('full_name', pretty(profile.full_name));
    fill('email', pretty(profile.email || res.user.email));
    fill('role', pretty(profile.role, 'admin'));
    fill('account_status', pretty(profile.account_status, 'active'));
    await loadAdminData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
