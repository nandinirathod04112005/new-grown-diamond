/* ============================================================
   Admin Customers tests (STEP 28).
   Logs in as the mocked admin and verifies the Customers
   console: shell with the Customers route active, the 9-column
   table over the invented demo accounts, search / status +
   country filters / sort / pagination, the honest demo
   activate-deactivate toggle, the details panel (identity,
   recent quotes/holds/inspections/enquiries — all chipped
   Demo), the View Quotes panel shortcut, the View Enquiries
   deep link into the Enquiries console, the loading/empty/
   error previews, guards and the table-vs-cards behaviour at
   1440/768/390.
   Run:  node tests/admin-customers-ui.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const ADMIN = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@ngd.test', password: 'Admin#12345',
  profile: { role: 'admin', account_status: 'active', full_name: 'Asha Admin', company_name: null, phone: '+911111111111' },
};
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt() {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ sub: ADMIN.id, email: ADMIN.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig';
}
function userObject() {
  return {
    id: ADMIN.id, aud: 'authenticated', role: 'authenticated', email: ADMIN.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: ADMIN.profile.full_name },
    identities: [{ identity_id: 'ii-1', id: ADMIN.id, user_id: ADMIN.id, provider: 'email', identity_data: { email: ADMIN.email, sub: ADMIN.id }, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z' }],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
async function mockBackend(route) {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const json = (status, obj) =>
    route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
  if (method === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: { ...CORS, 'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
      body: '',
    });
  }
  if (url.pathname === '/auth/v1/token' && method === 'POST') {
    const body = JSON.parse(req.postData() || '{}');
    const grant = url.searchParams.get('grant_type');
    const ok = grant === 'refresh_token' ||
      (body.email === ADMIN.email && body.password === ADMIN.password);
    if (!ok) return json(400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials', message: 'Invalid login credentials' });
    return json(200, {
      access_token: makeJwt(), token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'rt-1', user: userObject(),
    });
  }
  if (url.pathname === '/auth/v1/user' && method === 'GET') {
    const auth = req.headers()['authorization'] || '';
    if (!/Bearer .+\.testsig$/.test(auth)) return json(401, { code: 'no_session', error_code: 'no_session', msg: 'missing sub claim', message: 'missing sub claim' });
    return json(200, userObject());
  }
  if (url.pathname === '/auth/v1/logout' && method === 'POST') {
    return route.fulfill({ status: 204, headers: CORS, body: '' });
  }
  if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
    const row = { id: ADMIN.id, email: ADMIN.email, ...ADMIN.profile, created_at: '2026-01-01T00:00:00Z' };
    const accept = req.headers()['accept'] || '';
    if (accept.includes('vnd.pgrst.object')) return json(200, row);
    return json(200, [row]);
  }
  return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', mockBackend);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

async function openCustomers(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/customers.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + table: Customers route active, 9 columns, recently-joined order', {}, async (page) => {
    await openCustomers(page);
    const state = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.ngd-admin-table thead th')]
        .map((t) => t.textContent.trim());
      const first = document.querySelector('#adm-table-body tr');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
        title: document.querySelector('h1').textContent.trim(),
        notice: document.getElementById('adm-demo-note').textContent.replace(/\s+/g, ' '),
        heads,
        rows: document.querySelectorAll('#adm-table-body tr').length,
        count: document.getElementById('adm-count').textContent,
        firstName: first.querySelector('strong').textContent.trim(),
        actions: first.querySelectorAll('[data-adm-act]').length,
        total: (window.NGD_DEMO_CUSTOMERS || []).length,
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.active === 'customers', 'Customers route active, got ' + state.active);
    expect(state.title === 'Customers', 'page title, got ' + state.title);
    expect(/invented sample records/i.test(state.notice) &&
      /nothing is saved to any server/i.test(state.notice), 'honest demo notice');
    expect(JSON.stringify(state.heads) === JSON.stringify(
      ['Customer Name', 'Company', 'Email', 'Mobile', 'Country',
        'Account Status', 'Joined', 'Last Activity', 'Actions']),
      'nine columns per spec, got ' + state.heads.join(','));
    expect(state.rows === 10, 'first page holds 10 rows, got ' + state.rows);
    expect(state.total === 14 && new RegExp('of ' + state.total).test(state.count) &&
      /demo customers/.test(state.count), 'count reflects the demo accounts, got ' + state.count);
    expect(state.firstName === 'Omar Haddad', 'newest account first, got ' + state.firstName);
    expect(state.actions === 4, 'four actions per row, got ' + state.actions);
  });

  await scenario('search, status + country filters and sort', {}, async (page) => {
    await openCustomers(page);
    await page.fill('#adm-search', 'CU-1003');
    let rows = await page.evaluate(() => document.querySelectorAll('#adm-table-body tr').length);
    expect(rows === 1, 'id search narrows to one, got ' + rows);
    await page.fill('#adm-search', 'mehta');
    let state = await page.evaluate(() => ({
      names: [...document.querySelectorAll('#adm-table-body tr strong')].map((n) => n.textContent.trim()),
    }));
    expect(state.names.length === 1 && state.names[0] === 'Priya Mehta',
      'name/company search finds the account, got ' + state.names.join(','));
    await page.click('#adm-clear');
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    await page.selectOption('#adm-f-status', 'Inactive');
    state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')),
      dimmed: [...document.querySelectorAll('#adm-table-body tr')].every((r) => r.classList.contains('is-inactive')),
      chip: document.getElementById('adm-filter-count').textContent.trim(),
    }));
    expect(JSON.stringify(state.ids.slice().sort()) === JSON.stringify(['CU-1010', 'CU-1014']),
      'inactive filter finds the two dormant accounts, got ' + state.ids.join(','));
    expect(state.dimmed && state.chip === '1', 'rows muted and badge counts');
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-country', 'India');
    state = await page.evaluate(() => ({
      countries: [...document.querySelectorAll('#adm-table-body tr td:nth-child(5)')].map((t) => t.textContent.trim()),
    }));
    expect(state.countries.length === 3 && state.countries.every((c) => c === 'India'),
      'country filter applies, got ' + state.countries.join(','));
    await page.click('#adm-clear');
    await page.selectOption('#adm-sort', 'name');
    const firstName = await page.evaluate(() =>
      document.querySelector('#adm-table-body tr strong').textContent.trim());
    expect(firstName === 'Aisha Al Farsi', 'name sort applies, got ' + firstName);
  });

  await scenario('pagination pages through the accounts', {}, async (page) => {
    await openCustomers(page);
    await page.click('#adm-pagination [data-adm-page="2"]');
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      count: document.getElementById('adm-count').textContent,
      active: document.querySelector('#adm-pagination .page-item.active .page-link').textContent.trim(),
    }));
    expect(state.active === '2' && state.rows === 4, 'second page holds the remaining accounts');
    expect(/Showing 11–14 of 14/.test(state.count), 'count window follows, got ' + state.count);
  });

  await scenario('honest demo toggle: deactivate + reactivate with truthful toasts', {}, async (page) => {
    await openCustomers(page);
    await page.fill('#adm-search', 'CU-1002');
    await page.click('[data-adm-row="CU-1002"] [data-adm-act="active"]');
    let state = await page.evaluate(() => ({
      chip: document.querySelector('#adm-table-body tr td:nth-child(6)').textContent.trim(),
      dimmed: document.querySelector('[data-adm-row="CU-1002"]').classList.contains('is-inactive'),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.chip === 'Inactive' && state.dimmed, 'deactivated in the preview');
    expect(/deactivated in this demo preview/i.test(state.toast) &&
      /nothing was saved to any server/i.test(state.toast),
      'honest deactivate toast, got: ' + state.toast);
    expect(!/success|saved!/i.test(state.toast), 'no fake success wording');
    await page.click('[data-adm-row="CU-1002"] [data-adm-act="active"]');
    state = await page.evaluate(() => ({
      chip: document.querySelector('#adm-table-body tr td:nth-child(6)').textContent.trim(),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.chip === 'Active' && /activated in this demo preview/i.test(state.toast),
      'reactivated in the preview');
  });

  await scenario('details panel: identity + recent activity lists, quotes shortcut, close', {}, async (page) => {
    await openCustomers(page);
    await page.fill('#adm-search', 'CU-1003');
    await page.click('[data-adm-row="CU-1003"] [data-adm-act="view"]');
    let state = await page.evaluate(() => {
      const panel = document.getElementById('cust-detail');
      const secs = [...panel.querySelectorAll('[data-cust-sec]')].map((s) => s.getAttribute('data-cust-sec'));
      return {
        shown: !panel.hidden,
        name: panel.querySelector('h2').textContent.trim(),
        meta: panel.querySelector('.ngd-req-meta').textContent.replace(/\s+/g, ' '),
        secs,
        quoteRows: panel.querySelectorAll('[data-cust-sec="quotes"] .ngd-dash-row').length,
        demoChips: panel.querySelectorAll('.ngd-demo-chip').length,
        enqLink: (panel.querySelector('[data-cust-sec="enquiries"] a.ngd-link') || {}).getAttribute?.('href'),
        footer: panel.textContent.replace(/\s+/g, ' '),
      };
    });
    expect(state.shown && state.name === 'Aisha Al Farsi', 'panel opens with the account name');
    expect(/aisha@alfarsijewels\.example/.test(state.meta) && /United Arab Emirates/.test(state.meta) &&
      /2026-03-02/.test(state.meta), 'identity meta filled');
    expect(JSON.stringify(state.secs) === JSON.stringify(['quotes', 'holds', 'inspections', 'enquiries']),
      'four recent-activity sections, got ' + state.secs.join(','));
    expect(state.quoteRows === 2 && state.demoChips >= 3, 'sample activity rows all chipped Demo');
    expect(state.enqLink === 'enquiries.html?customer=CU-1003', 'enquiries console link carries the account');
    expect(/generated sample data, not live records/i.test(state.footer), 'honest panel footer');
    await page.click('#cust-detail-close');
    let hidden = await page.evaluate(() => document.getElementById('cust-detail').hidden);
    expect(hidden, 'close hides the panel');
    /* the View Quotes action reopens the panel at its quotes list */
    await page.click('[data-adm-row="CU-1003"] [data-adm-act="quotes"]');
    state = await page.evaluate(() => ({
      shown: !document.getElementById('cust-detail').hidden,
      quotes: !!document.querySelector('#cust-detail [data-cust-sec="quotes"] .ngd-dash-row'),
    }));
    expect(state.shown && state.quotes, 'View Quotes opens the profile at its quotes');
    /* an account with no demo quotes shows the honest empty line */
    await page.click('#adm-clear');
    await page.fill('#adm-search', 'CU-1001');
    await page.click('[data-adm-row="CU-1001"] [data-adm-act="view"]');
    const emptyLine = await page.evaluate(() =>
      document.querySelector('#cust-detail [data-cust-sec="quotes"]').textContent.replace(/\s+/g, ' '));
    expect(/No demo quotes for this account yet/i.test(emptyLine), 'honest empty activity line');
  });

  await scenario('View Enquiries deep-links into the filtered Enquiries console', {}, async (page) => {
    await openCustomers(page);
    await page.fill('#adm-search', 'CU-1005');
    await page.click('[data-adm-row="CU-1005"] [data-adm-act="enquiries"]');
    await page.waitForURL('**/admin/enquiries.html?customer=CU-1005', { timeout: 8000 });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0);
    const state = await page.evaluate(() => ({
      search: document.getElementById('adm-search').value,
      ids: [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')),
    }));
    expect(state.search === 'CU-1005', 'search pre-filled with the account id');
    expect(JSON.stringify(state.ids) === JSON.stringify(['ENQ-2013', 'ENQ-2003']),
      'only that account\'s enquiries listed, got ' + state.ids.join(','));
  });

  await scenario('UI states: loading, empty and error with retry', {}, async (page) => {
    await openCustomers(page);
    await page.click('[data-adm-state="loading"]');
    let state = await page.evaluate(() => ({
      loading: !document.getElementById('adm-stage-loading').hidden,
      tableHidden: document.getElementById('adm-table-card').hidden,
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.loading && state.tableHidden, 'loading skeletons replace the table');
    expect(/no data is being loaded/i.test(state.count), 'honest preview note');
    await page.click('[data-adm-state="empty"]');
    state = await page.evaluate(() => ({
      empty: !document.getElementById('adm-stage-empty').hidden,
      text: document.getElementById('adm-stage-empty').textContent.replace(/\s+/g, ' '),
    }));
    expect(state.empty && /No customers yet/i.test(state.text), 'empty design present');
    await page.click('[data-adm-state="error"]');
    await page.click('#adm-retry');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      on: document.querySelector('[data-adm-state="demo"]').classList.contains('is-on'),
    }));
    expect(state.rows === 10 && state.on, 'retry returns to the rows');
  });

  await scenario('guard: customers without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/admin/customers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked cards with initials avatars, no page overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openCustomers(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#adm-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        avatar: cards[0].querySelector('.ngd-init-avatar').textContent.trim(),
        actionH: cards[0].querySelector('.ngd-icon-btn').getBoundingClientRect().height,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden, 'table hidden on mobile');
    expect(state.cards === 10 && state.perRow === 1, 'stacked cards, got ' + state.perRow + ' per row');
    expect(/^[A-Z]{2}$/.test(state.avatar), 'initials avatar, got ' + state.avatar);
    expect(state.actionH >= 30, 'touch-friendly action buttons');
    expect(state.bodyW <= state.clientW + 1, `no page overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-customers-mobile.png') });
  });

  await scenario('tablet 768: compact table scrolls inside its card, page itself does not', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openCustomers(page);
    const state = await page.evaluate(() => {
      const wrap = document.querySelector('#adm-table-card .table-responsive');
      window.scrollTo(9999, 0);
      return {
        tableShown: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display !== 'none',
        cardsHidden: getComputedStyle(document.getElementById('adm-cards-wrap')).display === 'none',
        contained: wrap.scrollWidth >= wrap.clientWidth &&
          getComputedStyle(wrap).overflowX !== 'visible',
        pageScrollX: window.scrollX,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableShown && state.cardsHidden, 'compact table layout at 768');
    expect(state.contained, 'any overflow stays inside the table card');
    expect(state.pageScrollX === 0 && state.bodyW <= state.clientW + 1,
      `page itself cannot scroll sideways (x=${state.pageScrollX})`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    const o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-customers-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-customers scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
