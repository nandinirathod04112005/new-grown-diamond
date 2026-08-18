/* ============================================================
   Admin Diamond Inventory tests (LIVE, STEP 32).
   Logs in as the mocked admin and verifies the inventory now
   reads public.diamonds through the Supabase client (mocked at
   the network layer, PostgREST-style): the 12-column table over
   the loaded rows newest-first, the truthful "Live inventory"
   note, search by stock/report number, filters + sort +
   pagination, the honest page-only feature/activate/hide
   toggles, the ?added= arrival toast, the REAL loading/empty/
   error lifecycle with retry, guards and the table-vs-cards
   behaviour at 1440/768/390.
   Run:  node tests/admin-diamonds-ui.test.cjs
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

/* ---- a PostgREST-style diamonds store ---- */
function seedDiamonds() {
  const SHAPES = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant'];
  const COLORS = ['D', 'E', 'F', 'G', 'H'];
  const CLAR = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'];
  const CUTS = ['Ideal', 'Excellent', 'Very Good'];
  const LABS = ['IGI', 'GIA', 'HRD'];
  const rows = [];
  for (let i = 0; i < 28; i++) {
    const n = String(i + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    rows.push({
      id: 'uuid-dia-' + n,
      public_id: 'DIA-SEED00' + n,
      stock_number: 'NGD-10' + n,
      report_number: 'LG5824001' + n,
      shape: SHAPES[i % 7],
      carat: +(0.3 + ((i * 13) % 40) / 10).toFixed(2),
      color: COLORS[i % 5], clarity: CLAR[i % 6], cut: CUTS[i % 3],
      polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
      laboratory: LABS[i % 3], certificate_number: 'LG5824001' + n,
      certificate_url: null, measurements: '6.4 × 6.4 × 4.0 mm',
      depth_percentage: 62, table_percentage: 57, ratio: 1,
      growth_method: i % 2 ? 'HPHT' : 'CVD', location: 'Surat atelier',
      availability: i % 4 === 0 ? 'On Request' : 'In Stock',
      price_per_carat: 1200, total_price: 1800, currency: 'USD', price_visible: false,
      featured: i % 5 === 0, active: i % 9 !== 4, internal_notes: null,
      created_by: ADMIN.id,
      created_at: `2026-08-${day}T10:00:00Z`,
      updated_at: `2026-08-${day}T10:00:00Z`,
    });
  }
  return rows;
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const diamonds = opts.emptyInventory ? [] : seedDiamonds();
  async function handler(route) {
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
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      const stockEq = url.searchParams.get('stock_number');
      if (stockEq && stockEq.startsWith('eq.')) {
        rows = rows.filter((d) => d.stock_number === stockEq.slice(3));
      }
      return json(200, rows);
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds };
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
    const backend = makeMock(opts);
    await context.route(SB_HOST + '/**', backend.handler);
    if (opts.routes) await opts.routes(context, backend);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page, backend);
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

async function openInventory(page, query) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/diamonds.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live list: requested columns over public.diamonds rows, newest first, truthful note', {}, async (page) => {
    await openInventory(page);
    const state = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.ngd-admin-table thead th')]
        .map((t) => t.textContent.trim() || 'Image');
      const first = document.querySelector('#adm-table-body tr');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
        title: document.querySelector('h1').textContent.trim(),
        notice: document.getElementById('adm-demo-note').textContent.replace(/\s+/g, ' '),
        chip: [...document.querySelectorAll('.ngd-demo-chip')].map((c) => c.textContent.trim()),
        heads,
        rows: document.querySelectorAll('#adm-table-body tr').length,
        firstStock: first.getAttribute('data-adm-row'),
        count: document.getElementById('adm-count').textContent,
        actions: first.querySelectorAll('[data-adm-act]').length,
        addHref: document.getElementById('adm-add').getAttribute('href'),
        demoDataLoaded: !!window.NGD_DEMO_DIAMONDS,
        stateSwitch: !!document.getElementById('adm-state-switch'),
      };
    });
    expect(state.visible && state.active === 'diamonds', 'guard + route');
    expect(state.title === 'Diamond Inventory', 'page title');
    expect(/Live inventory/i.test(state.notice) && /diamonds table in your Supabase project/i.test(state.notice),
      'truthful live note, got: ' + state.notice);
    expect(!/demo preview|demo catalogue/i.test(state.notice), 'no demo wording left');
    expect(state.chip.includes('Live'), 'Live chip in the toolbar, got ' + state.chip.join(','));
    expect(JSON.stringify(state.heads) === JSON.stringify(
      ['Stock No.', 'Shape', 'Carat', 'Colour', 'Clarity', 'Lab',
        'Availability', 'Featured', 'Active', 'Updated']),
      'requested columns shown, got ' + state.heads.join(','));
    expect(state.rows === 10, 'first page holds 10 rows, got ' + state.rows);
    expect(state.firstStock === 'NGD-1028', 'newest stone first, got ' + state.firstStock);
    expect(/of 28/.test(state.count) && /inventory: 28 stones/.test(state.count),
      'count reflects the table, got ' + state.count);
    expect(state.actions === 0 && state.addHref === 'add-diamond.html',
      'Add is available without prematurely exposing edit/archive actions');
    expect(!state.demoDataLoaded, 'demo catalogue script no longer loads on this page');
    expect(!state.stateSwitch, 'demo state switch removed — states are real now');
  });

  await scenario('search matches stock number and report number', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'NGD-1007');
    let rows = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')));
    expect(rows.length === 1 && rows[0] === 'NGD-1007', 'stock search narrows to one, got ' + rows.join(','));
    await page.fill('#adm-search', 'LG5824001 12'.replace(' ', ''));
    rows = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')));
    expect(rows.length === 1 && rows[0] === 'NGD-1012', 'report-number search finds the stone, got ' + rows.join(','));
  });

  await scenario('filters (shape, availability, active, featured) and carat sort on live rows', {}, async (page) => {
    await openInventory(page);
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    await page.selectOption('#adm-f-shape', 'Round');
    let state = await page.evaluate(() => ({
      shapes: [...document.querySelectorAll('#adm-table-body tr td:nth-child(2)')].map((t) => t.textContent.trim()),
    }));
    expect(state.shapes.length === 4 && state.shapes.every((s) => s === 'Round'),
      'shape filter applies to the loaded rows, got ' + state.shapes.length);
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-availability', 'On Request');
    state = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#adm-table-body tr td:nth-child(7)')].map((t) => t.textContent.trim()),
    }));
    expect(state.chips.length === 7 && state.chips.every((c) => c === 'On Request'),
      'availability filter applies, got ' + state.chips.length);
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-status', 'inactive');
    state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')).sort(),
    }));
    expect(JSON.stringify(state.ids) === JSON.stringify(['NGD-1005', 'NGD-1014', 'NGD-1023']),
      'active filter finds the inactive stones, got ' + state.ids.join(','));
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-featured', 'featured');
    state = await page.evaluate(() => ({
      featured: [...document.querySelectorAll('#adm-table-body tr td:nth-child(8)')].map((t) => t.textContent.trim()),
    }));
    expect(state.featured.length === 6 && state.featured.every((f) => f === 'Featured'),
      'featured filter applies, got ' + state.featured.length);
    await page.click('#adm-clear');
    await page.selectOption('#adm-sort', 'carat-desc');
    const carats = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr td:nth-child(3)')].map((t) => parseFloat(t.textContent)));
    const sorted = [...carats].sort((a, b) => b - a);
    expect(JSON.stringify(carats) === JSON.stringify(sorted), 'carat sort orders the page');
  });

  await scenario('pagination pages through the live inventory', {}, async (page) => {
    await openInventory(page);
    await page.click('#adm-pagination [data-adm-page="3"]');
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      active: document.querySelector('#adm-pagination .page-item.active .page-link').textContent.trim(),
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.active === '3' && state.rows === 8, 'last page holds the remainder, got ' + state.rows);
    expect(/Showing 21–28 of 28/.test(state.count), 'count window follows, got ' + state.count);
  });

  await scenario('?added= arrival shows the success toast over the refreshed list', {}, async (page) => {
    await openInventory(page, '?added=NGD-2001');
    const state = await page.evaluate(() => ({
      toast: (document.querySelector('#adm-toast .ngd-alert') || { textContent: '' }).textContent,
      success: !!document.querySelector('#adm-toast .ngd-alert-success'),
    }));
    expect(/NGD-2001 was added to the inventory/.test(state.toast) && state.success,
      'arrival toast shown, got: ' + state.toast);
  });

  await scenario('real error state with Retry re-querying Supabase', {
    routes: async (context, backend) => {
      /* one HTTP 500 (supabase-js transparently retries network-level
         aborts, so a status error is the deterministic way to fail) */
      let calls = 0;
      await context.route(SB_HOST + '/rest/v1/diamonds*', (route) => {
        if (route.request().method() === 'GET' && ++calls === 1) {
          return route.fulfill({
            status: 500, contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ code: 'XX000', message: 'internal error' }),
          });
        }
        return backend.handler(route);
      });
    },
  }, async (page) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', ADMIN.email);
    await page.fill('#login-password', ADMIN.password);
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('adm-stage-error').hidden, null, { timeout: 10000 });
    let state = await page.evaluate(() => ({
      tableHidden: document.getElementById('adm-table-card').hidden,
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.tableHidden && /could not be loaded/i.test(state.count),
      'honest error state on a failed query');
    await page.click('#adm-retry');
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    const rows = await page.evaluate(() => document.querySelectorAll('#adm-table-body tr').length);
    expect(rows === 10, 'Retry re-queries and renders the inventory');
  });

  await scenario('empty inventory shows the real empty state with the Add CTA', { emptyInventory: true }, async (page) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', ADMIN.email);
    await page.fill('#login-password', ADMIN.password);
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('adm-stage-empty').hidden, null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      cta: document.querySelector('#adm-stage-empty a').getAttribute('href'),
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.cta === 'add-diamond.html', 'empty state offers Add Diamond');
    expect(/No diamonds in the inventory yet/i.test(state.count), 'honest empty count line');
  });

  await scenario('guard: inventory without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/admin/diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390 cards + tablet 768 contained table, no page overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openInventory(page);
    let state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#adm-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden && state.cards === 10 && state.perRow === 1, 'stacked cards on mobile');
    expect(state.bodyW <= state.clientW + 1, `390 no overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-diamonds-mobile.png') });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    state = await page.evaluate(() => {
      const wrap = document.querySelector('#adm-table-card .table-responsive');
      window.scrollTo(9999, 0);
      return {
        contained: wrap.scrollWidth >= wrap.clientWidth && getComputedStyle(wrap).overflowX !== 'visible',
        pageScrollX: window.scrollX,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.contained && state.pageScrollX === 0 && state.bodyW <= state.clientW + 1,
      'tablet overflow stays inside the card');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-diamonds-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-diamonds scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
