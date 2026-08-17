/* ============================================================
   Admin Jewellery Inventory tests (STEP 26).
   Logs in as the mocked admin and verifies the jewellery
   manager: shell with the Jewellery route active, the
   10-column table over the augmented demo collection
   (incl. the null-weight all-metal piece), search / the four
   filters / sort / pagination, the honest demo actions
   (feature, activate, archive with Undo), the Add/Edit
   form navigation, the loading/empty/error previews,
   guards and the table-vs-cards behaviour at 1440/768/390.
   Run:  node tests/admin-jewellery-ui.test.cjs
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

async function openInventory(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + table: Jewellery route active, 10 columns, first page of the collection', {}, async (page) => {
    await openInventory(page);
    const state = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.ngd-admin-table thead th')]
        .map((t) => t.textContent.trim() || 'Image');
      const first = document.querySelector('#adm-table-body tr');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
        diamondsLink: (document.querySelector('.ngd-dash-nav a[data-admin-route="diamonds"]') || {}).getAttribute?.('href'),
        title: document.querySelector('h1').textContent.trim(),
        notice: document.getElementById('adm-demo-note').textContent.replace(/\s+/g, ' '),
        heads,
        rows: document.querySelectorAll('#adm-table-body tr').length,
        count: document.getElementById('adm-count').textContent,
        thumb: !!first.querySelector('.ngd-req-thumb svg'),
        actions: first.querySelectorAll('[data-adm-act]').length,
        addHref: document.getElementById('adm-add').getAttribute('href'),
        collection: (window.NGD_DEMO_JEWELLERY || []).length,
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.active === 'jewellery', 'Jewellery route active, got ' + state.active);
    expect(state.diamondsLink === 'diamonds.html', 'Diamonds stays a real sidebar link');
    expect(state.title === 'Jewellery Inventory', 'page title, got ' + state.title);
    expect(/demo preview/i.test(state.notice) && /nothing is saved to any server/i.test(state.notice),
      'honest demo notice');
    expect(JSON.stringify(state.heads) === JSON.stringify(
      ['Image', 'SKU', 'Product Name', 'Category', 'Diamond Wt.',
        'Availability', 'Featured', 'Active', 'Updated', 'Actions']),
      'ten columns per spec, got ' + state.heads.join(','));
    expect(state.rows === 10, 'first page holds 10 rows, got ' + state.rows);
    expect(state.collection === 18 && new RegExp('of ' + state.collection).test(state.count),
      'count reflects the full collection, got ' + state.count);
    expect(state.thumb, 'category art thumbnails');
    expect(state.actions === 5, 'five actions per row, got ' + state.actions);
    expect(state.addHref === 'add-jewellery.html', 'Add Jewellery targets the future page');
  });

  await scenario('search, category options, filters and weight sort (nulls last)', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'JW-1007');
    let rows = await page.evaluate(() => document.querySelectorAll('#adm-table-body tr').length);
    expect(rows === 1, 'SKU search narrows to one, got ' + rows);
    await page.fill('#adm-search', 'tennis');
    let state = await page.evaluate(() => ({
      names: [...document.querySelectorAll('#adm-table-body tr td:nth-child(3)')].map((t) => t.textContent.trim()),
    }));
    expect(state.names.length === 2 && state.names.every((n) => /Tennis/.test(n)),
      'name search finds both tennis bracelets, got ' + state.names.join(','));
    await page.click('#adm-clear');
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    state = await page.evaluate(() => ({
      categories: [...document.querySelectorAll('#adm-f-category option')].map((o) => o.textContent.trim()),
    }));
    expect(JSON.stringify(state.categories) === JSON.stringify(
      ['All', 'Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles']),
      'the six spec categories in order, got ' + state.categories.join(','));
    await page.selectOption('#adm-f-category', 'Rings');
    state = await page.evaluate(() => ({
      cats: [...document.querySelectorAll('#adm-table-body tr td:nth-child(4)')].map((t) => t.textContent.trim()),
      chip: document.getElementById('adm-filter-count').textContent.trim(),
    }));
    expect(state.cats.length === 3 && state.cats.every((c) => c === 'Rings'), 'category filter applies');
    expect(state.chip === '1', 'active-filter badge counts, got ' + state.chip);
    await page.selectOption('#adm-f-availability', 'Made to Order');
    state = await page.evaluate(() => ({
      avail: [...document.querySelectorAll('#adm-table-body tr td:nth-child(6)')].map((t) => t.textContent.trim()),
      chip: document.getElementById('adm-filter-count').textContent.trim(),
    }));
    expect(state.avail.length > 0 && state.avail.every((a) => a === 'Made to Order'),
      'availability filter applies');
    expect(state.chip === '2', 'badge counts both filters');
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-status', 'inactive');
    state = await page.evaluate(() => ({
      skus: [...document.querySelectorAll('#adm-table-body tr td:nth-child(2)')].map((t) => t.textContent.trim()),
      chips: [...document.querySelectorAll('#adm-table-body .ngd-status-chip')].map((c) => c.textContent.trim()),
    }));
    expect(JSON.stringify(state.skus.slice().sort()) === JSON.stringify(['JW-1005', 'JW-1014']),
      'inactive filter finds the two deterministic inactive pieces, got ' + state.skus.join(','));
    expect(!state.chips.includes('Active'), 'no Active chips under the inactive filter');
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-featured', 'featured');
    state = await page.evaluate(() => ({
      featured: [...document.querySelectorAll('#adm-table-body tr td:nth-child(7)')].map((t) => t.textContent.trim()),
    }));
    expect(state.featured.length === 6 && state.featured.every((f) => f === 'Featured'),
      'featured filter finds the six deterministic featured pieces, got ' + state.featured.length);
    await page.click('#adm-clear');
    await page.selectOption('#adm-sort', 'weight-desc');
    const weights = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr td:nth-child(5)')].map((t) => parseFloat(t.textContent)));
    const sorted = [...weights].sort((a, b) => b - a);
    expect(JSON.stringify(weights) === JSON.stringify(sorted), 'weight sort orders the page');
    await page.click('#adm-pagination [data-adm-page="2"]');
    state = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('#adm-table-body tr td:nth-child(5)')].map((t) => t.textContent.trim());
      return { last: cells[cells.length - 1] };
    });
    expect(state.last === '—', 'the all-metal null-weight piece sorts last, got ' + state.last);
  });

  await scenario('pagination pages through the collection', {}, async (page) => {
    await openInventory(page);
    let state = await page.evaluate(() => ({
      buttons: [...document.querySelectorAll('#adm-pagination .page-item:not(.disabled) .page-link')]
        .map((b) => b.textContent.trim()),
      active: document.querySelector('#adm-pagination .page-item.active .page-link').textContent.trim(),
    }));
    expect(state.active === '1', 'starts on page one');
    await page.click('#adm-pagination [data-adm-page="2"]');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      active: document.querySelector('#adm-pagination .page-item.active .page-link').textContent.trim(),
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.active === '2', 'second page active');
    expect(state.rows === 8, 'remaining rows on the last page, got ' + state.rows);
    expect(/Showing 11–18 of 18/.test(state.count), 'count window follows, got ' + state.count);
    await page.click('#adm-pagination [data-adm-page="prev"]');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      active: document.querySelector('#adm-pagination .page-item.active .page-link').textContent.trim(),
    }));
    expect(state.active === '1' && state.rows === 10, 'prev returns to the first page');
  });

  await scenario('honest demo actions: feature + deactivate toggle with truthful toasts', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'JW-1001');
    const before = await page.evaluate(() => ({
      featured: document.querySelector('#adm-table-body tr td:nth-child(7)').textContent.trim(),
    }));
    expect(before.featured === 'Featured', 'JW-1001 starts featured (deterministic demo)');
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="feature"]');
    let state = await page.evaluate(() => ({
      featured: document.querySelector('#adm-table-body tr td:nth-child(7)').textContent.trim(),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.featured === '—', 'unfeatured in the preview');
    expect(/unfeatured in this demo preview/i.test(state.toast) &&
      /nothing was saved to any server/i.test(state.toast),
      'honest unfeature toast, got: ' + state.toast);
    expect(!/success|saved!/i.test(state.toast), 'no fake success wording');
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="active"]');
    state = await page.evaluate(() => ({
      active: document.querySelector('#adm-table-body tr td:nth-child(8)').textContent.trim(),
      inactiveClass: document.querySelector('[data-adm-row="JW-1001"]').classList.contains('is-inactive'),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
    }));
    expect(state.active === 'Inactive' && state.inactiveClass, 'deactivated in the preview');
    expect(/deactivated in this demo preview/i.test(state.toast), 'honest deactivate toast');
  });

  await scenario('archive removes from the preview with Undo restoring it', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'JW-1003');
    await page.click('[data-adm-row="JW-1003"] [data-adm-act="archive"]');
    let state = await page.evaluate(() => ({
      gone: !document.querySelector('[data-adm-row="JW-1003"]'),
      toast: document.querySelector('#adm-toast .ngd-alert').textContent,
      undo: !!document.getElementById('adm-undo'),
    }));
    expect(state.gone, 'row archived out of the preview');
    expect(/archived in this demo preview/i.test(state.toast) && state.undo,
      'honest archive toast with Undo');
    await page.click('#adm-undo');
    state = await page.evaluate(() => ({
      back: !!document.querySelector('[data-adm-row="JW-1003"]'),
    }));
    expect(state.back, 'Undo restores the piece');
    await page.click('#adm-clear');
    const countText = await page.textContent('#adm-count');
    expect(/collection: 18/.test(countText), 'collection back to full size');
  });

  await scenario('view + edit + add navigate to their pages (forms honest)', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'JW-1002');
    const hrefs = await page.evaluate(() => ({
      view: document.querySelector('[data-adm-row="JW-1002"] [data-adm-act="view"]').getAttribute('href'),
      edit: document.querySelector('[data-adm-row="JW-1002"] [data-adm-act="edit"]').getAttribute('href'),
    }));
    expect(hrefs.view === '../jewellery-details.html?id=JW-1002', 'View targets the storefront details');
    expect(hrefs.edit === 'edit-jewellery.html?id=JW-1002', 'Edit targets the editor with the id');
    await page.click('[data-adm-row="JW-1002"] [data-adm-act="edit"]');
    await page.waitForURL('**/admin/edit-jewellery.html?id=JW-1002', { timeout: 8000 });
    /* the guard reveals the fail-closed body asynchronously; the STEP-27
       form then prefills from the demo record */
    await page.waitForFunction(() =>
      getComputedStyle(document.body).visibility === 'visible', null, { timeout: 8000 });
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'JW-1002',
      null, { timeout: 8000 });
    let formPage = await page.evaluate(() => ({
      title: document.querySelector('h1').textContent.trim(),
      active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
    }));
    expect(formPage.title === 'Edit Jewellery', 'edit form reached, got ' + formPage.title);
    expect(formPage.active === 'jewellery', 'Jewellery route stays active on the form');
    await page.click('#jw-cancel');
    await page.waitForURL('**/admin/jewellery.html', { timeout: 8000 });
    await page.waitForFunction(() => document.querySelectorAll('#adm-table-body tr').length > 0);
    await page.click('#adm-add');
    await page.waitForURL('**/admin/add-jewellery.html', { timeout: 8000 });
    await page.waitForFunction(() =>
      getComputedStyle(document.body).visibility === 'visible', null, { timeout: 8000 });
    formPage = await page.evaluate(() => ({
      title: document.querySelector('h1').textContent.trim(),
      form: !!document.getElementById('ngd-jewellery-form'),
    }));
    expect(formPage.title === 'Add Jewellery' && formPage.form, 'Add Jewellery form reached');
  });

  await scenario('UI states: loading, empty and error with retry', {}, async (page) => {
    await openInventory(page);
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
      cta: document.querySelector('#adm-stage-empty a').getAttribute('href'),
    }));
    expect(state.empty && state.cta === 'add-jewellery.html', 'empty design offers Add Jewellery');
    await page.click('[data-adm-state="error"]');
    await page.click('#adm-retry');
    state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      on: document.querySelector('[data-adm-state="demo"]').classList.contains('is-on'),
    }));
    expect(state.rows === 10 && state.on, 'retry returns to the rows');
  });

  await scenario('guard: inventory and placeholders without a session redirect to login', {}, async (page) => {
    await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    await page.goto(SITE + '/admin/add-jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked cards, table hidden, no page overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openInventory(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#adm-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        meta: cards[0].querySelector('.ngd-text-muted').textContent.trim(),
        actionH: cards[0].querySelector('.ngd-icon-btn').getBoundingClientRect().height,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden, 'table hidden on mobile');
    expect(state.cards === 10 && state.perRow === 1, 'stacked cards, got ' + state.perRow + ' per row');
    expect(/JW-\d+ · \w+ · .+ct/.test(state.meta), 'card meta shows SKU, category and weight, got ' + state.meta);
    expect(state.actionH >= 30, 'touch-friendly action buttons');
    expect(state.bodyW <= state.clientW + 1, `no page overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-jewellery-mobile.png') });
  });

  await scenario('tablet 768: compact table scrolls inside its card, page itself does not', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openInventory(page);
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
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-jewellery-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-jewellery scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
