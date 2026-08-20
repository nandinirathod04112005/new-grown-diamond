/* ============================================================
   Customer Dashboard tests (LIVE).
   The dashboard now reads the signed-in customer's OWN data
   (mocked at the network layer, PostgREST-style): live metric
   counts (favourites split by type, quotes, holds, inspections,
   enquiries via head+count requests), the three recent panels
   with real rows (favourites link by public_id), honest empty
   states for a fresh account, per-widget failure isolation with
   Retry, and profile editing through the
   customer_update_own_profile RPC (safe fields only). Plus the
   guard, logout and responsive checks.
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
const CUSTOMER = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'customer@ngd.test', password: 'Customer#12345',
  profile: { role: 'customer', account_status: 'active', full_name: 'Chetan Customer', company_name: 'Chetan Gems LLP', phone: '+912222222222', country: 'India' },
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

function seedData() {
  return {
    favourites: [
      { id: 'f1', user_id: CUSTOMER.id, product_type: 'diamond', created_at: '2026-08-15T10:00:00Z',
        diamonds: { public_id: 'DIA-SEED0001', stock_number: 'NGD-1001', shape: 'Round', carat: 1.52 }, jewellery: null },
      { id: 'f2', user_id: CUSTOMER.id, product_type: 'jewellery', created_at: '2026-08-14T10:00:00Z',
        diamonds: null, jewellery: { public_id: 'JEW-SEED0001', sku: 'JW-1001', product_name: 'Aurora Ring', category: 'Rings' } },
      { id: 'f3', user_id: CUSTOMER.id, product_type: 'diamond', created_at: '2026-08-13T10:00:00Z',
        diamonds: { public_id: 'DIA-SEED0002', stock_number: 'NGD-1002', shape: 'Oval', carat: 2.02 }, jewellery: null },
    ],
    quotes: [
      { id: 'q1', user_id: CUSTOMER.id, public_id: 'QTE-11112222', status: 'pending', product_type: 'diamond', created_at: '2026-08-15T09:00:00Z',
        diamonds: { stock_number: 'NGD-1001', public_id: 'DIA-SEED0001' }, jewellery: null },
      { id: 'q2', user_id: CUSTOMER.id, public_id: 'QTE-33334444', status: 'responded', product_type: 'jewellery', created_at: '2026-08-12T09:00:00Z',
        diamonds: null, jewellery: { sku: 'JW-1001', public_id: 'JEW-SEED0001' } },
    ],
    holds: [
      { id: 'h1', user_id: CUSTOMER.id, public_id: 'HLD-55556666', status: 'pending', created_at: '2026-08-11T09:00:00Z' },
    ],
    inspections: [
      { id: 'i1', user_id: CUSTOMER.id, public_id: 'INS-77778888', status: 'pending', created_at: '2026-08-10T09:00:00Z' },
    ],
    enquiries: [
      { id: 'e1', user_id: CUSTOMER.id, public_id: 'ENQ-9999AAAA', subject: 'Certification question', message: 'Could you confirm the report number matches the girdle inscription for this stone?', status: 'responded', created_at: '2026-08-09T09:00:00Z' },
      { id: 'e2', user_id: CUSTOMER.id, public_id: 'ENQ-BBBBCCCC', subject: 'Trade terms', message: 'Please share your wholesale onboarding details for our atelier.', status: 'new', created_at: '2026-08-08T09:00:00Z' },
    ],
  };
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const data = opts.emptyAccount
    ? { favourites: [], quotes: [], holds: [], inspections: [], enquiries: [] }
    : seedData();
  const profile = { id: CUSTOMER.id, email: CUSTOMER.email, ...CUSTOMER.profile, created_at: '2026-01-01T00:00:00Z' };
  const rpcCalls = [];
  async function handler(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, obj, extraHeaders) =>
      route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...(extraHeaders || {}) }, body: JSON.stringify(obj) });
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: { ...CORS, 'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD' },
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
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, profile);
      return json(200, [profile]);
    }
    if (url.pathname === '/rest/v1/rpc/customer_update_own_profile' && method === 'POST') {
      const args = JSON.parse(req.postData() || '{}');
      rpcCalls.push(args);
      if (opts.failProfileSave) return json(401, { code: '42501', message: 'Only an active customer can update this profile' });
      profile.full_name = args.new_full_name;
      profile.company_name = args.new_company_name;
      profile.phone = args.new_phone;
      profile.country = args.new_country;
      return json(200, profile);
    }
    const tables = ['favourites', 'quotes', 'holds', 'inspections', 'enquiries'];
    for (const table of tables) {
      if (url.pathname === '/rest/v1/' + table) {
        let rows = data[table].slice();
        const userEq = url.searchParams.get('user_id');
        if (userEq && userEq.startsWith('eq.')) rows = rows.filter((r) => r.user_id === userEq.slice(3));
        const typeEq = url.searchParams.get('product_type');
        if (typeEq && typeEq.startsWith('eq.')) rows = rows.filter((r) => r.product_type === typeEq.slice(3));
        if (opts.failTable === table) {
          return json(500, { code: 'XX000', message: 'internal error' });
        }
        if (method === 'HEAD') {
          return route.fulfill({
            status: 200,
            headers: { ...CORS, 'content-range': rows.length ? '0-' + (rows.length - 1) + '/' + rows.length : '*/0' },
            body: '',
          });
        }
        if (method === 'GET') {
          const limit = parseInt(url.searchParams.get('limit') || '0', 10);
          if (limit) rows = rows.slice(0, limit);
          return json(200, rows, { 'content-range': rows.length ? '0-' + (rows.length - 1) + '/' + rows.length : '*/0' });
        }
      }
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, data, rpcCalls, profile };
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

