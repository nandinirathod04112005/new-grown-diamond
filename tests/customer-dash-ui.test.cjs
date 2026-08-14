/* ============================================================
   Customer Dashboard UI tests (STEP 20).
   Logs in against a compact mocked Supabase backend (one
   customer), then verifies the dashboard shell: topbar, sidebar
   routes incl. the Soon items and logout, welcome + profile
   fill, the six metric cards (honest “—” live values, chipped
   demo numbers), the three preview panels with their
   empty/loading/error/demo state designs, quick actions,
   sidebar anchor navigation, the offcanvas drawer below 992px
   and responsive layouts at 1440/768/390.
   The deeper auth flows stay in auth-flow.test.cjs.
   Run:  node tests/customer-dash-ui.test.cjs
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

const USER = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'customer@ngd.test',
  password: 'Customer#12345',
  profile: {
    role: 'customer', account_status: 'active',
    full_name: 'Chetan Customer', company_name: 'Chetan Gems LLP', phone: '+912222222222',
  },
};

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt() {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ sub: USER.id, email: USER.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig';
}

function userObject() {
  return {
    id: USER.id, aud: 'authenticated', role: 'authenticated', email: USER.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: USER.profile.full_name },
    identities: [{ identity_id: 'ii-1', id: USER.id, user_id: USER.id, provider: 'email', identity_data: { email: USER.email, sub: USER.id }, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z' }],
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
      (body.email === USER.email && body.password === USER.password);
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
    const row = { id: USER.id, email: USER.email, ...USER.profile, created_at: '2026-01-01T00:00:00Z' };
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

async function openDashboard(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', USER.email);
  await page.fill('#login-password', USER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
  await page.waitForFunction(() =>
    document.querySelector('[data-ngd-field="full_name"]').textContent.trim() !== '—');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell: topbar, static sidebar with all eight routes, welcome + profile', {}, async (page) => {
    await openDashboard(page);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.ngd-dash-nav');
      const items = [...nav.querySelectorAll('[data-dash-route]')];
      return {
        topbar: !!document.querySelector('.ngd-dash-topbar'),
        topbarLogout: !!document.querySelector('.ngd-dash-topbar [data-ngd-logout]'),
        sidebarVisible: document.querySelector('.ngd-dash-sidebar').getBoundingClientRect().width > 200,
        burgerHidden: getComputedStyle(document.querySelector('.ngd-burger-btn')).display === 'none',
        routes: items.map((i) => i.getAttribute('data-dash-route')),
        soon: items.filter((i) => i.classList.contains('is-soon')).map((i) => i.getAttribute('data-dash-route')),
        navLogout: !!nav.querySelector('button[data-ngd-logout]'),
        welcome: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
        fields: {
          name: document.querySelector('[data-ngd-field="full_name"]').textContent.trim(),
          email: document.querySelector('[data-ngd-field="email"]').textContent.trim(),
          company: document.querySelector('[data-ngd-field="company_name"]').textContent.trim(),
          role: document.querySelector('#dash-profile [data-ngd-field="role"]').textContent.trim(),
        },
        visible: getComputedStyle(document.body).visibility === 'visible',
      };
    });
    expect(state.visible, 'guard passed and revealed the page');
    expect(state.topbar && state.topbarLogout, 'topbar with sign-out present');
    expect(state.sidebarVisible && state.burgerHidden, 'static sidebar at 1440, burger hidden');
    expect(JSON.stringify(state.routes) === JSON.stringify(
      ['dashboard', 'favourites', 'quotes', 'holds', 'inspections', 'enquiries', 'profile']),
      'sidebar routes in order, got ' + state.routes.join(','));
    expect(JSON.stringify(state.soon) === JSON.stringify(['holds', 'inspections']),
      'holds + inspections marked Soon, got ' + state.soon.join(','));
    expect(state.navLogout, 'sidebar logout button wired');
    expect(/Welcome, Chetan/.test(state.welcome), 'first-name greeting, got ' + state.welcome);
    expect(state.fields.name === 'Chetan Customer' && state.fields.company === 'Chetan Gems LLP',
      'profile details filled');
    expect(state.fields.role === 'customer', 'role from profiles table');
  });

  await scenario('live state: honest “—” metrics and empty previews, nothing pretends', {}, async (page) => {
    await openDashboard(page);
    const state = await page.evaluate(() => ({
      metrics: [...document.querySelectorAll('[data-dash-metric]')].map((c) => ({
        key: c.getAttribute('data-dash-metric'),
        value: c.querySelector('[data-dash-value]').textContent.trim(),
        chipHidden: c.querySelector('[data-dash-demo-chip]').classList.contains('d-none'),
      })),
      note: document.querySelector('[data-dash-metric-note]').textContent,
      panels: [...document.querySelectorAll('[data-dash-preview]')].map((p) => ({
        key: p.getAttribute('data-dash-preview'),
        emptyShown: !p.querySelector('[data-dash-show="empty"]').hidden,
        dataHidden: p.querySelector('[data-dash-show="data"]').hidden,
      })),
      emptyTitles: [...document.querySelectorAll('[data-dash-show="empty"] h3')].map((h) => h.textContent.trim()),
    }));
    expect(state.metrics.length === 6, 'six summary cards, got ' + state.metrics.length);
    expect(state.metrics.every((m) => m.value === '—' && m.chipHidden),
      'all live values are honest dashes without demo chips');
    expect(/nothing here is live data yet/i.test(state.note), 'honest metrics note');
    expect(state.panels.every((p) => p.emptyShown && p.dataHidden),
      'all previews rest in their empty state');
    expect(state.emptyTitles.some((t) => /nothing saved/i.test(t)) &&
      state.emptyTitles.some((t) => /no quote requests/i.test(t)) &&
      state.emptyTitles.some((t) => /no enquiries/i.test(t)),
      'designed empty states, got ' + state.emptyTitles.join(' | '));
  });

  await scenario('demo state: chipped demo rows and values, working catalogue links', {}, async (page) => {
    await openDashboard(page);
    await page.click('[data-dash-state="demo"]');
    const state = await page.evaluate(() => ({
      values: [...document.querySelectorAll('[data-dash-metric]')].map((c) =>
        c.querySelector('[data-dash-value]').textContent.trim()),
      chipsShown: [...document.querySelectorAll('[data-dash-demo-chip]')]
        .every((c) => !c.classList.contains('d-none')),
      note: document.querySelector('[data-dash-metric-note]').textContent,
      rows: document.querySelectorAll('[data-dash-show="data"] .ngd-dash-row').length,
      rowChips: document.querySelectorAll('[data-dash-show="data"] .ngd-dash-row .ngd-demo-chip').length,
      panelChips: [...document.querySelectorAll('[data-dash-panel-chip]')]
        .every((c) => !c.classList.contains('d-none')),
      favLink: document.querySelector('#dash-favourites [data-dash-show="data"] a[href*="diamond-details"]')
        .getAttribute('href'),
      statusChips: document.querySelectorAll('[data-dash-show="data"] .ngd-status-chip').length,
    }));
    expect(state.values.every((v) => /^\d+$/.test(v)), 'demo numbers shown, got ' + state.values.join(','));
    expect(state.chipsShown && state.panelChips, 'every demo value and panel is chipped Demo');
    expect(/none of these numbers are real/i.test(state.note), 'demo note says values are not real');
    expect(state.rows === 9 && state.rowChips === 9, 'every demo row chipped, got ' +
      state.rows + ' rows / ' + state.rowChips + ' chips');
    expect(/diamond-details\.html\?id=NGD-\d+/.test(state.favLink), 'demo favourites link the real catalogue');
    expect(state.statusChips >= 6, 'status chips styled, got ' + state.statusChips);
  });

  await scenario('loading and error designs; retry returns to live', {}, async (page) => {
    await openDashboard(page);
    await page.click('[data-dash-state="loading"]');
    let state = await page.evaluate(() => ({
      skeletons: [...document.querySelectorAll('[data-dash-preview]')].every((p) =>
        !p.querySelector('[data-dash-show="loading"]').hidden &&
        p.querySelectorAll('[data-dash-show="loading"] .ngd-skeleton').length >= 2),
    }));
    expect(state.skeletons, 'skeleton rows shown in every panel');
    await page.click('[data-dash-state="error"]');
    state = await page.evaluate(() => ({
      errors: [...document.querySelectorAll('[data-dash-preview]')].every((p) =>
        !p.querySelector('[data-dash-show="error"]').hidden),
      retry: !!document.querySelector('[data-dash-show="error"]:not([hidden]) [data-dash-retry]'),
    }));
    expect(state.errors && state.retry, 'error design with retry in every panel');
    await page.click('#dash-favourites [data-dash-retry]');
    state = await page.evaluate(() => ({
      live: document.querySelector('[data-dash-state="live"]').classList.contains('is-on'),
      empty: !document.querySelector('#dash-favourites [data-dash-show="empty"]').hidden,
    }));
    expect(state.live && state.empty, 'retry returns the dashboard to the live state');
  });

  await scenario('quick actions link the catalogue and contact pages', {}, async (page) => {
    await openDashboard(page);
    const hrefs = await page.$$eval('#dash-actions a', (as) => as.map((a) => a.getAttribute('href')));
    expect(JSON.stringify(hrefs) === JSON.stringify(
      ['../diamonds.html', '../jewellery.html', '../contact.html', '../education.html']),
      'four quick actions, got ' + hrefs.join(','));
    await page.click('#dash-actions a[href="../diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('sidebar anchors move the active state and scroll to sections', {}, async (page) => {
    await openDashboard(page);
    await page.click('.ngd-dash-nav a[data-dash-route="favourites"]');
    await page.waitForFunction(() => location.hash === '#dash-favourites');
    /* the page scrolls smoothly — wait for the section to settle */
    await page.waitForFunction(() => {
      const top = document.getElementById('dash-favourites').getBoundingClientRect().top;
      return top > -60 && top < 220;
    }, null, { timeout: 5000 });
    const active = await page.evaluate(() =>
      document.querySelector('.ngd-dash-nav a.is-active').getAttribute('data-dash-route'));
    expect(active === 'favourites', 'active route follows the click');
  });

  await scenario('logout signs out and returns to the login page', {}, async (page) => {
    await openDashboard(page);
    await page.click('.ngd-dash-topbar [data-ngd-logout]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('guard: dashboard without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/account/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: drawer navigation, single/two-column cards, touch targets', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openDashboard(page);
    let state = await page.evaluate(() => ({
      burgerShown: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
      sidebarOffscreen: document.querySelector('.ngd-dash-sidebar').getBoundingClientRect().right <= 0 ||
        getComputedStyle(document.querySelector('.ngd-dash-sidebar')).visibility === 'hidden',
      metricsPerRow: (() => {
        const cards = [...document.querySelectorAll('.ngd-dash-metric')];
        return cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length;
      })(),
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(state.burgerShown, 'burger visible on mobile');
    expect(state.sidebarOffscreen, 'sidebar starts closed as a drawer');
    expect(state.metricsPerRow === 2, 'two metric cards per row on mobile, got ' + state.metricsPerRow);
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.click('.ngd-burger-btn');
    await page.waitForSelector('#dashSidebar.show', { timeout: 4000 });
    state = await page.evaluate(() => ({
      navHeights: [...document.querySelectorAll('.ngd-dash-nav a, .ngd-dash-nav button')]
        .every((el) => el.getBoundingClientRect().height >= 40),
    }));
    expect(state.navHeights, 'large touch targets in the drawer');
    await page.click('#dashSidebar a[data-dash-route="quotes"]');
    await page.waitForFunction(() => !document.querySelector('#dashSidebar').classList.contains('show'),
      null, { timeout: 4000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'customer-dash-mobile.png') });
  });

  await scenario('tablet 768 two-across cards and desktop 1440 layout, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openDashboard(page);
    let o = await page.evaluate(() => ({
      burgerShown: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
      metricsPerRow: (() => {
        const cards = [...document.querySelectorAll('.ngd-dash-metric')];
        return cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length;
      })(),
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.burgerShown, 'collapsible drawer still in charge at 768');
    expect(o.metricsPerRow === 2, 'two-column cards at 768, got ' + o.metricsPerRow);
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await page.evaluate(() => ({
      metricsPerRow: (() => {
        const cards = [...document.querySelectorAll('.ngd-dash-metric')];
        return cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length;
      })(),
      panelsSideBySide: (() => {
        const fav = document.getElementById('dash-favourites').getBoundingClientRect();
        const quotes = document.getElementById('dash-quotes').getBoundingClientRect();
        return quotes.left > fav.right - 5;
      })(),
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.metricsPerRow === 6, 'six metric cards across at 1440, got ' + o.metricsPerRow);
    expect(o.panelsSideBySide, 'favourites + quotes panels side by side at 1440');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'customer-dash-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} customer-dash-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
