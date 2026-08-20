/* ============================================================
   NEW GROWN DIAMOND — CUSTOMER DASHBOARD (LIVE)
   ------------------------------------------------------------
   Guarded by requireCustomer(). Every widget reads the signed-in
   customer's OWN rows (favourites, quotes, holds, inspections,
   enquiries — RLS scopes each query to auth.uid(), and the
   queries filter on user_id as well). Counts use head+count
   requests, the three panels show the latest real records, and a
   widget that fails leaves the others standing. Profile editing
   saves safe fields only, through the customer_update_own_profile
   RPC — role and account status can never be changed here.
   ============================================================ */
(function () {
  'use strict';

  var userId = null;

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    var node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }
  function fill(field, value) {
    document.querySelectorAll('[data-ngd-field="' + field + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }
  function pretty(value, fallback) {
    var v = (value == null ? '' : String(value)).trim();
    return v ? v : fallback || '—';
  }
  function setPanelState(panel, state) {
    panel.querySelectorAll('[data-dash-show]').forEach(function (block) {
      block.hidden = block.getAttribute('data-dash-show') !== state;
    });
  }
  function panel(name) { return document.querySelector('[data-dash-preview="' + name + '"]'); }
  function list(name) { return document.querySelector('[data-dash-list="' + name + '"]'); }

  /* ---------------- metric counts ---------------- */

  var METRICS = [
    { key: 'saved_diamonds', table: 'favourites', apply: function (q) { return q.eq('product_type', 'diamond'); } },
    { key: 'saved_jewellery', table: 'favourites', apply: function (q) { return q.eq('product_type', 'jewellery'); } },
    { key: 'quotes', table: 'quotes' },
    { key: 'holds', table: 'holds' },
    { key: 'inspections', table: 'inspections' },
    { key: 'enquiries', table: 'enquiries' }
  ];

  async function loadMetrics() {
    var failed = 0;
    await Promise.all(METRICS.map(async function (item) {
      var card = document.querySelector('[data-dash-metric="' + item.key + '"] [data-dash-value]');
      if (!card) return;
      try {
        var query = window.ngdSupabase.from(item.table)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (item.apply) query = item.apply(query);
        var result = await query;
        if (result.error) throw result.error;
        card.textContent = String(result.count || 0);
      } catch (err) {
        failed += 1;
        card.textContent = '—';
      }
    }));
    var note = document.querySelector('[data-dash-metric-note]');
    if (note) {
      note.textContent = failed
        ? 'Some counts could not be loaded — the rest are live from your account.'
        : 'Live counts from your account.';
    }
    return failed;
  }

  /* ---------------- panels ---------------- */

  function statusChip(status, goodSet, goldSet) {
    var s = String(status || '').toLowerCase();
    var cls = (goodSet || []).indexOf(s) !== -1 ? ' is-good'
      : (goldSet || []).indexOf(s) !== -1 ? ' is-gold' : '';
    var label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
    return '<span class="ngd-status-chip' + cls + '">' + esc(label) + '</span>';
  }

  async function loadFavouritesPanel() {
    var box = panel('favourites');
    if (!box) return 0;
    setPanelState(box, 'loading');
    try {
      var res = await window.ngdSupabase.from('favourites')
        .select('product_type, created_at, diamonds(public_id, stock_number, shape, carat), jewellery(public_id, sku, product_name, category)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (res.error) throw res.error;
      var rows = (res.data || []).filter(function (row) {
        return row.product_type === 'diamond' ? row.diamonds : row.jewellery;
      });
      if (!rows.length) { setPanelState(box, 'empty'); return 0; }
      list('favourites').innerHTML = rows.map(function (row) {
        var diamond = row.product_type === 'diamond';
        var item = diamond ? row.diamonds : row.jewellery;
        var title = diamond
          ? (item.stock_number || item.public_id)
          : (item.product_name || item.sku || item.public_id);
        var sub = diamond
          ? [item.shape, item.carat != null ? Number(item.carat).toFixed(2) + ' ct' : null].filter(Boolean).join(' · ') || 'Lab-grown diamond'
          : (item.category || 'Fine jewellery');
        var href = '../' + (diamond ? 'diamond' : 'jewellery') + '-details.html?id=' + encodeURIComponent(item.public_id);
        return '<div class="ngd-dash-row"><span class="ngd-icon-tile">' + (diamond ? '◆' : '✦') + '</span>' +
          '<div class="flex-grow-1 min-w-0"><strong>' + esc(title) + '</strong>' +
          '<span class="ngd-text-muted d-block small">' + esc(sub) + '</span></div>' +
          '<a class="ngd-link small" href="' + href + '">View</a></div>';
      }).join('');
      setPanelState(box, 'data');
      return 0;
    } catch (err) {
      console.error('[NGD Dashboard] favourites panel failed:', err);
      setPanelState(box, 'error');
      return 1;
    }
  }

  async function loadQuotesPanel() {
    var box = panel('quotes');
    if (!box) return 0;
    setPanelState(box, 'loading');
    try {
      var res = await window.ngdSupabase.from('quotes')
        .select('public_id, status, created_at, product_type, diamonds(stock_number, public_id), jewellery(sku, public_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) { setPanelState(box, 'empty'); return 0; }
      list('quotes').innerHTML = rows.map(function (row) {
        var item = row.product_type === 'diamond' ? row.diamonds : row.jewellery;
        var ref = item ? (item.stock_number || item.sku || item.public_id) : 'Product';
        return '<div class="ngd-dash-row"><div class="flex-grow-1 min-w-0"><strong>' + esc(row.public_id) + '</strong>' +
          '<span class="ngd-text-muted d-block small">' + esc(ref) + ' · ' +
          esc(row.product_type === 'diamond' ? 'loose stone' : 'jewellery') + '</span></div>' +
          statusChip(row.status, ['responded'], ['reviewed']) + '</div>';
      }).join('');
      setPanelState(box, 'data');
      return 0;
    } catch (err) {
      console.error('[NGD Dashboard] quotes panel failed:', err);
      setPanelState(box, 'error');
      return 1;
    }
  }

  async function loadEnquiriesPanel() {
    var box = panel('enquiries');
    if (!box) return 0;
    setPanelState(box, 'loading');
    try {
      var res = await window.ngdSupabase.from('enquiries')
        .select('public_id, subject, message, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) { setPanelState(box, 'empty'); return 0; }
      list('enquiries').innerHTML = rows.map(function (row) {
        var snippet = String(row.message || '').slice(0, 90);
        return '<div class="ngd-dash-row"><div class="flex-grow-1 min-w-0"><strong>' + esc(row.subject || row.public_id) + '</strong>' +
          '<span class="ngd-text-muted d-block small">' + esc(snippet) + (String(row.message || '').length > 90 ? '…' : '') + '</span></div>' +
          statusChip(row.status, ['responded'], ['in_progress']) + '</div>';
      }).join('');
      setPanelState(box, 'data');
      return 0;
    } catch (err) {
      console.error('[NGD Dashboard] enquiries panel failed:', err);
      setPanelState(box, 'error');
      return 1;
    }
  }

  function bindRetries() {
    document.querySelectorAll('[data-dash-retry]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadFavouritesPanel();
        loadQuotesPanel();
        loadEnquiriesPanel();
      });
    });
  }

  /* ---------------- profile editing (safe fields via RPC) ---------------- */

  function profileAlert(type, message) {
    $('profile-alert').innerHTML =
      '<div class="ngd-alert ngd-alert-' + type + '" role="' + (type === 'danger' ? 'alert' : 'status') + '">' +
      esc(message) + '</div>';
  }

  function fillProfile(profile, email) {
    fill('full_name', pretty(profile.full_name));
    fill('email', pretty(profile.email || email));
    fill('company_name', pretty(profile.company_name));
    fill('phone', pretty(profile.phone));
    fill('country', pretty(profile.country));
    fill('role', pretty(profile.role, 'customer'));
    fill('account_status', pretty(profile.account_status, 'active'));
    var name = pretty(profile.full_name, '');
    fill('first_name', name ? name.split(/\s+/)[0] : 'there');
    if ($('profile-full-name')) {
      $('profile-full-name').value = profile.full_name || '';
      $('profile-company').value = profile.company_name || '';
      $('profile-phone').value = profile.phone || '';
      $('profile-country').value = profile.country || '';
    }
  }

  function initProfileForm(email) {
    var form = $('profile-form');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = $('profile-save');
      var fullName = $('profile-full-name').value.trim();
      if (fullName.length < 2) {
        profileAlert('danger', 'Please enter your full name.');
        return;
      }
      button.disabled = true;
      try {
        var res = await window.ngdSupabase.rpc('customer_update_own_profile', {
          new_full_name: fullName,
          new_company_name: $('profile-company').value.trim() || null,
          new_phone: $('profile-phone').value.trim() || null,
          new_country: $('profile-country').value.trim() || null
        });
        if (res.error) throw res.error;
        fillProfile(res.data || {}, email);
        profileAlert('success', 'Your profile was updated.');
      } catch (err) {
        console.error('[NGD Dashboard] profile save failed:', err);
        profileAlert('danger', 'Your profile could not be saved. Check your connection and try again.');
      }
      button.disabled = false;
    });
  }

  /* ---------------- boot ---------------- */

  async function init() {
    var res = await window.NGDAuth.requireCustomer();
    if (!res) return; // a redirect is already happening

    userId = res.user.id;
    fillProfile(res.profile, res.user.email);
    initProfileForm(res.user.email);
    bindRetries();

    /* independent widgets — one failure never blanks the rest */
    loadMetrics();
    loadFavouritesPanel();
    loadQuotesPanel();
    loadEnquiriesPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
