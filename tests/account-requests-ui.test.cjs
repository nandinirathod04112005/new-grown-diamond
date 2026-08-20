/* ============================================================
   Account request lists tests (LIVE).
   The three guarded pages — Quote History, Holds, Inspections —
   now read the signed-in customer's OWN rows from public.quotes /
   public.holds / public.inspections (mocked at the network layer,
   PostgREST-style, with the products embedded): real rows with
   their statuses and product references, the extra column per
   kind (quoted price / expiry / preferred type), expandable
   details with the customer message + admin response and a
   catalogue link by public_id, search + status + date filters,
   honest empty states, a real error state, the guards and
   responsive layout checks.
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
const CUSTOMER = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'customer@ngd.test', password: 'Customer#12345',
  profile: { role: 'customer', account_status: 'active', full_name: 'Chetan Customer', company_name: null, phone: null, country: null },
};
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt() {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ sub: CUSTOMER.id, email: CUSTOMER.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig';
}
function userObject() {
  return {
    id: CUSTOMER.id, aud: 'authenticated', role: 'authenticated', email: CUSTOMER.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: CUSTOMER.profile.full_name },
    identities: [{ identity_id: 'ii-1', id: CUSTOMER.id, user_id: CUSTOMER.id, provider: 'email', identity_data: { email: CUSTOMER.email, sub: CUSTOMER.id }, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z' }],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
}

const DIAMOND = { id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001', shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', laboratory: 'IGI' };
const PIECE = { id: 'uuid-j1', public_id: 'JEW-SEED0001', sku: 'JW-1001', product_name: 'Aurora Ring', category: 'Rings' };

function seedData() {
  return {
    quotes: [
      { id: 'q1', user_id: CUSTOMER.id, public_id: 'QTE-11112222', product_type: 'diamond', status: 'pending',
        customer_message: 'Best price with express delivery please.', admin_note: null, quoted_price: null, currency: null,
        created_at: '2026-08-15T09:00:00Z', diamonds: DIAMOND, jewellery: null },
      { id: 'q2', user_id: CUSTOMER.id, public_id: 'QTE-33334444', product_type: 'jewellery', status: 'responded',
        customer_message: 'Ring size 54 with rush engraving.', admin_note: 'Quote sent by email.', quoted_price: 5400, currency: 'USD',
        created_at: '2026-08-10T09:00:00Z', diamonds: null, jewellery: PIECE },
    ],
    holds: [
      { id: 'h1', user_id: CUSTOMER.id, public_id: 'HLD-55556666', product_type: 'diamond', status: 'active',
        customer_message: 'Holding while financing clears.', admin_note: 'Held at the atelier.',
        requested_at: '2026-08-12T09:00:00Z', created_at: '2026-08-12T09:00:00Z',
        expires_at: '2026-08-30T09:00:00Z', diamonds: DIAMOND, jewellery: null },
    ],
    inspections: [
      { id: 'i1', user_id: CUSTOMER.id, public_id: 'INS-77778888', product_type: 'diamond', status: 'scheduled',
        inspection_type: 'video_call', preferred_date: '2026-08-25', scheduled_at: '2026-08-26T14:00:00Z',
        customer_message: 'Weekday mornings preferred.', admin_note: 'Confirmed with a gemmologist.',
        created_at: '2026-08-13T09:00:00Z', diamonds: DIAMOND, jewellery: null },
      { id: 'i2', user_id: CUSTOMER.id, public_id: 'INS-9999AAAA', product_type: 'jewellery', status: 'pending',
        inspection_type: 'in_person', preferred_date: null, scheduled_at: null,
        customer_message: null, admin_note: null,
        created_at: '2026-08-11T09:00:00Z', diamonds: null, jewellery: PIECE },
    ],
  };
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const data = opts.emptyAccount ? { quotes: [], holds: [], inspections: [] } : seedData();
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
        (body.email === CUSTOMER.email && body.password === CUSTOMER.password);
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
      const row = { id: CUSTOMER.id, email: CUSTOMER.email, ...CUSTOMER.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, [row]);
    }
    for (const table of ['quotes', 'holds', 'inspections']) {
      if (url.pathname === '/rest/v1/' + table && method === 'GET') {
        if (opts.failTable === table) return json(500, { code: 'XX000', message: 'internal error' });
        return json(200, data[table]);
      }
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, data };
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

async function login(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', CUSTOMER.email);
  await page.fill('#login-password', CUSTOMER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
}

async function openList(page, kind) {
  await page.goto(SITE + '/account/' + kind + '.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    /Showing/.test((document.getElementById('req-count') || { textContent: '' }).textContent),
    null, { timeout: 10000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('quotes: live rows with statuses, quoted price and admin response', {}, async (page) => {
    await login(page);
    await openList(page, 'quotes');
    const state = await page.evaluate(() => ({
      count: document.getElementById('req-count').textContent.trim(),
      ids: [...document.querySelectorAll('#req-table-wrap [data-req-row]')].map((r) => r.getAttribute('data-req-row')),
      chips: [...document.querySelectorAll('#req-table-wrap .ngd-status-chip')].map((c) => c.textContent.trim()),
      body: document.getElementById('req-table-wrap').textContent,
    }));
    expect(/Showing 2 of 2 requests/.test(state.count), 'live count, got ' + state.count);
    expect(state.ids.indexOf('QTE-11112222') !== -1 && state.ids.indexOf('QTE-33334444') !== -1,
      'both quote rows render, got ' + state.ids.join(','));
    expect(state.chips.indexOf('Pending') !== -1 && state.chips.indexOf('Responded') !== -1,
      'live statuses, got ' + state.chips.join(','));
    expect(/USD 5,400/.test(state.body), 'quoted price column renders');
    /* expand details: message + admin response + catalogue link by public_id */
    await page.click('#req-table-wrap [data-req-row="QTE-33334444"] [data-req-toggle]');
    const detail = await page.evaluate(() => {
      const row = document.querySelector('#req-table-wrap [data-req-row="QTE-33334444"]');
      const panel = row.nextElementSibling.querySelector('[data-req-detail]');
      return { hidden: panel.hidden, text: panel.textContent, link: panel.querySelector('a.ngd-link').getAttribute('href') };
    });
    expect(!detail.hidden && /Ring size 54/.test(detail.text) && /Quote sent by email/.test(detail.text),
      'details show the message and the admin response');
    expect(detail.link === '../jewellery-details.html?id=JEW-SEED0001',
      'catalogue link carries the public id, got ' + detail.link);
  });

  await scenario('quotes: search, status filter and date range narrow the live list', {}, async (page) => {
    await login(page);
    await openList(page, 'quotes');
    await page.fill('#req-search', 'QTE-1111');
    await page.waitForFunction(() =>
      document.querySelectorAll('#req-table-wrap [data-req-row]').length === 1);
    await page.click('#req-clear');
    await page.selectOption('#req-status', 'Responded');
    await page.waitForFunction(() =>
      document.querySelectorAll('#req-table-wrap [data-req-row]').length === 1);
    const one = await page.evaluate(() =>
      document.querySelector('#req-table-wrap [data-req-row]').getAttribute('data-req-row'));
    expect(one === 'QTE-33334444', 'status filter narrows to the responded quote');
    await page.click('#req-clear');
    await page.fill('#req-from', '2026-08-14');
    await page.waitForFunction(() =>
      document.querySelectorAll('#req-table-wrap [data-req-row]').length === 1);
  });

  await scenario('holds: live row with the expiry column', {}, async (page) => {
    await login(page);
    await openList(page, 'holds');
    const state = await page.evaluate(() => ({
      count: document.getElementById('req-count').textContent.trim(),
      id: (document.querySelector('#req-table-wrap [data-req-row]') || { getAttribute: () => '' }).getAttribute('data-req-row'),
      chips: [...document.querySelectorAll('#req-table-wrap .ngd-status-chip')].map((c) => c.textContent.trim()),
      body: document.getElementById('req-table-wrap').textContent,
    }));
    expect(/Showing 1 of 1 requests/.test(state.count), 'live count, got ' + state.count);
    expect(state.id === 'HLD-55556666' && state.chips.indexOf('Active') !== -1, 'live hold row + status');
    expect(/2026-08-30/.test(state.body), 'expiry column renders the live date');
  });

  await scenario('inspections: live rows with type, schedule and admin note', {}, async (page) => {
    await login(page);
    await openList(page, 'inspections');
    const state = await page.evaluate(() => ({
      count: document.getElementById('req-count').textContent.trim(),
      ids: [...document.querySelectorAll('#req-table-wrap [data-req-row]')].map((r) => r.getAttribute('data-req-row')),
      chips: [...document.querySelectorAll('#req-table-wrap .ngd-status-chip')].map((c) => c.textContent.trim()),
      body: document.getElementById('req-table-wrap').textContent,
      demoBits: /demo/i.test(document.getElementById('req-table-wrap').textContent),
    }));
    expect(/Showing 2 of 2 requests/.test(state.count), 'live count, got ' + state.count);
    expect(state.ids.indexOf('INS-77778888') !== -1 && state.ids.indexOf('INS-9999AAAA') !== -1,
      'both inspection rows render, got ' + state.ids.join(','));
    expect(state.chips.indexOf('Scheduled') !== -1 && state.chips.indexOf('Pending') !== -1,
      'live inspection statuses, got ' + state.chips.join(','));
    expect(/Video call/.test(state.body) && /In person · atelier/.test(state.body),
      'preferred type column shows the mapped labels');
    expect(!state.demoBits, 'no demo wording anywhere');
    await page.click('#req-table-wrap [data-req-row="INS-77778888"] [data-req-toggle]');
    const detail = await page.evaluate(() => {
      const row = document.querySelector('#req-table-wrap [data-req-row="INS-77778888"]');
      const panel = row.nextElementSibling.querySelector('[data-req-detail]');
      return { text: panel.textContent };
    });
    expect(/2026-08-25/.test(detail.text) && /2026-08-26/.test(detail.text) &&
      /Confirmed with a gemmologist/.test(detail.text),
      'details show preferred date, schedule and the admin response');
  });

  await scenario('empty account: honest empty designs on all three pages', { emptyAccount: true }, async (page) => {
    await login(page);
    for (const kind of ['quotes', 'holds', 'inspections']) {
      await page.goto(SITE + '/account/' + kind + '.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() =>
        !document.getElementById('req-stage-empty').hidden, null, { timeout: 10000 });
    }
  });

  await scenario('a failing query shows the honest error state', { failTable: 'inspections' }, async (page) => {
    await login(page);
    await page.goto(SITE + '/account/inspections.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      !document.getElementById('req-stage-error').hidden, null, { timeout: 10000 });
    const body = await page.evaluate(() => document.getElementById('req-stage-error').textContent);
    expect(!/XX000|internal error/i.test(body), 'no raw Supabase internals shown');
  });

  await scenario('guards: all three pages redirect without a session', {}, async (page) => {
    for (const kind of ['quotes', 'holds', 'inspections']) {
      await page.goto(SITE + '/account/' + kind + '.html', { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/login.html', { timeout: 8000 });
    }
  });

  await scenario('responsive: mobile 390 cards, desktop 1440 table, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await login(page);
    await openList(page, 'inspections');
    let o = await page.evaluate(() => ({
      cards: document.querySelectorAll('#req-cards-wrap [data-req-row]').length,
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.cards === 2, 'stacked cards on mobile, got ' + o.cards);
    expect(o.bodyW <= o.clientW + 1, `390 no overflow b=${o.bodyW}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'account-inspections-desktop.png') });
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
