/* ============================================================
   Archived Diamonds management tests (Admin, LIVE).
   Against a PostgREST-style mocked Supabase backend: archived
   rows stay OUT of the default admin list but appear under the
   new Archived status view (clearly labelled, with Restore and
   Permanently Delete instead of the routine toggles). Restore
   PATCHes archived_at=null + active=true and the stone returns
   to the current inventory. Permanently Delete requires the
   native confirmation, refuses when quotes / holds / inspections
   / favourites / enquiries still reference the diamond (and when
   the database FK fires as the backstop), and cleans up stored
   files for a truly unreferenced stone. Add Diamond's duplicate
   check now says exactly WHERE the stock number lives — active
   inventory vs Archived Diamonds (with a restore deep-link).
   The dashboard KPI keeps counting current stones only, and the
   public storefront never sees any of it.
   Run:  node tests/diamond-archive.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CERT_BASE = SB_HOST + '/storage/v1/object/public/product-certificates/';
const CLN_IMAGE = 'diamonds/DIA-CLN00001/cleanimg12345678.png';
const CLN_CERT = 'diamonds/DIA-CLN00001/cleancert1234567.pdf';

const USERS = {
  admin: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@ngd.test', password: 'Admin#12345',
    profile: { role: 'admin', account_status: 'active', full_name: 'Asha Admin', company_name: null, phone: '+911111111111' },
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

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

function seedDiamonds() {
  const base = {
    report_number: 'LG58240001', shape: 'Round', carat: 1, color: 'D', clarity: 'IF',
    cut: 'Ideal', polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', certificate_number: 'LG58240001', certificate_url: null,
    measurements: '6.4 × 6.4 × 4.0 mm', depth_percentage: 62, table_percentage: 57,
    ratio: 1, growth_method: 'CVD', location: 'Surat atelier', availability: 'In Stock',
    price_per_carat: 1200, total_price: 1800, currency: 'USD', price_visible: false,
    featured: false, active: true, archived_at: null, internal_notes: null,
    image_path: null, created_by: USERS.admin.id,
    created_at: '2026-08-04T10:00:00Z', updated_at: '2026-08-04T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-a1', public_id: 'DIA-LIVE0001', stock_number: 'NGD-3001', created_at: '2026-08-06T10:00:00Z' },
    { ...base, id: 'uuid-a2', public_id: 'DIA-LIVE0002', stock_number: 'NGD-3002', created_at: '2026-08-05T10:00:00Z' },
    { ...base, id: 'uuid-h7', public_id: 'DIA-ARCH0001', stock_number: 'HJH-777', active: false, archived_at: '2026-07-20T00:00:00Z', created_at: '2026-08-03T10:00:00Z' },
    { ...base, id: 'uuid-c8', public_id: 'DIA-CLN00001', stock_number: 'CLN-888', active: false, archived_at: '2026-07-21T00:00:00Z', image_path: CLN_IMAGE, certificate_url: CERT_BASE + CLN_CERT, created_at: '2026-08-02T10:00:00Z' },
  ];
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const user = USERS.admin;
  const diamonds = seedDiamonds();
  const refs = Object.assign({ quotes: 0, holds: 0, inspections: 0, favourites: 0, enquiries: 0 }, opts.refs || {});
  const inserts = [];
  const patches = [];
  const deletes = [];
  const storageRemovals = [];
  function filterRows(url) {
    let rows = diamonds.slice();
    if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
    if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
    const stockEq = url.searchParams.get('stock_number');
    if (stockEq && stockEq.startsWith('eq.')) rows = rows.filter((d) => d.stock_number === stockEq.slice(3));
    const pubEq = url.searchParams.get('public_id');
    if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pubEq.slice(3));
    return rows;
  }
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
    if (url.pathname === '/auth/v1/user' && method === 'GET') return json(200, userObject(user));
    if (url.pathname === '/auth/v1/logout' && method === 'POST') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
      const row = { id: user.id, email: user.email, ...user.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, [row]);
    }

    /* ---- reference-count HEADs for the five history tables ---- */
    const refTable = url.pathname.match(/^\/rest\/v1\/(quotes|holds|inspections|favourites|enquiries)$/);
    if (refTable && method === 'HEAD') {
      const n = url.searchParams.get('diamond_id') ? refs[refTable[1]] : 0;
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '*/' + n }, body: '' });
    }

    /* ---- diamonds ---- */
    if (url.pathname === '/rest/v1/diamonds' && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '*/' + filterRows(url).length }, body: '' });
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      const rows = filterRows(url).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'POST') {
      inserts.push(JSON.parse(req.postData() || '{}'));
      return route.fulfill({ status: 201, headers: CORS, body: '' });
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'PATCH') {
      const changes = JSON.parse(req.postData() || '{}');
      const pubEq = url.searchParams.get('public_id') || '';
      const target = diamonds.find((d) => 'eq.' + d.public_id === pubEq);
      patches.push({ publicId: pubEq.slice(3), changes });
      if (!target) return json(200, []);
      Object.assign(target, changes);
      return json(200, [{ id: target.id }]);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'DELETE') {
      const pubEq = (url.searchParams.get('public_id') || '').slice(3);
      deletes.push(pubEq);
      if (opts.fkOnDelete) {
        return json(409, { code: '23503', message: 'update or delete on table "diamonds" violates foreign key constraint "quotes_diamond_id_fkey" on table "quotes"', details: 'Key (id) is still referenced from table "quotes".', hint: null });
      }
      const at = diamonds.findIndex((d) => d.public_id === pubEq);
      if (at === -1) return json(200, []);
      const removed = diamonds.splice(at, 1)[0];
      return json(200, [{ id: removed.id }]);
    }

    /* ---- storage cleanup ---- */
    const bucketDel = url.pathname.match(/^\/storage\/v1\/object\/(diamond-images|product-certificates)$/);
    if (bucketDel && method === 'DELETE') {
      const body = JSON.parse(req.postData() || '{}');
      (body.prefixes || []).forEach((p) => storageRemovals.push(bucketDel[1] + '/' + p));
      return json(200, []);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }

    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '*/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') return json(200, []);
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds, inserts, patches, deletes, storageRemovals };
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function waitFor(fn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return fn();
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
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
  const user = USERS.admin;
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
}

