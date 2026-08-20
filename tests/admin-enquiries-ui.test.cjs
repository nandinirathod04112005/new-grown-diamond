/* ============================================================
   Admin Enquiries console tests (LIVE).
   Logs in against a compact mocked Supabase backend and drives
   the live inbox: seeded /rest/v1/enquiries rows with joined
   product refs, the 10-column table with guest flags and the
   honest count, search + status/type/date filters + clear, the
   details panel (full escaped message, close), the real
   RLS-guarded status + admin-note UPDATE with truthful toasts
   and its failure path, the empty and error+retry stages, the
   role guard and the 390/768 layouts.
   Run:  node tests/admin-enquiries-ui.test.cjs
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

function seedSet() {
  return [
    { id: 'e1', public_id: 'ENQ-SEED0001', user_id: null, full_name: 'Gauri Guest', company_name: null,
      email: 'gauri@example.com', subject: 'General Enquiry', message: 'Please tell me more about lab-grown diamonds.',
      product_type: null, diamond_id: null, jewellery_id: null, status: 'new',
      admin_note: null, created_at: '2026-08-15T09:00:00Z', diamonds: null, jewellery: null },
    { id: 'e2', public_id: 'ENQ-SEED0002', user_id: '00000000-0000-4000-8000-000000000002', full_name: 'Chetan Customer',
      company_name: 'Chetan Gems LLP', email: 'customer@ngd.test', subject: 'Diamond Enquiry',
      message: 'Interested in the round stone.', product_type: 'diamond', diamond_id: 'd1', jewellery_id: null,
      status: 'new', admin_note: null, created_at: '2026-08-10T09:00:00Z',
      diamonds: { stock_number: 'NGD-1007' }, jewellery: null },
    { id: 'e3', public_id: 'ENQ-SEED0003', user_id: '00000000-0000-4000-8000-000000000002', full_name: 'Chetan Customer',
      company_name: 'Chetan Gems LLP', email: 'customer@ngd.test', subject: 'Jewellery Enquiry',
      message: 'Sizing options for the Aurora ring?', product_type: 'jewellery', diamond_id: null, jewellery_id: 'j1',
      status: 'responded', admin_note: 'Sent the size chart.', created_at: '2026-08-05T09:00:00Z',
      diamonds: null, jewellery: { sku: 'JW-2001' } },
    { id: 'e4', public_id: 'ENQ-SEED0004', user_id: null, full_name: 'Xavier Guest', company_name: 'X<b>Corp</b>',
      email: 'x@example.com', subject: 'Bulk order', message: 'Need 40 stones <img src=x onerror="window.__xss2=1"> urgently.',
      product_type: null, diamond_id: null, jewellery_id: null, status: 'closed',
      admin_note: null, created_at: '2026-08-01T09:00:00Z', diamonds: null, jewellery: null },
  ];
}

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
let patchCalls = [];
function makeMock(user, opts) {
  let getFailures = opts.failFirstGet ? 1 : 0;
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
    if (url.pathname === '/rest/v1/enquiries' && method === 'GET') {
      if (getFailures > 0) { getFailures -= 1; return json(500, { message: 'mock load failure' }); }
      return json(200, opts.seeds);
    }
    if (url.pathname === '/rest/v1/enquiries' && method === 'PATCH') {
      const changes = JSON.parse(req.postData() || '{}');
      patchCalls.push({ url: req.url(), changes });
      if (opts.failPatch) return json(500, { message: 'mock update failure' });
      const id = (url.searchParams.get('id') || '').replace('eq.', '');
      const row = opts.seeds.find((r) => r.id === id) || {};
      return json(200, Object.assign({}, row, changes));
    }
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
      const row = { id: user.id, email: user.email, ...user.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, [row]);
    }
    /* Dashboard widgets probed on the login hop — harmless empty data. */
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []);
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
    await context.route(SB_HOST + '/**', makeMock(user, { seeds: opts.seeds || seedSet(), failPatch: !!opts.failPatch, failFirstGet: !!opts.failFirstGet }));
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

async function openInbox(page, user, waitFor) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/enquiries.html', { waitUntil: 'domcontentloaded' });
  if (waitFor === 'empty') {
    await page.waitForFunction(() => !document.getElementById('adm-stage-empty').hidden);
  } else if (waitFor === 'error') {
    await page.waitForFunction(() => !document.getElementById('adm-stage-error').hidden);
  } else {
    await page.waitForFunction(() => document.querySelectorAll('#adm-table-body tr').length > 0);
  }
}

