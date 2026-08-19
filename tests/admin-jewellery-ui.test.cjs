/* ============================================================
   Admin Jewellery Inventory tests (LIVE).
   Logs in as the mocked admin and verifies the jewellery manager
   now reads public.jewellery through the Supabase client (mocked
   at the network layer, PostgREST-style): the 12-column table over
   the loaded rows (archived pieces excluded), search / filters /
   sort / pagination, the LIVE feature / activate / archive actions
   (confirm before deactivate + archive, PATCH with verification,
   re-read after success, archive = archived_at + inactive — never
   a DELETE), the ?added/?updated/?archived arrival toasts, the
   real loading/empty/error lifecycle with retry, the admin guard,
   the customer block and the table-vs-cards behaviour at
   1440/768/390.
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

/* ---- a PostgREST-style jewellery store (28 live + 1 archived) ---- */
function seedJewellery() {
  const CATS = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];
  const METALS = ['Gold', 'Platinum', 'Silver'];
  const rows = [];
  for (let i = 0; i < 28; i++) {
    const n = String(i + 1).padStart(2, '0');
    const day = String(i + 1).padStart(2, '0');
    rows.push({
      id: 'uuid-jew-' + n,
      public_id: 'JEW-SEED00' + n,
      sku: 'JW-10' + n,
      product_name: 'Piece No ' + n + (i % 9 === 3 ? ' Tennis' : ''),
      category: CATS[i % 6], subcategory: i % 2 ? 'Halo' : 'Solitaire',
      short_description: 'Seed piece ' + n, description: null,
      metal: METALS[i % 3], metal_karat: '18K', metal_color: 'White',
      gross_weight: 4 + i / 10,
      diamond_weight: i === 16 ? null : +(0.3 + ((i * 13) % 40) / 10).toFixed(2),
      diamond_pieces: i === 16 ? null : 10 + i,
      diamond_quality: i === 16 ? null : 'E–F / VVS', diamond_shape: i === 16 ? null : 'Round',
      certificate_number: null, size: null,
      price: 1000 + i * 10, currency: 'USD', price_visible: false,
      availability: i % 4 === 0 ? 'made_to_order' : 'available',
      featured: i % 5 === 0, active: i % 9 !== 4,
      internal_notes: null, archived_at: null,
      created_by: USERS.admin.id,
      created_at: `2026-08-${day}T10:00:00Z`,
      updated_at: `2026-08-${day}T10:00:00Z`,
    });
  }
  rows.push({
    ...rows[0],
    id: 'uuid-jew-99', public_id: 'JEW-SEED0099', sku: 'JW-1099',
    product_name: 'Archived Piece', featured: false, active: false,
    archived_at: '2026-08-10T10:00:00Z',
    created_at: '2026-08-10T09:00:00Z', updated_at: '2026-08-10T10:00:00Z',
  });
  return rows;
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
function makeMock(opts = {}) {
  const user = USERS[opts.role || 'admin'];
  const jewellery = opts.emptyInventory ? [] : seedJewellery();
  /* the newest piece carries a primary photo; every other row falls back to art */
  const images = opts.emptyInventory ? [] : [{
    id: 'img-28', jewellery_id: 'uuid-jew-28',
    image_path: 'jewellery/JEW-SEED0028/photo28aaaabbbb.png', sort_order: 1, is_primary: true,
  }];
  const patches = [];
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
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = jewellery.slice();
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) {
        rows = rows.filter((j) => j.public_id === pubEq.slice(3));
      }
      if (url.searchParams.get('archived_at') === 'is.null') {
        rows = rows.filter((j) => !j.archived_at);
      }
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'PATCH') {
      const changes = JSON.parse(req.postData() || '{}');
      const pubEq = url.searchParams.get('public_id') || '';
      const target = jewellery.find((j) => 'eq.' + j.public_id === pubEq);
      if (!target) return json(200, []);
      Object.assign(target, changes);
      patches.push({ publicId: pubEq.slice(3), changes });
      return json(200, [{ id: target.id }]);
    }
    if (url.pathname === '/rest/v1/jewellery_images' && method === 'GET') {
      let rows = images.slice();
      if (url.searchParams.get('is_primary') === 'eq.true') {
        rows = rows.filter((i) => i.is_primary);
      }
      const jewEq = url.searchParams.get('jewellery_id');
      if (jewEq && jewEq.startsWith('eq.')) {
        rows = rows.filter((i) => i.jewellery_id === jewEq.slice(3));
      }
      return json(200, rows);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/jewellery-images/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, jewellery, patches, images };
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