async function openList(page, query) {
  await page.goto(SITE + '/admin/diamonds.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
}

/** The filter controls live in a collapsed panel — open it first. */
async function openFilters(page) {
  await page.click('#adm-filters-toggle');
  await page.waitForSelector('#adm-filters.show', { timeout: 5000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('default list hides archived; the Archived view shows them clearly labelled with their own actions', {}, async (page) => {
    await login(page);
    await openList(page);
    let state = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('#adm-table-body [data-adm-row]')].map((r) => r.getAttribute('data-adm-row')),
      count: document.getElementById('adm-count').textContent,
      options: [...document.querySelectorAll('#adm-f-status option')].map((o) => o.value),
    }));
    expect(state.rows.indexOf('HJH-777') === -1 && state.rows.indexOf('CLN-888') === -1,
      'archived stones stay out of the default list, got ' + state.rows.join(','));
    expect(/inventory: 2 stones/.test(state.count), 'headline count means CURRENT stones, got ' + state.count);
    expect(state.options.join(',') === 'all,active,inactive,archived,everything',
      'the status filter offers Active/Inactive/Archived/All views, got ' + state.options.join(','));

    await openFilters(page);
    await page.selectOption('#adm-f-status', 'archived');
    state = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('#adm-table-body [data-adm-row]')].map((r) => r.getAttribute('data-adm-row')),
      chip: (document.querySelector('[data-adm-row="HJH-777"] .ngd-status-chip.is-bad') || { textContent: '' }).textContent.trim(),
      restore: !!document.querySelector('[data-adm-row="HJH-777"] [data-adm-act="restore"]'),
      del: !!document.querySelector('[data-adm-row="HJH-777"] [data-adm-act="delete-forever"]'),
      delTitle: (document.querySelector('[data-adm-row="HJH-777"] [data-adm-act="delete-forever"]') || { getAttribute: () => '' }).getAttribute('title'),
      routineToggles: document.querySelectorAll('#adm-table-body [data-adm-act="feature"], #adm-table-body [data-adm-act="active"], #adm-table-body [data-adm-act="archive"]').length,
    }));
    expect(state.rows.sort().join(',') === 'CLN-888,HJH-777', 'the Archived view lists exactly the archived stones');
    expect(state.chip === 'Archived', 'archived rows carry a clear Archived label, got "' + state.chip + '"');
    expect(state.restore && state.del && state.delTitle === 'Permanently Delete',
      'Restore + honestly-named Permanently Delete offered');
    expect(state.routineToggles === 0, 'feature/deactivate/archive toggles never show on archived rows');

    await page.selectOption('#adm-f-status', 'everything');
    const everything = await page.evaluate(() =>
      document.querySelectorAll('#adm-table-body [data-adm-row]').length);
    expect(everything === 4, 'Everything view shows current + archived, got ' + everything);
  });

  await scenario('the archived deep link (?status=archived&q=…) lands straight on the stone', {}, async (page) => {
    await login(page);
    await openList(page, '?status=archived&q=HJH-777');
    const state = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('#adm-table-body [data-adm-row]')].map((r) => r.getAttribute('data-adm-row')),
      select: document.getElementById('adm-f-status').value,
      search: document.getElementById('adm-search').value,
    }));
    expect(state.select === 'archived' && state.search === 'HJH-777', 'filter + search preselected from the URL');
    expect(state.rows.join(',') === 'HJH-777', 'exactly the archived stone shows, got ' + state.rows.join(','));
  });

  await scenario('Restore: archived_at cleared, active set, the stone returns to the current inventory', {}, async (page, backend) => {
    await login(page);
    await openList(page, '?status=archived');
    await page.click('[data-adm-row="HJH-777"] [data-adm-act="restore"]');
    await page.waitForFunction(() =>
      /HJH-777 was restored to the active inventory\./.test(
        (document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    const patch = backend.patches[0];
    expect(patch.publicId === 'DIA-ARCH0001' && patch.changes.archived_at === null &&
      patch.changes.active === true && !!patch.changes.updated_at,
      'restore PATCHes archived_at=null + active=true + updated_at, got ' + JSON.stringify(patch.changes));
    const archivedView = await page.evaluate(() =>
      [...document.querySelectorAll('#adm-table-body [data-adm-row]')].map((r) => r.getAttribute('data-adm-row')));
    expect(archivedView.indexOf('HJH-777') === -1, 'the stone left the Archived view after the re-read');
    await openFilters(page);
    await page.selectOption('#adm-f-status', 'all');
    const current = await page.evaluate(() => ({
      there: !!document.querySelector('[data-adm-row="HJH-777"]'),
      chips: [...document.querySelectorAll('[data-adm-row="HJH-777"] .ngd-status-chip')].map((c) => c.textContent.trim()),
    }));
    expect(current.there && current.chips.indexOf('Active') !== -1 && current.chips.indexOf('Archived') === -1,
      'restored stone is back in the current inventory as Active, got ' + current.chips.join(','));
  });

  await scenario('Add Diamond: a duplicate of an ACTIVE stone names the active inventory', {}, async (page, backend) => {
    await login(page);
    await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.fill('[name="stock_number"]', 'NGD-3001');
    await page.selectOption('[name="shape"]', 'Round');
    await page.fill('[name="carat"]', '1.25');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert-danger', { timeout: 8000 });
    const alert = await page.evaluate(() => document.querySelector('#dia-alert .ngd-alert').textContent);
    expect(/Stock number NGD-3001 already exists in the active inventory\./.test(alert),
      'the active-inventory message, got: ' + alert);
    expect(backend.inserts.length === 0, 'nothing was inserted');
  });

  await scenario('Add Diamond: a duplicate of an ARCHIVED stone says so and links to the restore path', {}, async (page, backend) => {
    await login(page);
    await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.fill('[name="stock_number"]', 'HJH-777');
    await page.selectOption('[name="shape"]', 'Round');
    await page.fill('[name="carat"]', '1.25');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
      linkHref: (document.querySelector('#dia-alert .ngd-alert a') || { getAttribute: () => null }).getAttribute('href'),
      linkText: (document.querySelector('#dia-alert .ngd-alert a') || { textContent: '' }).textContent.trim(),
    }));
    expect(/Stock number HJH-777 exists in Archived Diamonds\./.test(state.alert),
      'the archived-specific message, got: ' + state.alert);
    expect(state.linkHref === 'diamonds.html?status=archived&q=HJH-777' &&
      state.linkText === 'View Archived Diamond',
      'a real restore path is offered, got ' + state.linkHref);
    expect(backend.inserts.length === 0, 'nothing was inserted');
  });

  await scenario('a referenced diamond can NEVER be permanently deleted — honest copy, no DELETE sent', { refs: { quotes: 1, favourites: 2 } }, async (page, backend) => {
    await login(page);
    await openList(page, '?status=archived');
    page.on('dialog', (d) => d.accept());
    await page.click('[data-adm-row="HJH-777"] [data-adm-act="delete-forever"]');
    await page.waitForFunction(() =>
      /customer\/history records and cannot be permanently deleted/.test(
        (document.querySelector('#adm-toast .ngd-alert-danger') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    const toast = await page.evaluate(() =>
      document.querySelector('#adm-toast .ngd-alert-danger').textContent);
    expect(/Restore it or keep it archived\./.test(toast), 'the full guidance shows, got ' + toast);
    expect(backend.deletes.length === 0, 'no DELETE request was ever sent');
    const still = await page.evaluate(() => !!document.querySelector('[data-adm-row="HJH-777"]'));
    expect(still, 'the archived record is untouched');
  });

  await scenario('an unreferenced archived diamond deletes only after confirmation — files cleaned up too', {}, async (page, backend) => {
    await login(page);
    await openList(page, '?status=archived');
    let confirmMessage = '';
    let accept = false;
    page.on('dialog', (d) => {
      confirmMessage = d.message();
      return accept ? d.accept() : d.dismiss();
    });
    await page.click('[data-adm-row="CLN-888"] [data-adm-act="delete-forever"]');
    await page.waitForTimeout(300);
    expect(/Permanently delete CLN-888\?/.test(confirmMessage) && /cannot be undone/.test(confirmMessage),
      'a serious confirmation is required, got ' + confirmMessage);
    expect(backend.deletes.length === 0, 'declining the confirmation deletes nothing');

    accept = true;
    await page.click('[data-adm-row="CLN-888"] [data-adm-act="delete-forever"]');
    await page.waitForFunction(() =>
      /CLN-888 was permanently deleted\./.test(
        (document.querySelector('#adm-toast .ngd-alert-success') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(backend.deletes.length === 1 && backend.deletes[0] === 'DIA-CLN00001',
      'exactly one DELETE for the verified record, got ' + backend.deletes.join(','));
    const gone = await page.evaluate(() => !document.querySelector('[data-adm-row="CLN-888"]'));
    expect(gone, 'the stone left the Archived view');
    expect(await waitFor(() => backend.storageRemovals.length === 2), 'stored files retired');
    expect(backend.storageRemovals.indexOf('diamond-images/' + CLN_IMAGE) !== -1 &&
      backend.storageRemovals.indexOf('product-certificates/' + CLN_CERT) !== -1,
      'image + owned certificate cleaned up, got ' + backend.storageRemovals.join(','));
  });

  await scenario('the database FK backstop maps to the same honest message — no raw Supabase internals', { fkOnDelete: true }, async (page, backend) => {
    await login(page);
    await openList(page, '?status=archived');
    page.on('dialog', (d) => d.accept());
    await page.click('[data-adm-row="CLN-888"] [data-adm-act="delete-forever"]');
    await page.waitForFunction(() =>
      /cannot be permanently deleted/.test(
        (document.querySelector('#adm-toast .ngd-alert-danger') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(backend.deletes.length === 1, 'the DELETE was attempted and rejected by the database');
    const body = await page.evaluate(() => document.body.textContent);
    expect(body.indexOf('foreign key') === -1 && body.indexOf('23503') === -1 &&
      body.indexOf('quotes_diamond_id_fkey') === -1, 'raw constraint details never reach the admin');
  });

  await scenario('the dashboard diamond KPI counts current stones only', {}, async (page) => {
    await login(page);
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-admin-kpi="diamonds"] [data-admin-kpi-value]');
      return el && el.textContent.trim() !== '' && el.textContent.trim() !== '—';
    }, null, { timeout: 10000 });
    const kpi = await page.evaluate(() =>
      document.querySelector('[data-admin-kpi="diamonds"] [data-admin-kpi-value]').textContent.trim());
    expect(kpi === '2', 'archived stones never inflate the inventory KPI, got ' + kpi);
  });

  await scenario('the public storefront is untouched — archived and inactive stones stay invisible', {}, async (page) => {
    await page.goto(SITE + '/diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelectorAll('#inv-grid .ngd-diamond-card').length > 0, null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      stocks: [...document.querySelectorAll('#inv-grid .ngd-stock-no')].map((el) => el.textContent.trim()),
      body: document.body.textContent,
    }));
    expect(state.stocks.sort().join(',') === 'NGD-3001,NGD-3002',
      'only active, non-archived stones render, got ' + state.stocks.join(','));
    expect(state.body.indexOf('HJH-777') === -1 && state.body.indexOf('CLN-888') === -1,
      'archived stock numbers never reach the public page');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} diamond-archive scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