async function openDashboard(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', CUSTOMER.email);
  await page.fill('#login-password', CUSTOMER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live metrics: real per-user counts on all six cards', {}, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.querySelector('[data-dash-metric="saved_diamonds"] [data-dash-value]').textContent === '2',
      null, { timeout: 10000 });
    const state = await page.evaluate(() => {
      const value = (key) => document.querySelector('[data-dash-metric="' + key + '"] [data-dash-value]').textContent;
      return {
        savedDiamonds: value('saved_diamonds'), savedJewellery: value('saved_jewellery'),
        quotes: value('quotes'), holds: value('holds'),
        inspections: value('inspections'), enquiries: value('enquiries'),
        note: document.querySelector('[data-dash-metric-note]').textContent.trim(),
        welcome: document.querySelector('[data-ngd-field="first_name"]').textContent.trim(),
      };
    });
    expect(state.savedDiamonds === '2' && state.savedJewellery === '1', 'favourites split by type');
    expect(state.quotes === '2' && state.holds === '1' && state.inspections === '1' && state.enquiries === '2',
      'request counts live, got ' + JSON.stringify(state));
    expect(/Live counts from your account/.test(state.note), 'live note, got ' + state.note);
    expect(state.welcome === 'Chetan', 'welcome uses the profile first name');
  });

  await scenario('panels: real favourites (public_id links), quotes and enquiries', {}, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.querySelectorAll('[data-dash-list="favourites"] .ngd-dash-row').length === 3,
      null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      favTitles: [...document.querySelectorAll('[data-dash-list="favourites"] strong')].map((s) => s.textContent.trim()),
      favHrefs: [...document.querySelectorAll('[data-dash-list="favourites"] a')].map((a) => a.getAttribute('href')),
      quoteIds: [...document.querySelectorAll('[data-dash-list="quotes"] strong')].map((s) => s.textContent.trim()),
      quoteChips: [...document.querySelectorAll('[data-dash-list="quotes"] .ngd-status-chip')].map((c) => c.textContent.trim()),
      enquirySubjects: [...document.querySelectorAll('[data-dash-list="enquiries"] strong')].map((s) => s.textContent.trim()),
      demoChips: document.querySelectorAll('.ngd-demo-chip:not(.d-none)').length,
    }));
    expect(JSON.stringify(state.favTitles) === JSON.stringify(['NGD-1001', 'Aurora Ring', 'NGD-1002']),
      'favourites rows from the account, got ' + state.favTitles.join(','));
    expect(state.favHrefs[0] === '../diamond-details.html?id=DIA-SEED0001' &&
      state.favHrefs[1] === '../jewellery-details.html?id=JEW-SEED0001',
      'favourite links carry public ids, got ' + state.favHrefs.join(' | '));
    expect(JSON.stringify(state.quoteIds) === JSON.stringify(['QTE-11112222', 'QTE-33334444']),
      'quote rows live, got ' + state.quoteIds.join(','));
    expect(state.quoteChips.indexOf('Responded') !== -1, 'quote status chips, got ' + state.quoteChips.join(','));
    expect(state.enquirySubjects[0] === 'Certification question', 'enquiry subjects live');
    expect(state.demoChips === 0, 'no demo chips anywhere on the live dashboard');
  });

  await scenario('fresh account: zero counts and honest empty panels', { emptyAccount: true }, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.querySelector('[data-dash-metric="quotes"] [data-dash-value]').textContent === '0',
      null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      favEmpty: !document.querySelector('[data-dash-preview="favourites"] [data-dash-show="empty"]').hidden,
      quotesEmpty: !document.querySelector('[data-dash-preview="quotes"] [data-dash-show="empty"]').hidden,
      enquiriesEmpty: !document.querySelector('[data-dash-preview="enquiries"] [data-dash-show="empty"]').hidden,
    }));
    expect(state.favEmpty && state.quotesEmpty && state.enquiriesEmpty,
      'all three panels show their empty designs');
  });

  await scenario('widget isolation: a failing quotes query leaves the rest standing', { failTable: 'quotes' }, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      !document.querySelector('[data-dash-preview="quotes"] [data-dash-show="error"]').hidden,
      null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      favData: !document.querySelector('[data-dash-preview="favourites"] [data-dash-show="data"]').hidden,
      enqData: !document.querySelector('[data-dash-preview="enquiries"] [data-dash-show="data"]').hidden,
      quotesValue: document.querySelector('[data-dash-metric="quotes"] [data-dash-value]').textContent,
      note: document.querySelector('[data-dash-metric-note]').textContent,
      body: document.querySelector('[data-dash-preview="quotes"]').textContent,
    }));
    expect(state.favData && state.enqData, 'other panels still render their data');
    expect(state.quotesValue === '—', 'the failed count shows an em dash');
    expect(/Some counts could not be loaded/.test(state.note), 'honest partial note');
    expect(!/XX000|internal error/i.test(state.body), 'no raw Supabase internals shown');
  });

  await scenario('profile edit saves safe fields through the RPC', {}, async (page, backend) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.getElementById('profile-full-name').value !== '', null, { timeout: 10000 });
    await page.fill('#profile-full-name', 'Chetan C. Customer');
    await page.fill('#profile-country', 'Belgium');
    await page.click('#profile-save');
    await page.waitForSelector('#profile-alert .ngd-alert-success', { timeout: 8000 });
    expect(backend.rpcCalls.length === 1, 'exactly one RPC call');
    const args = backend.rpcCalls[0];
    expect(args.new_full_name === 'Chetan C. Customer' && args.new_country === 'Belgium' &&
      args.new_company_name === 'Chetan Gems LLP' && args.new_phone === '+912222222222',
      'RPC carries the four safe fields only, got ' + JSON.stringify(args));
    expect(!('role' in args) && !('account_status' in args) && !('new_role' in args),
      'role/status are never sent');
    const shown = await page.evaluate(() => ({
      name: document.querySelector('#dash-profile [data-ngd-field="full_name"]').textContent.trim(),
      country: document.querySelector('#dash-profile [data-ngd-field="country"]').textContent.trim(),
    }));
    expect(shown.name === 'Chetan C. Customer' && shown.country === 'Belgium',
      'profile details re-render from the RPC result');
  });

  await scenario('profile save failure is surfaced safely', { failProfileSave: true }, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.getElementById('profile-full-name').value !== '', null, { timeout: 10000 });
    await page.fill('#profile-full-name', 'Blocked Save');
    await page.click('#profile-save');
    await page.waitForSelector('#profile-alert .ngd-alert-danger', { timeout: 8000 });
    const alert = await page.textContent('#profile-alert');
    expect(/could not be saved/i.test(alert) && !/42501/.test(alert),
      'safe error message, got ' + alert);
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

  await scenario('responsive: mobile 390 and desktop 1440, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openDashboard(page);
    await page.waitForFunction(() =>
      document.querySelector('[data-dash-metric="quotes"] [data-dash-value]').textContent === '2',
      null, { timeout: 10000 });
    let o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `390 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'customer-dash-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'customer-dash-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} customer-dashboard scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
