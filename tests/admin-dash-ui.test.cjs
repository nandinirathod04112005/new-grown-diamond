/* ============================================================
   Admin Dashboard tests (LIVE).
   Logs in against a compact mocked Supabase backend (role
   parameterised per scenario) and verifies the admin shell:
   topbar profile area, the 13-route sidebar (nine live pages,
   four honest Soon items) + logout, the seven head-count KPI
   cards fed by exact PostgREST count responses, the live quick
   action links, the merged live activity feed (escaped, newest
   first), per-widget failure isolation with the honest degraded
   status, role/guard redirects, logout and responsive layouts
   at 1440/768/390.
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

/* Exact head-count answers per table (the KPI filters are fixed, so a
   per-table figure is unambiguous). */
const COUNTS = { diamonds: 28, jewellery: 12, profiles: 9, quotes: 3, holds: 2, inspections: 1, enquiries: 5 };
const ACTIVITY = {
  diamonds: [
    { id: 'd1', stock_number: 'NGD-2201', shape: 'Round', created_at: '2026-08-19T10:05:00Z' },
    { id: 'd2', stock_number: 'NGD-2202', shape: '<img src=x onerror="window.__xss=1">', created_at: '2026-08-19T10:04:00Z' },
  ],
  jewellery: [{ id: 'j1', sku: 'JW-3101', product_name: 'Aurora Ring', created_at: '2026-08-19T09:00:00Z' }],
  profiles: [{ id: 'p1', full_name: 'Nisha Mehta', created_at: '2026-08-19T08:00:00Z' }],
  quotes: [{ id: 'q1', public_id: 'QTE-11111111', status: 'pending', created_at: '2026-08-19T11:00:00Z' }],
  holds: [{ id: 'h1', public_id: 'HLD-22222222', status: 'pending', created_at: '2026-08-19T07:00:00Z' }],
  inspections: [{ id: 'i1', public_id: 'INS-33333333', status: 'pending', created_at: '2026-08-19T06:00:00Z' }],
  enquiries: [{ id: 'e1', public_id: 'ENQ-44444444', subject: 'Bulk order', status: 'new', created_at: '2026-08-19T12:00:00Z' }],
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
function makeMock(user, opts) {
  return async function mockBackend(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const table = url.pathname.split('/').pop();
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
    /* KPI head counts — supabase-js head:true issues a HEAD request. */
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      if ((opts.failKpis || []).includes(table)) return json(500, { message: 'mock kpi failure' });
      const n = COUNTS[table] != null ? COUNTS[table] : 0;
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/' + n }, body: '' });
    }
    /* Activity queries all order by created_at (the auth profile fetch
       never does), so the order param routes them here. */
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET' &&
        (url.searchParams.get('order') || '').startsWith('created_at')) {
      if ((opts.failActivity || []).includes(table)) return json(500, { message: 'mock activity failure' });
      return json(200, ACTIVITY[table] || []);
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
    await context.route(SB_HOST + '/**', makeMock(user, opts));
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

async function waitSettled(page) {
  await page.waitForFunction(() => {
    const note = document.querySelector('[data-admin-dashboard-status]');
    return note && !/Loading live dashboard data/.test(note.textContent);
  }, null, { timeout: 10000 });
}

const ROUTES = ['dashboard', 'diamonds', 'jewellery', 'customers', 'quotes', 'holds',
  'inspections', 'enquiries', 'media', 'content', 'seo', 'settings', 'users'];

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell: topbar profile area, 13-route sidebar (8 live), title and profile fill', {}, async (page, user) => {
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
        liveHrefs: items.filter((i) => i.tagName === 'A').map((i) => i.getAttribute('href')),
        active: nav.querySelector('.is-active').getAttribute('data-admin-route'),
        navLogout: !!nav.querySelector('button[data-ngd-logout]'),
        title: document.querySelector('h1').textContent.trim(),
        welcome: document.querySelector('[data-admin-section="welcome"]').textContent,
        liveChip: (document.querySelector('[data-admin-section="welcome"] .ngd-status-chip') || { textContent: '' }).textContent.trim(),
        fields: {
          name: document.querySelector('#admin-profile [data-ngd-field="full_name"]').textContent.trim(),
          role: document.querySelector('#admin-profile [data-ngd-field="role"]').textContent.trim(),
          status: document.querySelector('#admin-profile [data-ngd-field="account_status"]').textContent.trim(),
        },
      };
    });
    expect(state.visible, 'admin guard passed and revealed the page');
    expect(/Asha Admin/.test(state.profileArea) && /admin@ngd\.test/.test(state.profileArea) &&
      /Administrator/.test(state.profileArea),
      'profile area shows the real full name, email and role');
    expect(state.topbarLogout && state.navLogout, 'sign-out in topbar and sidebar');
    expect(JSON.stringify(state.routes) === JSON.stringify(ROUTES),
      'all 13 sidebar routes in order, got ' + state.routes.join(','));
    expect(state.soonCount === 4,
      'four honest Soon items — Media joined the live management pages, got ' + state.soonCount);
    expect(['diamonds.html', 'jewellery.html', 'customers.html', 'quotes.html', 'holds.html',
      'inspections.html', 'enquiries.html', 'media.html'].every((h) => state.liveHrefs.includes(h)),
      'every management console linked from the sidebar, got ' + state.liveHrefs.join(','));
    expect(state.active === 'dashboard', 'Dashboard route active');
    expect(state.title === 'Admin Dashboard', 'page title, got ' + state.title);
    expect(/Welcome, Asha/.test(state.welcome), 'first-name welcome');
    expect(state.liveChip === 'Live data', 'live-data chip, got ' + state.liveChip);
    expect(state.fields.name === 'Asha Admin' && state.fields.role === 'admin' &&
      state.fields.status === 'active', 'signed-in-as card filled');
  });

  await scenario('KPIs: seven live head-count cards, no demo chips, honest live note', {}, async (page, user) => {
    await openAdmin(page, user);
    await waitSettled(page);
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('[data-admin-kpi]')].map((c) => ({
        key: c.getAttribute('data-admin-kpi'),
        value: c.querySelector('[data-admin-kpi-value]').textContent.trim(),
        unavailable: c.classList.contains('is-unavailable'),
        label: c.querySelector('.ngd-dash-metric-label').textContent.trim(),
      })),
      demoChips: document.querySelectorAll('#admin-kpis [data-admin-kpi-chip], #admin-kpis .ngd-demo-chip').length,
      demoWording: /demo/i.test(document.getElementById('admin-kpis').textContent),
      note: document.querySelector('[data-admin-dashboard-status]').textContent.replace(/\s+/g, ' ').trim(),
    }));
    expect(state.cards.length === 7, 'seven KPI cards, got ' + state.cards.length);
    const byKey = Object.fromEntries(state.cards.map((c) => [c.key, c.value]));
    expect(byKey.diamonds === '28' && byKey.jewellery === '12', 'inventory counts from the head queries, got ' + byKey.diamonds + '/' + byKey.jewellery);
    expect(byKey.customers === '9', 'customer count, got ' + byKey.customers);
    expect(byKey.pending_quotes === '3' && byKey.pending_holds === '2' && byKey.pending_inspections === '1',
      'pending request counts, got ' + [byKey.pending_quotes, byKey.pending_holds, byKey.pending_inspections].join('/'));
    expect(byKey.enquiries === '5', 'open/new enquiries count, got ' + byKey.enquiries);
    expect(state.cards.every((c) => !c.unavailable), 'no card degraded on a clean load');
    expect(state.cards.map((c) => c.label).join('|') ===
      'Total Diamonds|Total Jewellery|Customers|Pending Quotes|Pending Holds|Pending Inspections|Open/New Enquiries',
      'KPI labels per spec, got ' + state.cards.map((c) => c.label).join('|'));
    expect(state.demoChips === 0 && !state.demoWording, 'nothing chipped or worded demo');
    expect(state.note === 'Live counts from Supabase. Values update when records are added or their status changes.',
      'honest live note, got ' + state.note);
  });

  await scenario('quick actions: seven live console links, nothing disabled or Soon', {}, async (page, user) => {
    await openAdmin(page, user);
    const state = await page.evaluate(() => ({
      actions: [...document.querySelectorAll('#admin-action-buttons [data-admin-action]')].map((el) => ({
        tag: el.tagName, key: el.getAttribute('data-admin-action'),
        href: el.getAttribute('href'), label: el.textContent.trim(),
        disabled: el.getAttribute('aria-disabled') === 'true',
      })),
      soonChips: document.querySelectorAll('#admin-action-buttons .ngd-soon-chip').length,
    }));
    expect(state.actions.length === 7, 'seven quick actions, got ' + state.actions.length);
    expect(state.actions.every((a) => a.tag === 'A' && a.href === a.key + '.html' && !a.disabled),
      'every action is a live link to its console, got ' + state.actions.map((a) => a.href).join(','));
    expect(JSON.stringify(state.actions.map((a) => a.label)) === JSON.stringify(
      ['Diamonds', 'Jewellery', 'Customers', 'Quotes', 'Holds', 'Inspections', 'Enquiries']),
      'action labels per spec, got ' + state.actions.map((a) => a.label).join(','));
    expect(state.soonChips === 0, 'no Soon chips left in the actions');
  });

  await scenario('recent activity: merged live feed, newest first, escaped, console links', {}, async (page, user) => {
    await openAdmin(page, user);
    await waitSettled(page);
    await page.waitForFunction(() => document.querySelectorAll('[data-admin-feed] .ngd-dash-row').length >= 8);
    const state = await page.evaluate(() => ({
      busy: document.querySelector('[data-admin-feed]').getAttribute('aria-busy'),
      titles: [...document.querySelectorAll('[data-admin-feed] .ngd-dash-row strong')].map((s) => s.textContent.trim()),
      text: document.querySelector('[data-admin-feed]').textContent,
      links: [...document.querySelectorAll('[data-admin-feed] a.ngd-link')].map((a) => a.getAttribute('href')),
      injectedImg: !!document.querySelector('[data-admin-feed] img'),
      xss: window.__xss === 1,
    }));
    expect(state.busy === 'false', 'feed no longer busy');
    expect(JSON.stringify(state.titles) === JSON.stringify(
      ['Enquiry received', 'Quote requested', 'Diamond added', 'Diamond added', 'Jewellery added',
        'Customer registered', 'Hold requested', 'Inspection requested']),
      'merged feed newest first, got ' + state.titles.join(','));
    expect(/NGD-2201 · Round/.test(state.text) && /JW-3101 · Aurora Ring/.test(state.text) &&
      /QTE-11111111 · pending/.test(state.text) && /ENQ-44444444 · Bulk order/.test(state.text) &&
      /Nisha Mehta/.test(state.text), 'live descriptions rendered');
    expect(['diamonds.html', 'jewellery.html', 'customers.html', 'quotes.html', 'holds.html',
      'inspections.html', 'enquiries.html'].every((h) => state.links.includes(h)),
      'every row links its console, got ' + state.links.join(','));
    expect(!state.injectedImg && !state.xss && /onerror/.test(state.text),
      'database text is escaped, never executed');
  });

  await scenario('failure isolation: one broken KPI and one broken feed source degrade honestly', { failKpis: ['enquiries'], failActivity: ['quotes'] }, async (page, user) => {
    await openAdmin(page, user);
    await waitSettled(page);
    const state = await page.evaluate(() => ({
      enquiries: {
        value: document.querySelector('[data-admin-kpi="enquiries"] [data-admin-kpi-value]').textContent.trim(),
        unavailable: document.querySelector('[data-admin-kpi="enquiries"]').classList.contains('is-unavailable'),
      },
      diamonds: document.querySelector('[data-admin-kpi="diamonds"] [data-admin-kpi-value]').textContent.trim(),
      note: document.querySelector('[data-admin-dashboard-status]').textContent.replace(/\s+/g, ' ').trim(),
      role: document.querySelector('[data-admin-dashboard-status]').getAttribute('role'),
      titles: [...document.querySelectorAll('[data-admin-feed] .ngd-dash-row strong')].map((s) => s.textContent.trim()),
    }));
    expect(state.enquiries.unavailable && state.enquiries.value === '—', 'broken KPI shows an em dash, not a fake zero');
    expect(state.diamonds === '28', 'healthy KPIs unaffected');
    expect(state.note === 'Some dashboard data could not be loaded. Available figures are still shown.',
      'honest degraded status, got ' + state.note);
    expect(state.role === 'alert', 'degraded status announced as an alert');
    expect(state.titles.length >= 6 && !state.titles.includes('Quote requested'),
      'feed still renders the healthy sources, got ' + state.titles.join(','));
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