async function login(page, role) {
  const user = USERS[role || 'admin'];
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL(role === 'customer' ? '**/account/dashboard.html' : '**/admin/dashboard.html', { timeout: 10000 });
}

async function openInventory(page, query) {
  await login(page);
  await page.goto(SITE + '/admin/jewellery.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live list: 13 columns with the primary photo, archived rows excluded', {}, async (page) => {
    await openInventory(page);
    const state = await page.evaluate(() => {
      const first = document.querySelector('#adm-table-body tr');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-admin-route'),
        title: document.querySelector('h1').textContent.trim(),
        heads: [...document.querySelectorAll('.ngd-admin-table thead th')].map((t) => t.textContent.trim()),
        rows: document.querySelectorAll('#adm-table-body tr').length,
        firstSku: first.getAttribute('data-adm-row'),
        count: document.getElementById('adm-count').textContent,
        thumbPhoto: (first.querySelector('.ngd-req-thumb img') || { getAttribute: () => '' }).getAttribute('src') || '',
        secondThumbArt: !!document.querySelectorAll('#adm-table-body tr')[1].querySelector('.ngd-req-thumb svg'),
        actions: first.querySelectorAll('[data-adm-act]').length,
        editHref: first.querySelector('[data-adm-act="edit"]').getAttribute('href'),
        archivedListed: !!document.querySelector('[data-adm-row="JW-1099"]'),
        addHref: document.getElementById('adm-add').getAttribute('href'),
        demoDataLoaded: !!window.NGD_DEMO_JEWELLERY,
      };
    });
    expect(state.visible && state.active === 'jewellery', 'guard + route');
    expect(state.title === 'Jewellery Inventory', 'page title, got ' + state.title);
    expect(JSON.stringify(state.heads) === JSON.stringify(
      ['Image', 'SKU', 'Product Name', 'Category', 'Subcategory', 'Metal', 'Diamond Wt.',
        'Availability', 'Price', 'Featured', 'Active', 'Updated', 'Actions']),
      'thirteen columns incl. Image + Actions, got ' + state.heads.join(','));
    expect(state.rows === 10, 'first page holds 10 rows, got ' + state.rows);
    expect(state.firstSku === 'JW-1028', 'most recently updated piece first, got ' + state.firstSku);
    expect(/of 28/.test(state.count) && /\(28 total\)/.test(state.count),
      'count excludes the archived seed, got ' + state.count);
    expect(state.thumbPhoto.indexOf('jewellery/JEW-SEED0028/photo28aaaabbbb.png') !== -1,
      'a piece with a primary photo renders it, got ' + state.thumbPhoto);
    expect(state.secondThumbArt, 'pieces without a photo fall back to category art');
    expect(state.actions === 4, 'edit + feature + active + archive per row, got ' + state.actions);
    expect(state.editHref === 'edit-jewellery.html?id=JEW-SEED0028',
      'Edit targets the editor by public_id, got ' + state.editHref);
    expect(!state.archivedListed, 'the archived seed never renders in the normal list');
    expect(state.addHref === 'add-jewellery.html', 'Add button kept');
    expect(!state.demoDataLoaded, 'no demo catalogue script on this page');
  });

  await scenario('search, filters and weight sort over the live rows', {}, async (page) => {
    await openInventory(page);
    await page.fill('#adm-search', 'JW-1007');
    let rows = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')));
    expect(rows.length === 1 && rows[0] === 'JW-1007', 'SKU search narrows to one, got ' + rows.join(','));
    await page.fill('#adm-search', 'JW-1099');
    const noMatch = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      panel: !document.getElementById('adm-no-match').hidden,
    }));
    expect(noMatch.rows === 0 && noMatch.panel, 'the archived piece is unreachable even by search');
    await page.click('#adm-clear');
    await page.click('#adm-filters-toggle');
    await page.waitForSelector('#adm-filters.show', { timeout: 4000 });
    await page.selectOption('#adm-f-category', 'Rings');
    let state = await page.evaluate(() => ({
      cats: [...document.querySelectorAll('#adm-table-body tr td:nth-child(4)')].map((t) => t.textContent.trim()),
      chip: document.getElementById('adm-filter-count').textContent.trim(),
    }));
    expect(state.cats.length === 5 && state.cats.every((c) => c === 'Rings'),
      'category filter applies, got ' + state.cats.length);
    expect(state.chip === '1', 'active-filter badge counts, got ' + state.chip);
    await page.click('#adm-clear');
    await page.selectOption('#adm-f-status', 'inactive');
    state = await page.evaluate(() => ({
      skus: [...document.querySelectorAll('#adm-table-body tr')].map((r) => r.getAttribute('data-adm-row')).sort(),
    }));
    expect(JSON.stringify(state.skus) === JSON.stringify(['JW-1005', 'JW-1014', 'JW-1023']),
      'inactive filter finds the seeded inactive pieces, got ' + state.skus.join(','));
    await page.click('#adm-clear');
    await page.selectOption('#adm-sort', 'weight-desc');
    const weights = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body tr td:nth-child(7)')].map((t) => parseFloat(t.textContent)));
    const sorted = [...weights].sort((a, b) => b - a);
    expect(weights.every((w) => !Number.isNaN(w)) &&
      JSON.stringify(weights) === JSON.stringify(sorted), 'weight sort orders the page');
  });

  await scenario('pagination pages through the live inventory', {}, async (page) => {
    await openInventory(page);
    await page.click('#adm-pagination [data-adm-page="3"]');
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#adm-table-body tr').length,
      count: document.getElementById('adm-count').textContent,
    }));
    expect(state.rows === 8, 'last page holds the remainder, got ' + state.rows);
    expect(/Showing 21–28 of 28/.test(state.count), 'count window follows, got ' + state.count);
  });

  await scenario('feature, deactivate, reactivate and archive write through Supabase', {}, async (page, backend) => {
    await openInventory(page);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
    await page.fill('#adm-search', 'JW-1001');
    /* JW-1001 seeds featured + active; unfeature it */
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="feature"]');
    await page.waitForFunction(() =>
      /was unfeatured/.test((document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    let state = await page.evaluate(() => ({
      featured: document.querySelector('[data-adm-row="JW-1001"] td:nth-child(10)').textContent.trim(),
    }));
    expect(state.featured === '—', 'badge re-read as unfeatured after the update');
    expect(backend.patches.length === 1 && backend.patches[0].changes.featured === false &&
      !!backend.patches[0].changes.updated_at,
      'featured change PATCHed with updated_at');
    expect(dialogs.length === 0, 'no confirmation needed to unfeature');
    /* deactivate asks first */
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="active"]');
    await page.waitForFunction(() =>
      /was deactivated/.test((document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(dialogs.length === 1 && /Deactivate JW-1001/.test(dialogs[0]),
      'deactivation confirmed first, got: ' + dialogs.join(' | '));
    const dimmed = await page.evaluate(() =>
      document.querySelector('[data-adm-row="JW-1001"]').classList.contains('is-inactive'));
    expect(dimmed && backend.patches[1].changes.active === false, 'deactivation persisted and re-read');
    /* reactivate: no confirm, active back to true */
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="active"]');
    await page.waitForFunction(() =>
      /was activated/.test((document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(dialogs.length === 1 && backend.patches[2].changes.active === true,
      'reactivation persisted without a confirm');
    /* archive: confirm → archived_at + inactive, row leaves the list */
    await page.click('[data-adm-row="JW-1001"] [data-adm-act="archive"]');
    await page.waitForFunction(() =>
      /was archived/.test((document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(dialogs.length === 2 && /Archive JW-1001/.test(dialogs[1]), 'archive confirmed first');
    state = await page.evaluate(() => ({
      gone: !document.querySelector('[data-adm-row="JW-1001"]'),
    }));
    expect(state.gone, 'archived piece excluded from the re-read list');
    const patch = backend.patches[3];
    expect(!!patch.changes.archived_at && patch.changes.active === false,
      'archive sets archived_at + inactive — never a DELETE');
    const stored = backend.jewellery.find((j) => j.sku === 'JW-1001');
    expect(stored && !!stored.archived_at, 'the row still exists in the table, only archived');
    await page.click('#adm-clear');
    const countText = await page.textContent('#adm-count');
    expect(/\(27 total\)/.test(countText), 'inventory count reflects the archive, got ' + countText);
  });

  await scenario('?added, ?updated and ?archived arrivals show their success toasts', {}, async (page) => {
    await openInventory(page, '?added=JW-2001');
    await page.waitForFunction(() =>
      /JW-2001 was added to the inventory/.test(document.getElementById('adm-toast').textContent),
      null, { timeout: 8000 });
    await page.goto(SITE + '/admin/jewellery.html?updated=TEST-JEW-001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      /TEST-JEW-001 was updated successfully/.test(document.getElementById('adm-toast').textContent),
      null, { timeout: 10000 });
    await page.goto(SITE + '/admin/jewellery.html?archived=JW-1004', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      /JW-1004 was archived and removed from the normal inventory/.test(document.getElementById('adm-toast').textContent),
      null, { timeout: 10000 });
    const success = await page.evaluate(() => !!document.querySelector('#adm-toast .ngd-alert-success'));
    expect(success, 'arrival toasts use the success style');
  });

  await scenario('real error state with Retry re-querying Supabase', {
    routes: async (context, backend) => {
      /* one HTTP 500 (supabase-js transparently retries network-level
         aborts, so a status error is the deterministic way to fail) */
      let calls = 0;
      await context.route(SB_HOST + '/rest/v1/jewellery*', (route) => {
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
    await login(page);
    await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('adm-stage-error').hidden, null, { timeout: 10000 });
    const tableHidden = await page.evaluate(() => document.getElementById('adm-table-card').hidden);
    expect(tableHidden, 'honest error state on a failed query');
    await page.click('#adm-retry');
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    const rows = await page.evaluate(() => document.querySelectorAll('#adm-table-body tr').length);
    expect(rows === 10, 'Retry re-queries and renders the inventory');
  });

  await scenario('empty inventory shows the real empty state with the Add CTA', { emptyInventory: true }, async (page) => {
    await login(page);
    await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('adm-stage-empty').hidden, null, { timeout: 10000 });
    const cta = await page.evaluate(() =>
      document.querySelector('#adm-stage-empty a').getAttribute('href'));
    expect(cta === 'add-jewellery.html', 'empty state offers Add Jewellery');
  });

  await scenario('guard: inventory without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('customer cannot open the jewellery manager — sent to their own dashboard', { role: 'customer' }, async (page) => {
    await login(page, 'customer');
    await page.goto(SITE + '/admin/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('mobile 390 cards with actions + tablet 768 contained table', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openInventory(page);
    let state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#adm-cards-wrap .ngd-req-card')];
      return {
        tableHidden: getComputedStyle(document.querySelector('[data-admin-section="table"]')).display === 'none',
        cards: cards.length,
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        actionH: cards[0].querySelector('.ngd-icon-btn').getBoundingClientRect().height,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.tableHidden && state.cards === 10 && state.perRow === 1, 'stacked cards on mobile');
    expect(state.actionH >= 30, 'touch-friendly action buttons');
    expect(state.bodyW <= state.clientW + 1, `390 no overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'admin-jewellery-mobile.png') });
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
