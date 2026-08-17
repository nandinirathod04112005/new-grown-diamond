/* ============================================================
   Admin Enquiries tests (STEP 28).
   Logs in as the mocked admin and verifies the Enquiries
   console: shell with the Enquiries route active, the
   10-column inbox joined to the demo customers (guest rows
   flagged, related products linked to the storefront), search /
   status + type + date-range filters / pagination, the honest
   status actions (Mark In Progress, Mark Responded, Close —
   truthful toasts, no fake email), the details panel (message,
   internal notes area that says it saves nothing, status
   actions), the ?customer= deep link, the loading/empty/error
   previews, guards and the table-vs-cards behaviour at
   1440/768/390.
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

async function openEnquiries(page, query) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/enquiries.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + inbox: Enquiries route active, 10 columns, joined customers + related links', {}, async (page) => {
    await openEnquiries(page);
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
        firstId: first.getAttribute('data-adm-row'),
        firstName: first.querySelector('td:nth-child(2) strong').textContent.trim(),
        relatedHref: (first.querySelector('td:nth-child(7) a') || {}).getAttribute?.('href'),
        jwHref: (document.querySelector('[data-adm-row="ENQ-2015"] td:nth-child(7) a') || {}).getAttribute?.('href'),
        guestNote: (document.querySelector('[data-adm-row="ENQ-2016"] td:nth-child(2)') || { textContent: '' }).textContent.replace(/\s+/g, ' '),
        actions: first.querySelectorAll('[data-adm-act]').length,
        total: (window.NGD_DEMO_ENQUIRIES || []).length,
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.active === 'enquiries', 'Enquiries route active, got ' + state.active);
    expect(state.title === 'Enquiries', 'page title, got ' + state.title);
    expect(/no email is sent/i.test(state.notice) &&
      /nothing is saved to any server/i.test(state.notice), 'honest demo notice');
    expect(JSON.stringify(state.heads) === JSON.stringify(
      ['Enquiry ID', 'Customer Name', 'Company', 'Email', 'Subject', 'Type',
        'Related Product', 'Date', 'Status', 'Actions']),
      'ten columns per spec, got ' + state.heads.join(','));
    expect(state.rows === 10, 'first page holds 10 rows, got ' + state.rows);
    expect(state.total === 18 && new RegExp('of ' + state.total).test(state.count),
      'count reflects the demo inbox, got ' + state.count);
    expect(state.firstId === 'ENQ-2018' && state.firstName === 'Priya Mehta',
      'newest enquiry first, joined to its account');
    expect(state.relatedHref === '../diamond-details.html?id=NGD-1015',
      'related diamond links to the storefront');
    expect(state.jwHref === '../jewellery-details.html?id=JW-1003',
      'related jewellery links to the storefront');
    expect(/Hannah Brooks/.test(state.guestNote) && /Guest/.test(state.guestNote),
      'guest enquiry flagged, got ' + state.guestNote);
    expect(state.actions === 4, 'four actions per row, got ' + state.actions);
  });

  await scenario('search, status + type filters and the date range', {}, async (page) => {
    await openEnquiries(page);
    await page.fill('#adm-search', 'ENQ-2011');
    let rows = await page.evaluate(() => document.querySelectorAll('#adm-table-body tr').length);
    expect(rows === 1, 'id search narrows to one, got ' + rows);
    await page.click('#adm-clear');
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    await page.selectOption('#adm-f-status', 'New');
    let state = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#adm-table-body tr td:nth-child(9)')].map((t) => t.textContent.trim()),
    }));
    expect(state.chips.length === 5 && state.chips.every((c) => c === 'New'),
      'status filter finds the five new enquiries, got ' + state.chips.length);
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-type', 'Jewellery');
    state = await page.evaluate(() => ({
      types: [...document.querySelectorAll('#adm-table-body tr td:nth-child(6)')].map((t) => t.textContent.trim()),
    }));
    expect(state.types.length === 4 && state.types.every((t) => t === 'Jewellery'),
      'type filter applies, got ' + state.types.join(','));
    await page.click('#adm-clear');
    await page.fill('#adm-f-from', '2026-08-01');
    await page.fill('#adm-f-to', '2026-08-09');
    state = await page.evaluate(() => ({
      dates: [...document.querySelectorAll('#adm-table-body tr td:nth-child(8)')].map((t) => t.textContent.trim()),
      chip: document.getElementById('adm-filter-count').textContent.trim(),
    }));
    expect(state.dates.length === 5 &&
      state.dates.every((d) => d >= '2026-08-01' && d <= '2026-08-09'),
      'date range applies, got ' + state.dates.join(','));
    expect(state.chip === '2', 'badge counts both date bounds, got ' + state.chip);
  });

  await scenario('pagination pages through the inbox', {}, async (page) => {
    await openEnquiries(page);
    await page.click('#adm-pagination [data-adm-page="2"]');
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      count: document.getElementById('adm-count').textContent,
      firstId: document.querySelector('#adm-table-body tr').getAttribute('data-adm-row'),
    }));
    expect(state.rows === 8 && state.firstId === 'ENQ-2008', 'second page holds the older half');
    expect(/Showing 11–18 of 18/.test(state.count), 'count window follows, got ' + state.count);
  });

  await scenario('honest status actions: mark in progress, then close, with truthful toasts', {}, async (page) => {
    await openEnquiries(page);
    await page.fill('#adm-search', 'ENQ-2018');
    await page.click('[data-adm-row="ENQ-2018"] [data-adm-act="progress"]');
    let state = await page.evaluate(() => ({
      chip: document.querySelector('#adm-table-body tr td:nth-child(9)').textContent.trim(),
      progressDisabled: document.querySelector('[data-adm-row="ENQ-2018"] [data-adm-act="progress"]').disabled,
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.chip === 'In Progress', 'status moved in the preview');
    expect(state.progressDisabled, 'current-status action disabled');
    expect(/marked In Progress in this demo preview/i.test(state.toast) &&
      /nothing was saved to any server/i.test(state.toast),
      'honest progress toast, got: ' + state.toast);
    expect(!/success|sent|emailed/i.test(state.toast), 'no fake success or email wording');
    await page.click('[data-adm-row="ENQ-2018"] [data-adm-act="close"]');
    state = await page.evaluate(() => ({
      chip: document.querySelector('#adm-table-body tr td:nth-child(9)').textContent.trim(),
      dimmed: document.querySelector('[data-adm-row="ENQ-2018"]').classList.contains('is-inactive'),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.chip === 'Closed' && state.dimmed, 'closed in the preview');
    expect(/closed in this demo preview/i.test(state.toast), 'honest close toast');
  });

  await scenario('details panel: message, notes area that saves nothing, status actions', {}, async (page) => {
    await openEnquiries(page);
    await page.fill('#adm-search', 'ENQ-2016');
    await page.click('[data-adm-row="ENQ-2016"] [data-adm-act="view"]');
    let state = await page.evaluate(() => {
      const panel = document.getElementById('enq-detail');
      return {
        shown: !panel.hidden,
        subject: panel.querySelector('h2').textContent.trim(),
        meta: panel.querySelector('.ngd-req-meta').textContent.replace(/\s+/g, ' '),
        message: panel.querySelector('[data-enq-sec="message"]').textContent.replace(/\s+/g, ' '),
        notesNote: panel.querySelector('[data-enq-sec="notes"]').textContent.replace(/\s+/g, ' '),
        actionNote: panel.querySelector('[data-enq-sec="actions"]').textContent.replace(/\s+/g, ' '),
        buttons: panel.querySelectorAll('[data-enq-status]').length,
      };
    });
    expect(state.shown && state.subject === 'Question about lab-grown certification',
      'panel opens with the subject');
    expect(/Hannah Brooks/.test(state.meta) && /Guest/.test(state.meta) &&
      /hannah\.brooks@mail\.example/.test(state.meta), 'guest sender identified');
    expect(/engagement ring/i.test(state.message), 'full message shown');
    expect(/notes are not saved anywhere yet/i.test(state.notesNote), 'honest notes microcopy');
    expect(/no email is sent/i.test(state.actionNote), 'honest status-action note');
    expect(state.buttons === 3, 'three status actions in the panel');
    /* a typed draft note survives a status change re-render (in-memory only) */
    await page.fill('#enq-notes', 'Call back on Monday about certification docs.');
    await page.click('#enq-detail [data-enq-status="Responded"]');
    state = await page.evaluate(() => ({
      chip: document.querySelector('#enq-detail .ngd-status-chip').textContent.trim(),
      note: document.getElementById('enq-notes').value,
      tableChip: document.querySelector('#adm-table-body tr td:nth-child(9)').textContent.trim(),
      respondedDisabled: document.querySelector('#enq-detail [data-enq-status="Responded"]').disabled,
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.chip === 'Responded' && state.tableChip === 'Responded',
      'panel action updates panel + table');
    expect(state.note === 'Call back on Monday about certification docs.',
      'draft note survives the re-render');
    expect(state.respondedDisabled, 'current status disabled in the panel');
    expect(/marked Responded in this demo preview/i.test(state.toast), 'honest panel toast');
    await page.click('#enq-detail-close');
    const hidden = await page.evaluate(() => document.getElementById('enq-detail').hidden);
    expect(hidden, 'close hides the panel');
  });

  await scenario('?customer= deep link pre-filters the inbox', {}, async (page) => {
    await openEnquiries(page, '?customer=CU-1005');
    const state = await page.evaluate(() => ({
      search: document.getElementById('adm-search').value,
      ids: [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')),
    }));
    expect(state.search === 'CU-1005', 'search pre-filled from the deep link');
    expect(JSON.stringify(state.ids) === JSON.stringify(['ENQ-2013', 'ENQ-2003']),
      'inbox filtered to the account, got ' + state.ids.join(','));
  });

  await scenario('UI states: loading, empty and error with retry', {}, async (page) => {
    await openEnquiries(page);
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
    expect(state.empty && /inbox is clear/i.test(state.text), 'empty design present');
    await page.click('[data-adm-state="error"]');
    await page.click('#adm-retry');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      on: document.querySelector('[data-adm-state="demo"]').classList.contains('is-on'),
    }));
    expect(state.rows === 10 && state.on, 'retry returns to the rows');
  });

  await scenario('guard: enquiries without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/admin/enquiries.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked enquiry cards, no page overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openEnquiries(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#adm-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        meta: cards[0].querySelector('.ngd-req-meta').textContent.replace(/\s+/g, ' '),
        actionH: cards[0].querySelector('.ngd-icon-btn').getBoundingClientRect().height,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden, 'table hidden on mobile');
    expect(state.cards === 10 && state.perRow === 1, 'stacked cards, got ' + state.perRow + ' per row');
    expect(/Type/.test(state.meta) && /Date/.test(state.meta), 'card meta shows type and date');
    expect(state.actionH >= 30, 'touch-friendly action buttons');
    expect(state.bodyW <= state.clientW + 1, `no page overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-enquiries-mobile.png') });
  });

  await scenario('tablet 768: compact table scrolls inside its card, page itself does not', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openEnquiries(page);
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
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-enquiries-desktop.png') });
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