const rowCount = () => document.querySelectorAll('#adm-table-body tr').length;

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + live inbox: Enquiries route active, 10 columns, guest flags, joined products', {}, async (page, user) => {
    await openInbox(page, user);
    const state = await page.evaluate(() => {
      const guestRow = document.querySelector('[data-adm-row="ENQ-SEED0001"]');
      const diamondRow = document.querySelector('[data-adm-row="ENQ-SEED0002"]');
      const jewelRow = document.querySelector('[data-adm-row="ENQ-SEED0003"]');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
        headers: [...document.querySelectorAll('thead th')].map((t) => t.textContent.trim()),
        rows: document.querySelectorAll('#adm-table-body tr').length,
        guestFlag: /Guest/.test(guestRow.textContent),
        customerNotGuest: !/Guest/.test(diamondRow.textContent),
        diamondRef: /Diamond · NGD-1007/.test(diamondRow.textContent),
        jewelRef: /Jewellery · JW-2001/.test(jewelRow.textContent),
        statusChips: document.querySelectorAll('#adm-table-body .ngd-status-chip').length,
        count: document.getElementById('adm-count').textContent.trim(),
        demoWording: /demo/i.test(document.getElementById('adm-table-body').textContent),
      };
    });
    expect(state.visible, 'admin guard passed and revealed the page');
    expect(state.active === 'enquiries', 'Enquiries route active, got ' + state.active);
    expect(JSON.stringify(state.headers) === JSON.stringify(['Enquiry ID', 'Customer Name', 'Company', 'Email',
      'Subject', 'Type', 'Related Product', 'Date', 'Status', 'Actions']),
      'ten columns per spec, got ' + state.headers.join(','));
    expect(state.rows === 4, 'four live enquiries, got ' + state.rows);
    expect(state.guestFlag && state.customerNotGuest, 'guests flagged, signed-in customers not');
    expect(state.diamondRef && state.jewelRef, 'related products joined from the live tables');
    expect(state.statusChips === 4, 'status chip on every row');
    expect(state.count === '4 of 4 enquiries', 'honest count, got ' + state.count);
    expect(!state.demoWording, 'no demo wording in the inbox');
  });

  await scenario('search, status + type filters and the date range narrow the live inbox', {}, async (page, user) => {
    await openInbox(page, user);
    await page.fill('#adm-search', 'ENQ-SEED0004');
    let n = await page.evaluate(rowCount);
    expect(n === 1, 'search by enquiry id, got ' + n);
    await page.fill('#adm-search', 'Aurora');
    n = await page.evaluate(rowCount);
    expect(n === 1, 'search reaches the message text, got ' + n);
    await page.fill('#adm-search', '');
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    await page.selectOption('#adm-f-status', 'new');
    n = await page.evaluate(rowCount);
    expect(n === 2, 'status filter New, got ' + n);
    await page.selectOption('#adm-f-status', 'all');
    await page.selectOption('#adm-f-type', 'diamond');
    n = await page.evaluate(rowCount);
    expect(n === 1, 'type filter diamond, got ' + n);
    await page.selectOption('#adm-f-type', 'all');
    await page.fill('#adm-f-from', '2026-08-04');
    await page.$eval('#adm-f-from', (el) => el.dispatchEvent(new Event('change')));
    await page.fill('#adm-f-to', '2026-08-11');
    await page.$eval('#adm-f-to', (el) => el.dispatchEvent(new Event('change')));
    n = await page.evaluate(rowCount);
    expect(n === 2, 'date range keeps the middle two, got ' + n);
    await page.fill('#adm-search', 'zzz-nothing');
    const noMatch = await page.evaluate(() => !document.getElementById('adm-no-match').hidden);
    expect(noMatch, 'no-match stage for a dead-end filter');
    await page.click('#adm-clear');
    n = await page.evaluate(rowCount);
    const count = await page.evaluate(() => document.getElementById('adm-count').textContent.trim());
    expect(n === 4 && count === '4 of 4 enquiries', 'Clear restores everything, got ' + n + ' / ' + count);
  });

  await scenario('details panel: full escaped message, note prefilled, close', {}, async (page, user) => {
    await openInbox(page, user);
    await page.click('[data-adm-row="ENQ-SEED0004"] [data-view]');
    await page.waitForSelector('#enq-detail:not([hidden])', { timeout: 4000 });
    let state = await page.evaluate(() => ({
      subject: document.querySelector('#enq-detail h2').textContent.trim(),
      message: document.querySelector('#enq-detail .text-break').textContent,
      injectedImg: !!document.querySelector('#enq-detail img'),
      xss: window.__xss2 === 1,
      status: document.getElementById('enq-status').value,
    }));
    expect(state.subject === 'Bulk order', 'detail subject, got ' + state.subject);
    expect(/Need 40 stones/.test(state.message) && /onerror/.test(state.message),
      'full message shown as text');
    expect(!state.injectedImg && !state.xss, 'message HTML is escaped, never executed');
    expect(state.status === 'closed', 'status select mirrors the row');
    await page.click('#enq-close');
    const hidden = await page.evaluate(() => document.getElementById('enq-detail').hidden);
    expect(hidden, 'close hides the panel');
    await page.click('[data-adm-row="ENQ-SEED0003"] [data-view]');
    state = await page.evaluate(() => ({ note: document.getElementById('enq-note').value }));
    expect(state.note === 'Sent the size chart.', 'existing admin note prefilled, got ' + state.note);
  });

  await scenario('status + note save sends the real UPDATE and reflects honestly', {}, async (page, user) => {
    patchCalls = [];
    await openInbox(page, user);
    await page.click('[data-adm-row="ENQ-SEED0002"] [data-view]');
    await page.waitForSelector('#enq-detail:not([hidden])', { timeout: 4000 });
    await page.selectOption('#enq-status', 'in_progress');
    await page.fill('#enq-note', 'Called the client.');
    await page.click('#enq-save');
    await page.waitForSelector('#adm-toast .ngd-alert-success', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      toast: document.querySelector('#adm-toast .ngd-alert-success').textContent.trim(),
      chip: document.querySelector('[data-adm-row="ENQ-SEED0002"] .ngd-status-chip').textContent.trim(),
      note: document.getElementById('enq-note').value,
    }));
    expect(patchCalls.length === 1, 'exactly one UPDATE sent, got ' + patchCalls.length);
    expect(/\/rest\/v1\/enquiries/.test(patchCalls[0].url) && /id=eq\.e2/.test(patchCalls[0].url),
      'UPDATE targets the exact enquiry row');
    expect(JSON.stringify(patchCalls[0].changes) === JSON.stringify({ status: 'in_progress', admin_note: 'Called the client.' }),
      'payload carries only status + admin note, got ' + JSON.stringify(patchCalls[0].changes));
    expect(state.toast === 'ENQ-SEED0002 was updated.', 'truthful toast, got ' + state.toast);
    expect(state.chip === 'In Progress', 'row chip reflects the saved status, got ' + state.chip);
    expect(state.note === 'Called the client.', 'panel keeps the saved note');
  });

  await scenario('failed save: honest error toast, row unchanged', { failPatch: true }, async (page, user) => {
    patchCalls = [];
    await openInbox(page, user);
    await page.click('[data-adm-row="ENQ-SEED0002"] [data-view]');
    await page.waitForSelector('#enq-detail:not([hidden])', { timeout: 4000 });
    await page.selectOption('#enq-status', 'closed');
    await page.click('#enq-save');
    await page.waitForSelector('#adm-toast .ngd-alert-danger', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      toast: document.querySelector('#adm-toast .ngd-alert-danger').textContent.trim(),
      chip: document.querySelector('[data-adm-row="ENQ-SEED0002"] .ngd-status-chip').textContent.trim(),
      saveEnabled: !document.getElementById('enq-save').disabled,
    }));
    expect(patchCalls.length === 1, 'the UPDATE really was attempted');
    expect(state.toast === 'Changes could not be saved. Please try again.', 'honest error copy, got ' + state.toast);
    expect(state.chip === 'New', 'row keeps its database status, got ' + state.chip);
    expect(state.saveEnabled, 'save button usable again');
  });

  await scenario('true empty inbox shows the empty stage', { seeds: [] }, async (page, user) => {
    await openInbox(page, user, 'empty');
    const state = await page.evaluate(() => ({
      empty: !document.getElementById('adm-stage-empty').hidden,
      table: document.getElementById('adm-table-card').hidden,
      count: document.getElementById('adm-count').textContent.trim(),
    }));
    expect(state.empty && state.table, 'empty stage shown, table hidden');
    expect(/0 of 0/.test(state.count), 'count reads zero, got ' + state.count);
  });

  await scenario('load error shows the error stage and retry recovers', { failFirstGet: true }, async (page, user) => {
    await openInbox(page, user, 'error');
    await page.click('#adm-retry');
    await page.waitForFunction(() => document.querySelectorAll('#adm-table-body tr').length === 4, null, { timeout: 8000 });
    const state = await page.evaluate(() => ({
      error: document.getElementById('adm-stage-error').hidden,
      count: document.getElementById('adm-count').textContent.trim(),
    }));
    expect(state.error, 'error stage cleared after retry');
    expect(state.count === '4 of 4 enquiries', 'live rows after retry, got ' + state.count);
  });

  await scenario('guard: customer role is turned away from the console', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/enquiries.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked enquiry cards, no page overflow', { viewport: { width: 390, height: 844 } }, async (page, user) => {
    await openInbox(page, user);
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#adm-cards-wrap .ngd-req-card').length,
      cardsVisible: !!document.getElementById('adm-cards-wrap').offsetParent,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(state.cardsVisible && state.cards === 4, 'stacked cards on mobile, got ' + state.cards);
    expect(state.scrollW <= state.clientW + 1, `no page overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-enquiries-mobile.png') });
  });

  await scenario('tablet 768: table scrolls inside its card, the page does not', { viewport: { width: 768, height: 1024 } }, async (page, user) => {
    await openInbox(page, user);
    const state = await page.evaluate(() => {
      const card = document.getElementById('adm-table-card');
      return {
        tableVisible: !!card.offsetParent,
        innerScroll: card.scrollWidth >= card.clientWidth,
        pageScrollW: document.documentElement.scrollWidth,
        pageClientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableVisible, 'table card visible at 768');
    expect(state.innerScroll, 'wide table contained by its own card');
    expect(state.pageScrollW <= state.pageClientW + 1, `page itself never overflows s=${state.pageScrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-enquiries-tablet.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-enquiries scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
