/* ============================================================
   Admin Dashboard UI tests (STEP 23).
   Logs in against a compact mocked Supabase backend (role
   parameterised per scenario) and verifies the admin shell:
   topbar profile area, the 13-route sidebar (Dashboard active,
   twelve honest Soon items) + logout, KPI cards with
   demo-catalogue counts and chipped demo figures, the five
   Soon quick actions + live storefront link, the demo activity
   feed, role/guard redirects, logout and responsive layouts at
   1440/768/390.
   Run:  node tests/admin-dash-ui.test.cjs
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

const USERS = {
  admin: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@ngd.test', password: 'Admin#12345',
    profile: { role: 'admin', account_status: 'active', full_name: 'Asha Admin', company_name: null, phone: '+911111111111' },
  },
  customer: {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'customer@ngd.test', password: 'Customer#12345',
    profile: { role: 'customer', account_status: 'active', full_name: 'Chetan Customer', company_name: 'Chetan Gems LLP', phone: '+912222222222' },
  },
};

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt(user) {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig';
}
function userObject(user) {
  return {
    id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: user.profile.full_name },
    identities: [{ identity_id: 'ii-' + user.id, id: user.id, user_id: user.id, provider: 'email', identity_data: { email: user.email, sub: user.id }, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z' }],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(user) {
  return async function mockBackend(route) {
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
        (body.email === user.email && body.password === user.password);
      if (!ok) return json(400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials', message: 'Invalid login credentials' });
      return json(200, {
        access_token: makeJwt(user), token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'rt-1', user: userObject(user),
      });
    }
    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      const auth = req.headers()['authorization'] || '';
      if (!/Bearer .+\.testsig$/.test(auth)) return json(401, { code: 'no_session', error_code: 'no_session', msg: 'missing sub claim', message: 'missing sub claim' });
      return json(200, userObject(user));
    }
    if (url.pathname === '/auth/v1/logout' && method === 'POST') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
      const row = { id: user.id, email: user.email, ...user.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, [row]);
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  };
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
  const user = USERS[opts.role || 'admin'];
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(user));
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page, user);
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

async function openAdmin(page, user) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.waitForFunction(() =>
    document.querySelector('[data-ngd-field="full_name"]').textContent.trim() !== '—');
}

const ROUTES = ['dashboard', 'diamonds', 'jewellery', 'customers', 'quotes', 'holds',
  'inspections', 'enquiries', 'media', 'content', 'seo', 'settings', 'users'];

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell: topbar profile area, 13-route sidebar, title and profile fill', {}, async (page, user) => {
    await openAdmin(page, user);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.ngd-dash-nav');
      const items = [...nav.querySelectorAll('[data-admin-route]')];
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        profileArea: document.getElementById('admin-profile-area').textContent,
        topbarLogout: !!document.querySelector('.ngd-dash-topbar [data-ngd-logout]'),
        routes: items.map((i) => i.getAttribute('data-admin-route')),
        soonCount: items.filter((i) => i.classList.contains('is-soon')).length,
        active: nav.querySelector('.is-active').getAttribute('data-admin-route'),
        navLogout: !!nav.querySelector('button[data-ngd-logout]'),
        title: document.querySelector('h1').textContent.trim(),
        welcome: document.querySelector('[data-admin-section="welcome"]').textContent,
        fields: {
          name: document.querySelector('#admin-profile [data-ngd-field="full_name"]').textContent.trim(),
          role: document.querySelector('#admin-profile [data-ngd-field="role"]').textContent.trim(),
          status: document.querySelector('#admin-profile [data-ngd-field="account_status"]').textContent.trim(),
        },
      };
    });
    expect(state.visible, 'admin guard passed and revealed the page');
    expect(/Asha/.test(state.profileArea) && /Administrator/.test(state.profileArea),
      'profile area shows name + Administrator');
    expect(state.topbarLogout && state.navLogout, 'sign-out in topbar and sidebar');
    expect(JSON.stringify(state.routes) === JSON.stringify(ROUTES),
      'all 13 sidebar routes in order, got ' + state.routes.join(','));
    expect(state.soonCount === 12, 'twelve honest Soon items, got ' + state.soonCount);
    expect(state.active === 'dashboard', 'Dashboard route active');
    expect(state.title === 'Admin Dashboard', 'page title, got ' + state.title);
    expect(/Welcome, Asha/.test(state.welcome), 'first-name welcome');
    expect(state.fields.name === 'Asha Admin' && state.fields.role === 'admin' &&
      state.fields.status === 'active', 'signed-in-as card filled');
  });

  await scenario('KPIs: six cards, catalogue-true inventory counts, everything chipped demo', {}, async (page, user) => {
    await openAdmin(page, user);
    await page.waitForFunction(() =>
      document.querySelector('[data-admin-kpi="diamonds"] [data-admin-kpi-value]').textContent !== '—');
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('[data-admin-kpi]')].map((c) => ({
        key: c.getAttribute('data-admin-kpi'),
        value: c.querySelector('[data-admin-kpi-value]').textContent.trim(),
        chip: !!c.querySelector('[data-admin-kpi-chip]'),
        label: c.querySelector('.ngd-dash-metric-label').textContent.trim(),
      })),
      catalogue: {
        diamonds: (window.NGD_DEMO_DIAMONDS || []).length,
        jewellery: (window.NGD_DEMO_JEWELLERY || []).length,
      },
      note: document.querySelector('[data-admin-kpi-note]').textContent.replace(/\s+/g, ' '),
    }));
    expect(state.cards.length === 6, 'six KPI cards, got ' + state.cards.length);
    const byKey = Object.fromEntries(state.cards.map((c) => [c.key, c]));
    expect(byKey.diamonds.value === String(state.catalogue.diamonds) &&
      byKey.jewellery.value === String(state.catalogue.jewellery),
      `inventory KPIs mirror the demo catalogue (${byKey.diamonds.value}/${byKey.jewellery.value})`);
    expect(['customers', 'pending_quotes', 'pending_holds', 'enquiries']
      .every((k) => /^\d+$/.test(byKey[k].value)), 'sample figures for the rest');
    expect(state.cards.every((c) => c.chip), 'every KPI chipped Demo');
    expect(state.cards.map((c) => c.label).join('|') ===
      'Total Diamonds|Total Jewellery|Customers|Pending Quotes|Pending Holds|Enquiries',
      'KPI labels per spec');
    expect(/Nothing here is live business data/i.test(state.note), 'honest KPI note');
  });

  await scenario('quick actions: five Soon buttons that go nowhere, one live storefront link', {}, async (page, user) => {
    await openAdmin(page, user);
    const state = await page.evaluate(() => ({
      labels: [...document.querySelectorAll('#admin-action-buttons [data-admin-action]')]
        .map((b) => b.textContent.replace(/Soon/i, '').trim()),
      soonChips: document.querySelectorAll('#admin-action-buttons [data-admin-action] .ngd-soon-chip').length,
      disabled: [...document.querySelectorAll('#admin-action-buttons [data-admin-action]')]
        .every((b) => b.getAttribute('aria-disabled') === 'true'),
      store: document.querySelector('#admin-action-buttons a.ngd-btn-gold').getAttribute('href'),
    }));
    expect(JSON.stringify(state.labels) === JSON.stringify(
      ['Add Diamond', 'Add Jewellery', 'View Customers', 'Review Quotes', 'View Enquiries']),
      'action labels per spec, got ' + state.labels.join(','));
    expect(state.soonChips === 5 && state.disabled, 'all five visibly Soon and disabled');
    /* aria-disabled makes Playwright refuse a normal click — dispatch one
       directly to prove the button still navigates nowhere */
    await page.$eval('#admin-action-buttons [data-admin-action="add-diamond"]', (el) => el.click());
    await page.waitForTimeout(300);
    const stayed = await page.evaluate(() => /admin\/dashboard\.html$/.test(location.pathname));
    expect(stayed, 'Soon action navigates nowhere');
    expect(state.store === '../diamonds.html', 'storefront link is live');
    await page.click('#admin-action-buttons a.ngd-btn-gold');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('recent activity: five labelled demo items with working catalogue links', {}, async (page, user) => {
    await openAdmin(page, user);
    const state = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-admin-feed] .ngd-dash-row')].map((r) => ({
        title: r.querySelector('strong').textContent.trim(),
        chip: !!r.querySelector('.ngd-demo-chip'),
      })),
      links: [...document.querySelectorAll('[data-admin-feed] a.ngd-link')].map((a) => a.getAttribute('href')),
      statusChips: document.querySelectorAll('[data-admin-feed] .ngd-status-chip').length,
    }));
    expect(JSON.stringify(state.rows.map((r) => r.title)) === JSON.stringify(
      ['Diamond added', 'Jewellery updated', 'Quote received', 'Customer registered', 'Enquiry received']),
      'activity items per spec, got ' + state.rows.map((r) => r.title).join(','));
    expect(state.rows.every((r) => r.chip), 'every activity item chipped Demo');
    expect(state.links.some((h) => /diamond-details/.test(h)) &&
      state.links.some((h) => /jewellery-details/.test(h)), 'feed links resolve to the catalogue');
    expect(state.statusChips >= 3, 'status badges in the feed');
    await page.click('[data-admin-feed] a[href="../diamond-details.html?id=NGD-1022"]');
    await page.waitForURL('**/diamond-details.html?id=NGD-1022', { timeout: 8000 });
  });

  await scenario('guards: no session → login; customer role → own dashboard', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/admin/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    /* now sign in as the customer and try the admin console */
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('logout signs out and returns to the login page', {}, async (page, user) => {
    await openAdmin(page, user);
    await page.click('.ngd-dash-topbar [data-ngd-logout]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: offcanvas admin nav, single-column KPIs, touch targets', { viewport: { width: 390, height: 844 } }, async (page, user) => {
    await openAdmin(page, user);
    let state = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('#admin-kpis .row > div')];
      return {
        burger: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
        kpisPerRow: cols.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cols[0].getBoundingClientRect().top) < 4).length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.burger, 'burger visible on mobile');
    expect(state.kpisPerRow === 1, 'single-column KPI cards, got ' + state.kpisPerRow);
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.click('.ngd-burger-btn');
    await page.waitForSelector('#adminSidebar.show', { timeout: 4000 });
    state = await page.evaluate(() => ({
      items: document.querySelectorAll('#adminSidebar [data-admin-route]').length,
      touch: [...document.querySelectorAll('#adminSidebar .ngd-dash-nav a, #adminSidebar .ngd-dash-nav button, #adminSidebar .ngd-dash-nav .ngd-dash-nav-item')]
        .every((el) => el.getBoundingClientRect().height >= 40),
    }));
    expect(state.items === 13, 'all thirteen routes in the drawer');
    expect(state.touch, 'large touch targets');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#adminSidebar').classList.contains('show'),
      null, { timeout: 4000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-dash-mobile.png') });
  });

  await scenario('tablet 768 collapsible sidebar + 2-across KPIs; desktop 1440 full layout', { viewport: { width: 768, height: 1024 } }, async (page, user) => {
    await openAdmin(page, user);
    let o = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('#admin-kpis .row > div')];
      return {
        burger: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
        kpisPerRow: cols.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cols[0].getBoundingClientRect().top) < 4).length,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.burger, 'collapsible drawer at 768');
    expect(o.kpisPerRow === 2, 'two KPI cards per row at 768, got ' + o.kpisPerRow);
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('#admin-kpis .row > div')];
      return {
        sidebarStatic: document.querySelector('.ngd-dash-sidebar').getBoundingClientRect().width > 200,
        kpisPerRow: cols.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cols[0].getBoundingClientRect().top) < 4).length,
        panelsSideBySide: (() => {
          const feed = document.getElementById('admin-activity').getBoundingClientRect();
          const profile = document.getElementById('admin-profile').getBoundingClientRect();
          return profile.left > feed.right - 5;
        })(),
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.sidebarStatic, 'sidebar static beside the content at 1440');
    expect(o.kpisPerRow === 6, 'six KPI cards across at 1440, got ' + o.kpisPerRow);
    expect(o.panelsSideBySide, 'activity + profile side by side');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-dash-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-dash-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
