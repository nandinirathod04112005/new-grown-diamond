/* ============================================================
   Account request lists tests (STEP 22).
   One suite covers the three guarded pages — Quote History,
   Holds and Inspections — on the shared dashboard shell:
   demo rows with their spec fields resolved from the public
   catalogue, all four statuses per page, search + status +
   date-range filters, the honest UI-state previews
   (loading/empty/error), the View Details expander with its
   catalogue link, guard redirects and the responsive
   table-vs-cards behaviour at 1440/768/390.
   Run:  node tests/account-requests-ui.test.cjs
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

const PAGES = {
  quotes: {
    file: 'quotes.html', title: 'Quote History', idPrefix: 'Q-',
    statuses: ['Pending', 'Reviewed', 'Responded', 'Closed'],
    extraHead: 'Type', rows: 6,
  },
  holds: {
    file: 'holds.html', title: 'Holds', idPrefix: 'H-',
    statuses: ['Pending', 'Active', 'Expired', 'Released'],
    extraHead: 'Expires', rows: 5,
  },
  inspections: {
    file: 'inspections.html', title: 'Inspections', idPrefix: 'INS-',
    statuses: ['Requested', 'Scheduled', 'Completed', 'Cancelled'],
    extraHead: 'Preferred type', rows: 5,
  },
};

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

async function openPage(page, file) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', USER.email);
  await page.fill('#login-password', USER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/account/' + file, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#req-table-wrap tr[data-req-row]').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  for (const [key, cfg] of Object.entries(PAGES)) {
    await scenario(`${key}: shell, active route, demo rows with fields + all four statuses`, {}, async (page) => {
      await openPage(page, cfg.file);
      const state = await page.evaluate((cfg2) => {
        const rows = [...document.querySelectorAll('#req-table-wrap tr[data-req-row]')];
        const heads = [...document.querySelectorAll('#req-table-wrap thead th')].map((t) => t.textContent.trim());
        const first = rows[0];
        return {
          visible: getComputedStyle(document.body).visibility === 'visible',
          active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-dash-route'),
          title: document.querySelector('h1').textContent.trim(),
          notice: document.getElementById('req-demo-note').textContent,
          rowCount: rows.length,
          heads,
          ids: rows.map((r) => r.getAttribute('data-req-row')),
          statuses: [...new Set(rows.map((r) => r.querySelector('.ngd-status-chip').textContent.trim()))],
          thumb: !!first.querySelector('.ngd-req-thumb svg'),
          product: first.querySelector('.ngd-req-product strong').textContent.trim().length,
          stockSub: first.querySelector('.ngd-req-product .ngd-text-muted').textContent,
          date: /\d{4}-\d{2}-\d{2}/.test(first.children[2].textContent),
          viewBtn: first.querySelector('[data-req-toggle]').textContent.trim(),
          statusOptions: [...document.querySelectorAll('#req-status option')].map((o) => o.textContent.trim()),
        };
      }, cfg);
      expect(state.visible, 'guard passed');
      expect(state.active === key, 'sidebar route active, got ' + state.active);
      expect(state.title === cfg.title, 'title, got ' + state.title);
      expect(/demo preview/i.test(state.notice) && /nothing here was submitted/i.test(state.notice),
        'honest demo notice');
      expect(state.rowCount === cfg.rows, cfg.rows + ' demo rows, got ' + state.rowCount);
      expect(state.heads.includes(cfg.extraHead) && state.heads.includes('Status'),
        'table heads incl. ' + cfg.extraHead + ', got ' + state.heads.join(','));
      expect(state.ids.every((id) => id.startsWith(cfg.idPrefix)), 'request IDs, got ' + state.ids.join(','));
      expect(JSON.stringify([...state.statuses].sort()) === JSON.stringify([...cfg.statuses].sort()),
        'all four statuses present, got ' + state.statuses.join(','));
      expect(state.thumb && state.product > 3, 'product art + name');
      expect(/NGD-|JW-/.test(state.stockSub), 'stock number / SKU shown');
      expect(state.date, 'request date shown');
      expect(state.viewBtn === 'View Details', 'View Details button');
      expect(JSON.stringify(state.statusOptions) === JSON.stringify(['All statuses', ...cfg.statuses]),
        'status filter options, got ' + state.statusOptions.join(','));
    });
  }

  await scenario('quotes: search, status filter and date range narrow the list', {}, async (page) => {
    await openPage(page, 'quotes.html');
    await page.fill('#req-search', 'NGD-1007');
    let state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#req-table-wrap tr[data-req-row]').length,
      count: document.getElementById('req-count').textContent,
    }));
    expect(state.rows === 1 && /Showing 1 of 6/.test(state.count),
      'stock search narrows to one, got ' + state.count);
    await page.click('#req-clear');
    await page.selectOption('#req-status', 'Responded');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#req-table-wrap tr[data-req-row]').length,
      statuses: [...document.querySelectorAll('#req-table-wrap .ngd-status-chip')].map((c) => c.textContent.trim()),
    }));
    expect(state.rows === 2 && state.statuses.every((s) => s === 'Responded'),
      'status filter keeps only Responded, got ' + state.statuses.join(','));
    await page.click('#req-clear');
    await page.fill('#req-from', '2026-08-01');
    await page.fill('#req-to', '2026-08-31');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#req-table-wrap tr[data-req-row]').length,
    }));
    expect(state.rows === 3, 'August range keeps three requests, got ' + state.rows);
    await page.fill('#req-search', 'zzz');
    state = await page.evaluate(() => ({
      noMatch: !document.getElementById('req-no-match').hidden,
    }));
    expect(state.noMatch, 'no-match panel for fruitless filters');
  });

  await scenario('holds: expiry column; inspections: preferred type column', {}, async (page) => {
    await openPage(page, 'holds.html');
    let extra = await page.evaluate(() =>
      [...document.querySelectorAll('#req-table-wrap tr[data-req-row]')]
        .map((r) => r.children[3].textContent.trim()));
    expect(extra.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v)), 'expiry dates shown, got ' + extra.join(','));
    await page.goto(SITE + '/account/inspections.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelectorAll('#req-table-wrap tr[data-req-row]').length > 0);
    extra = await page.evaluate(() =>
      [...document.querySelectorAll('#req-table-wrap tr[data-req-row]')]
        .map((r) => r.children[3].textContent.trim()));
    expect(extra.some((v) => /atelier/i.test(v)) && extra.some((v) => /video/i.test(v)),
      'preferred inspection types shown, got ' + extra.join(' | '));
  });

  await scenario('view details expands an honest demo record with a catalogue link', {}, async (page) => {
    await openPage(page, 'quotes.html');
    await page.click('#req-table-wrap tr[data-req-row="Q-0106"] [data-req-toggle]');
    const state = await page.evaluate(() => {
      const detailRow = document.querySelector('#req-table-wrap tr[data-req-row="Q-0106"]').nextElementSibling;
      const detail = detailRow.querySelector('[data-req-detail]');
      return {
        open: !detail.hidden,
        chip: !!detail.querySelector('.ngd-demo-chip'),
        link: (detail.querySelector('a.ngd-link') || {}).getAttribute?.('href'),
        note: detail.textContent,
        btn: document.querySelector('#req-table-wrap tr[data-req-row="Q-0106"] [data-req-toggle]').textContent.trim(),
        aria: document.querySelector('#req-table-wrap tr[data-req-row="Q-0106"] [data-req-toggle]').getAttribute('aria-expanded'),
      };
    });
    expect(state.open && state.aria === 'true', 'detail drawer opens with aria state');
    expect(state.chip && /Demo record/.test(state.note), 'record clearly chipped as demo');
    expect(/^\.\.\/diamond-details\.html\?id=NGD-1007$/.test(state.link),
      'catalogue link in the drawer, got ' + state.link);
    expect(state.btn === 'Hide Details', 'button flips to Hide');
    await page.click('#req-table-wrap tr[data-req-row="Q-0106"] [data-req-toggle]');
    const closed = await page.evaluate(() =>
      document.querySelector('#req-table-wrap tr[data-req-row="Q-0106"]')
        .nextElementSibling.querySelector('[data-req-detail]').hidden);
    expect(closed, 'second click closes the drawer');
  });

  await scenario('UI states: loading skeletons, empty design, error with retry', {}, async (page) => {
    await openPage(page, 'holds.html');
    await page.click('[data-req-state="loading"]');
    let state = await page.evaluate(() => ({
      loading: !document.getElementById('req-stage-loading').hidden,
      table: document.getElementById('req-table-wrap').hidden,
      skeletons: document.querySelectorAll('#req-stage-loading .ngd-skeleton').length,
      count: document.getElementById('req-count').textContent,
    }));
    expect(state.loading && state.table && state.skeletons >= 3, 'loading skeletons replace the list');
    expect(/no data is being loaded/i.test(state.count), 'honest state-preview note');
    await page.click('[data-req-state="empty"]');
    state = await page.evaluate(() => ({
      empty: !document.getElementById('req-stage-empty').hidden,
      copy: document.querySelector('#req-stage-empty h2').textContent.trim(),
    }));
    expect(state.empty && /No holds yet/.test(state.copy), 'empty design, got ' + state.copy);
    await page.click('[data-req-state="error"]');
    state = await page.evaluate(() => ({
      error: !document.getElementById('req-stage-error').hidden,
    }));
    expect(state.error, 'error design shown');
    await page.click('#req-retry');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#req-table-wrap tr[data-req-row]').length,
      tableShown: !document.getElementById('req-table-wrap').hidden,
      on: document.querySelector('[data-req-state="demo"]').classList.contains('is-on'),
    }));
    expect(state.tableShown && state.rows === 5 && state.on, 'retry returns to the demo rows');
  });

  await scenario('guards: all three pages redirect without a session', {}, async (page) => {
    for (const file of ['quotes.html', 'holds.html', 'inspections.html']) {
      await page.goto(SITE + '/account/' + file, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/login.html', { timeout: 8000 });
    }
  });

  await scenario('mobile 390: stacked cards with drawer shell, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openPage(page, 'quotes.html');
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#req-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.getElementById('req-table-wrap')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        burger: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
        chip: !!cards[0].querySelector('.ngd-status-chip'),
        toggleH: cards[0].querySelector('[data-req-toggle]').getBoundingClientRect().height,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden, 'table hidden on mobile');
    expect(state.cards === 6 && state.perRow === 1, 'stacked cards, got ' + state.perRow + ' per row');
    expect(state.burger && state.chip, 'drawer shell + status chips');
    expect(state.toggleH >= 36, 'touch-sized detail toggle');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.click('#req-cards-wrap .ngd-req-card [data-req-toggle]');
    const open = await page.evaluate(() =>
      !document.querySelector('#req-cards-wrap .ngd-req-card [data-req-detail]').hidden);
    expect(open, 'card detail expands on mobile');
    await page.screenshot({ path: path.join(SCREEN_DIR, 'requests-mobile.png') });
  });

  await scenario('tablet 768 cards; desktop 1440 table layout, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openPage(page, 'inspections.html');
    let o = await page.evaluate(() => ({
      tableHidden: getComputedStyle(document.getElementById('req-table-wrap')).display === 'none',
      cards: document.querySelectorAll('#req-cards-wrap .ngd-req-card').length,
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.tableHidden && o.cards === 5, 'compact cards at 768');
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await page.evaluate(() => ({
      tableShown: getComputedStyle(document.getElementById('req-table-wrap')).display !== 'none',
      cardsHidden: getComputedStyle(document.getElementById('req-cards-wrap')).display === 'none',
      rows: document.querySelectorAll('#req-table-wrap tr[data-req-row]').length,
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.tableShown && o.cardsHidden && o.rows === 5, 'table layout at 1440');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'requests-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} account-requests scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
