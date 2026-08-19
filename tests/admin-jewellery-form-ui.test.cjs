/* ============================================================
   Admin Add/Edit Jewellery form tests (LIVE).
   Logs in as the mocked admin and verifies both pages against a
   PostgREST-style network mock of public.jewellery:

   ADD — nine sections with the 23 real table columns, the
   sku/product_name/category required trio, number validation,
   the live insert (generated JEW-XXXXXXXX public_id, created_by
   stamped, redirect + arrival toast, survives refresh), the
   case-insensitive duplicate-SKU pre-check, the 23505 race and
   RLS denial mapped to safe messages, Save & Add Another and the
   preview-only image gallery.

   EDIT — loads the live record by public_id (TEST-JEW-001
   recipe), prefills every column, updates with updated_at +
   row verification, rejects duplicate SKUs excluding the piece
   itself, surfaces RLS/vanished-record failures safely, archives
   softly (confirm → archived_at + inactive → gone from the normal
   list, never a DELETE), shows not-found for unknown/malformed
   ids and blocks customers.
   Run:  node tests/admin-jewellery-form-ui.test.cjs
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

function seedJewellery() {
  const base = {
    subcategory: 'Solitaire', short_description: 'Seed piece', description: 'Seed story',
    metal: 'Gold', metal_karat: '18K', metal_color: 'White', gross_weight: 4.5,
    diamond_weight: 1.1, diamond_pieces: 12, diamond_quality: 'E–F / VVS', diamond_shape: 'Round',
    certificate_number: null, size: null, price: 3200, currency: 'USD', price_visible: false,
    availability: 'available', featured: false, active: true, internal_notes: null,
    archived_at: null, created_by: USERS.admin.id,
  };
  const rows = [];
  /* the acceptance-recipe piece the user tests with */
  rows.push({
    ...base,
    id: 'uuid-jew-01', public_id: 'JEW-SEED0001', sku: 'TEST-JEW-001',
    product_name: 'Test Aurora Ring', category: 'Rings',
    description: 'The longer test story.', diamond_weight: 1.45, diamond_pieces: 25,
    certificate_number: 'NGDJ-582337', size: 'Ring size 52', price: 5200,
    internal_notes: 'Memo terms for the test piece.',
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
  });
  for (let i = 2; i <= 5; i++) {
    rows.push({
      ...base,
      id: 'uuid-jew-0' + i, public_id: 'JEW-SEED000' + i, sku: 'JW-100' + i,
      product_name: 'Seed Piece ' + i, category: 'Earrings',
      created_at: `2026-08-0${i}T10:00:00Z`, updated_at: `2026-08-0${i}T10:00:00Z`,
    });
  }
  /* an all-metal bangle: diamond fields stay null */
  rows.push({
    ...base,
    id: 'uuid-jew-06', public_id: 'JEW-SEED0006', sku: 'JW-1006',
    product_name: 'Plain Gold Bangle', category: 'Bangles', metal_karat: '22K',
    diamond_weight: null, diamond_pieces: null, diamond_quality: null, diamond_shape: null,
    created_at: '2026-08-06T10:00:00Z', updated_at: '2026-08-06T10:00:00Z',
  });
  return rows;
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const user = USERS[opts.role || 'admin'];
  const jewellery = seedJewellery();
  const inserts = [];
  const patches = [];
  let newSeq = 0;
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
      const skuIlike = url.searchParams.get('sku');
      if (skuIlike && skuIlike.startsWith('ilike.')) {
        const pattern = skuIlike.slice(6).toLowerCase();
        rows = rows.filter((j) => (j.sku || '').toLowerCase() === pattern);
        if (opts.precheckMiss) rows = [];
      }
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
      if (opts.rlsDenyPatch) {
        return json(401, { code: '42501', message: 'new row violates row-level security policy for table "jewellery"', details: null, hint: null });
      }
      const pubEq = url.searchParams.get('public_id') || '';
      const target = jewellery.find((j) => 'eq.' + j.public_id === pubEq);
      if (opts.patchMiss || !target) return json(200, []);
      Object.assign(target, changes);
      patches.push({ publicId: pubEq.slice(3), changes });
      return json(200, [{ id: target.id }]);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const rec = Array.isArray(body) ? body[0] : body;
      inserts.push(rec);
      if (opts.rlsDenyInsert) {
        return json(401, { code: '42501', message: 'new row violates row-level security policy for table "jewellery"', details: null, hint: null });
      }
      if (jewellery.some((j) => (j.sku || '').toLowerCase() === (rec.sku || '').toLowerCase())) {
        return json(409, { code: '23505', message: 'duplicate key value violates unique constraint "jewellery_sku_unique_ci"', details: 'Key (lower(btrim(sku))) already exists.', hint: null });
      }
      newSeq++;
      jewellery.push({
        id: 'uuid-new-' + newSeq,
        created_at: '2026-08-31T12:00:0' + newSeq + 'Z',
        updated_at: '2026-08-31T12:00:0' + newSeq + 'Z',
        archived_at: null,
        ...rec,
      });
      return route.fulfill({ status: 201, headers: CORS, body: '' });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, jewellery, inserts, patches };
}

const FIELD_NAMES = ['sku', 'product_name', 'size', 'short_description', 'description',
  'category', 'subcategory', 'metal', 'metal_karat', 'metal_color', 'gross_weight',
  'diamond_weight', 'diamond_pieces', 'diamond_quality', 'diamond_shape',
  'certificate_number', 'price', 'currency', 'price_visible', 'availability',
  'featured', 'active', 'internal_notes'];

/* a real 1×1 PNG for preview tests */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

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

async function login(page, role) {
  const user = USERS[role || 'admin'];
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL(role === 'customer' ? '**/account/dashboard.html' : '**/admin/dashboard.html', { timeout: 10000 });
}

async function openAdd(page) {
  await login(page);
  await page.goto(SITE + '/admin/add-jewellery.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function openEdit(page, id) {
  await login(page);
  await page.goto(SITE + '/admin/edit-jewellery.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function fillMinimumValid(page, sku) {
  await page.fill('[name="sku"]', sku || 'JW-2001');
  await page.fill('[name="product_name"]', 'Test Halo Ring');
  await page.selectOption('[name="category"]', 'Rings');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('add: nine sections, the 23 real columns, required trio, buttons', {}, async (page) => {
    await openAdd(page);
    const state = await page.evaluate((names) => ({
      title: document.querySelector('h1').textContent.trim(),
      sections: [...document.querySelectorAll('[data-form-section]')]
        .map((s) => s.getAttribute('data-form-section')),
      fields: names.filter((n) => !document.querySelector('[name="' + n + '"]')),
      staleFields: ['full_description', 'metal_colour', 'price_visibility']
        .filter((n) => !!document.querySelector('[name="' + n + '"]')),
      stars: document.querySelectorAll('.ngd-req-star').length,
      availability: [...document.querySelectorAll('[name="availability"] option')].map((o) => o.value).filter(Boolean),
      buttons: {
        save: document.getElementById('jw-submit').textContent.trim(),
        another: !!document.getElementById('jw-save-another'),
        cancel: document.getElementById('jw-cancel').getAttribute('href'),
        archive: !!document.getElementById('jw-archive'),
      },
      sticky: getComputedStyle(document.querySelector('.ngd-form-actions')).position === 'sticky',
    }), FIELD_NAMES);
    expect(state.title === 'Add Jewellery', 'title, got ' + state.title);
    expect(JSON.stringify(state.sections) === JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9']),
      'nine sections in order, got ' + state.sections.join(','));
    expect(state.fields.length === 0, 'all 23 live columns present, missing: ' + state.fields.join(','));
    expect(state.staleFields.length === 0, 'no stale field names left, found: ' + state.staleFields.join(','));
    expect(state.stars === 3, 'required trio only (sku, product name, category), got ' + state.stars);
    expect(JSON.stringify(state.availability) === JSON.stringify(['available', 'made_to_order', 'sold']),
      'availability uses the table values, got ' + state.availability.join(','));
    expect(state.buttons.save === 'Save Jewellery' && state.buttons.another &&
      state.buttons.cancel === 'jewellery.html' && !state.buttons.archive,
      'add-page buttons per spec');
    expect(state.sticky, 'sticky save actions');
  });

  await scenario('validation: required trio flagged, number ranges enforced, nothing sent', {}, async (page, backend) => {
    await openAdd(page);
    await page.click('#jw-submit');
    let state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-jewellery-form .is-invalid')].map((el) => el.name).sort(),
      alert: (document.querySelector('#jw-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(JSON.stringify(state.invalid) === JSON.stringify(['category', 'product_name', 'sku']),
      'the required trio flagged, got ' + state.invalid.join(','));
    expect(/highlighted fields/i.test(state.alert), 'error summary shown');
    await fillMinimumValid(page);
    await page.fill('[name="gross_weight"]', '600');
    await page.fill('[name="diamond_weight"]', '60');
    await page.click('#jw-submit');
    state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-jewellery-form .is-invalid')].map((el) => el.name).sort(),
    }));
    expect(JSON.stringify(state.invalid) === JSON.stringify(['diamond_weight', 'gross_weight']),
      'out-of-range numbers flagged, got ' + state.invalid.join(','));
    expect(backend.inserts.length === 0, 'nothing sent while invalid');
    await page.fill('[name="gross_weight"]', '4.50');
    const cleared = await page.evaluate(() =>
      !document.querySelector('[name="gross_weight"]').classList.contains('is-invalid'));
    expect(cleared, 'typing clears the flag');
  });

  await scenario('live add: insert with generated public_id, redirect, appears, survives refresh', {}, async (page, backend) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (d) => { dialogSeen = d.type(); d.accept(); });
    await fillMinimumValid(page, 'JW-2001');
    await page.fill('[name="price"]', '5200');
    await page.fill('[name="diamond_pieces"]', '25');
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?added=JW-2001', { timeout: 10000 });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    expect(backend.inserts.length === 1, 'exactly one insert sent');
    const rec = backend.inserts[0];
    expect(/^JEW-[A-HJ-NP-Z2-9]{8}$/.test(rec.public_id),
      'generated public_id like JEW-XXXXXXXX, got ' + rec.public_id);
    expect(rec.created_by === USERS.admin.id, 'created_by is the signed-in admin');
    expect(rec.sku === 'JW-2001' && rec.category === 'Rings' && rec.price === 5200 &&
      rec.diamond_pieces === 25 && rec.active === true && rec.metal === null,
      'payload saved verbatim (optional metal null), got ' + JSON.stringify(rec).slice(0, 160));
    expect(!('updated_at' in rec), 'add never fakes an updated_at');
    expect(dialogSeen === null, 'no unsaved-changes warning after a successful save');
    let row = await page.evaluate(() => !!document.querySelector('[data-adm-row="JW-2001"]'));
    expect(row, 'JW-2001 appears in the re-read live list');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    row = await page.evaluate(() => !!document.querySelector('[data-adm-row="JW-2001"]'));
    expect(row, 'JW-2001 still listed after a refresh (read back from the table)');
  });

  await scenario('duplicate SKU rejected by the case-insensitive pre-check, nothing inserted', {}, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'test-jew-001');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      skuInvalid: document.querySelector('[name="sku"]').classList.contains('is-invalid'),
      url: location.pathname,
    }));
    expect(/test-jew-001 already exists/i.test(state.alert) && /unique/i.test(state.alert),
      'friendly duplicate message, got: ' + state.alert);
    expect(state.skuInvalid, 'sku field flagged');
    expect(/add-jewellery\.html$/.test(state.url), 'stays on the form');
    expect(backend.inserts.length === 0, 'insert never sent — caught by the pre-check');
  });

  await scenario('duplicate at insert time (23505 race) maps to the same safe message', { precheckMiss: true }, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'JW-1002');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      url: location.pathname,
    }));
    expect(backend.inserts.length === 1, 'insert reached the database constraint');
    expect(/already exists|must be unique/i.test(state.alert) && !/23505|constraint/i.test(state.alert),
      'unique-violation mapped safely, got: ' + state.alert);
    expect(/add-jewellery\.html$/.test(state.url), 'stays on the form');
  });

  await scenario('RLS denial on insert maps to a safe admin-only message', { rlsDenyInsert: true }, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page, 'JW-2009');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const alert = await page.evaluate(() =>
      document.querySelector('#jw-alert .ngd-alert').textContent);
    expect(/only an active admin/i.test(alert) && /not allowed to change jewellery/i.test(alert),
      'RLS denial explained safely, got: ' + alert);
    expect(!/42501|violates row-level/i.test(alert), 'no raw database internals');
  });

  await scenario('save & add another: real insert, cleared form, distinct public_ids', {}, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'JW-2002');
    await page.click('#jw-save-another');
    await page.waitForSelector('#jw-alert .ngd-alert-success', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      sku: document.querySelector('[name="sku"]').value,
    }));
    expect(/JW-2002 was added/.test(state.alert) && /ready for another/i.test(state.alert),
      'true success notice, got: ' + state.alert);
    expect(state.sku === '', 'form cleared for the next piece');
    await fillMinimumValid(page, 'JW-2003');
    await page.click('#jw-save-another');
    await page.waitForFunction(() =>
      /JW-2003/.test((document.querySelector('#jw-alert .ngd-alert') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(backend.inserts.length === 2, 'two inserts sent');
    expect(backend.inserts[0].public_id !== backend.inserts[1].public_id,
      'each piece gets its own public_id');
  });

  await scenario('image gallery stays a validated local preview — nothing uploaded on save', {}, async (page, backend) => {
    await openAdd(page);
    await page.setInputFiles('#jw-file', [
      { name: 'a.png', mimeType: 'image/png', buffer: PNG_1PX },
      { name: 'b.png', mimeType: 'image/png', buffer: PNG_1PX },
    ]);
    await page.waitForFunction(() =>
      document.querySelectorAll('#jw-gallery .ngd-img-tile').length === 2);
    await page.setInputFiles('#jw-file', {
      name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello'),
    });
    let state = await page.evaluate(() => ({
      error: document.getElementById('jw-image-error').textContent,
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
      badge: (document.querySelector('#jw-gallery .ngd-status-chip') || { textContent: '' }).textContent.trim(),
    }));
    expect(/isn.t supported/i.test(state.error) && state.tiles === 2,
      'wrong type rejected inline, got: ' + state.error);
    expect(state.badge === 'Primary', 'first image is primary by default');
    await page.setInputFiles('#jw-file', {
      name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('jw-image-error').textContent,
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
    }));
    expect(/larger than 10/i.test(state.error) && state.tiles === 2,
      'oversize rejected inline, got: ' + state.error);
    await fillMinimumValid(page, 'JW-2004');
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?added=JW-2004', { timeout: 10000 });
    const noStorage = await page.evaluate(() => true);
    expect(noStorage && backend.inserts.length === 1 && !('images' in backend.inserts[0]) &&
      !('image_path' in backend.inserts[0]),
      'the insert carries no image data — jewellery uploads are a later phase');
  });

  await scenario('unsaved changes: dirty form warns before leaving; clean form does not', {}, async (page) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (dialog) => {
      dialogSeen = dialog.type();
      dialog.accept();
    });
    await page.fill('[name="sku"]', 'JW-2005');
    await page.click('.ngd-dash-nav a[data-admin-route="dashboard"]');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    expect(dialogSeen === 'beforeunload', 'beforeunload warning fired for a dirty form');
    dialogSeen = null;
    await page.goto(SITE + '/admin/add-jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.click('#jw-cancel');
    await page.waitForURL('**/admin/jewellery.html', { timeout: 8000 });
    expect(dialogSeen === null, 'no warning when nothing changed');
  });

  await scenario('TEST-JEW-001 recipe: live load by public_id, full prefill, update, redirect', {}, async (page, backend) => {
    await openEdit(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'TEST-JEW-001', null, { timeout: 10000 });
    const before = await page.evaluate(() => {
      const v = (n) => document.querySelector('[name="' + n + '"]').value;
      return {
        title: document.querySelector('h1').textContent.trim(),
        editingId: document.getElementById('jw-editing-id').textContent.trim(),
        chip: [...document.querySelectorAll('.ngd-demo-chip')].map((c) => c.textContent.trim()).join('|'),
        mismatches: [
          ['product_name', v('product_name') === 'Test Aurora Ring'],
          ['category', v('category') === 'Rings'],
          ['subcategory', v('subcategory') === 'Solitaire'],
          ['short_description', v('short_description') === 'Seed piece'],
          ['description', v('description') === 'The longer test story.'],
          ['metal', v('metal') === 'Gold'],
          ['metal_karat', v('metal_karat') === '18K'],
          ['metal_color', v('metal_color') === 'White'],
          ['gross_weight', parseFloat(v('gross_weight')) === 4.5],
          ['diamond_weight', parseFloat(v('diamond_weight')) === 1.45],
          ['diamond_pieces', parseInt(v('diamond_pieces'), 10) === 25],
          ['diamond_quality', v('diamond_quality') === 'E–F / VVS'],
          ['diamond_shape', v('diamond_shape') === 'Round'],
          ['certificate_number', v('certificate_number') === 'NGDJ-582337'],
          ['size', v('size') === 'Ring size 52'],
          ['price', parseFloat(v('price')) === 5200],
          ['currency', v('currency') === 'USD'],
          ['availability', v('availability') === 'available'],
          ['internal_notes', v('internal_notes') === 'Memo terms for the test piece.'],
        ].filter((pair) => !pair[1]).map((pair) => pair[0]),
        featured: document.querySelector('[name="featured"]').checked,
        active: document.querySelector('[name="active"]').checked,
        priceVisible: document.querySelector('[name="price_visible"]').checked,
        buttons: {
          update: document.getElementById('jw-submit').textContent.trim(),
          archive: !!document.getElementById('jw-archive'),
          another: !!document.getElementById('jw-save-another'),
        },
      };
    });
    expect(before.title === 'Edit Jewellery' && before.editingId === 'TEST-JEW-001', 'editing header names the SKU');
    expect(/Live Supabase editor/.test(before.chip) && !/nothing saves yet/i.test(before.chip),
      'live chip replaces the demo chip, got ' + before.chip);
    expect(before.mismatches.length === 0, 'every column prefilled, wrong: ' + before.mismatches.join(','));
    expect(!before.featured && before.active && !before.priceVisible, 'checkbox states from the row');
    expect(before.buttons.update === 'Update Jewellery' && before.buttons.archive && !before.buttons.another,
      'edit-page buttons per spec');
    /* the user's recipe: change the name, save, the table shows it */
    await page.fill('[name="product_name"]', 'Test Aurora Ring V2');
    await page.check('[name="price_visible"]');
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?updated=TEST-JEW-001', { timeout: 10000 });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    expect(backend.patches.length === 1, 'exactly one PATCH sent');
    const patch = backend.patches[0];
    expect(patch.publicId === 'JEW-SEED0001' && patch.changes.product_name === 'Test Aurora Ring V2' &&
      patch.changes.price_visible === true && !!patch.changes.updated_at,
      'update PATCHed with updated_at, got ' + JSON.stringify(patch.changes).slice(0, 160));
    expect(!('public_id' in patch.changes) && !('created_by' in patch.changes),
      'immutable identity columns never sent on update');
    const state = await page.evaluate(() => ({
      toast: (document.querySelector('#adm-toast .ngd-alert') || { textContent: '' }).textContent,
      nameCell: (document.querySelector('[data-adm-row="TEST-JEW-001"] td:nth-child(2)') || { textContent: '' }).textContent.trim(),
    }));
    expect(/TEST-JEW-001 was updated successfully/.test(state.toast), 'arrival toast confirms the update');
    expect(state.nameCell === 'Test Aurora Ring V2', 'list shows the new name, got ' + state.nameCell);
    /* refresh: the change came back from the table, not page state */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    const kept = await page.evaluate(() =>
      (document.querySelector('[data-adm-row="TEST-JEW-001"] td:nth-child(2)') || { textContent: '' }).textContent.trim());
    expect(kept === 'Test Aurora Ring V2', 'update survives a refresh');
  });

  await scenario('edit: all-metal piece prefills blank diamond fields; own SKU never a duplicate', {}, async (page, backend) => {
    await openEdit(page, 'JEW-SEED0006');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'JW-1006', null, { timeout: 10000 });
    const blank = await page.evaluate(() => ({
      weight: document.querySelector('[name="diamond_weight"]').value,
      quality: document.querySelector('[name="diamond_quality"]').value,
      shape: document.querySelector('[name="diamond_shape"]').value,
    }));
    expect(blank.weight === '' && blank.quality === '' && blank.shape === '',
      'null diamond fields stay blank for the all-metal bangle');
    /* saving with its own unchanged SKU must not trip the duplicate check */
    await page.fill('[name="product_name"]', 'Plain Gold Bangle V2');
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?updated=JW-1006', { timeout: 10000 });
    expect(backend.patches.length === 1, 'own-SKU save goes through');
  });

  await scenario('edit: duplicate SKU of another piece rejected case-insensitively, no PATCH', {}, async (page, backend) => {
    await openEdit(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'TEST-JEW-001', null, { timeout: 10000 });
    await page.fill('[name="sku"]', 'jw-1002');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      skuInvalid: document.querySelector('[name="sku"]').classList.contains('is-invalid'),
      url: location.pathname,
    }));
    expect(/jw-1002 already exists/i.test(state.alert) && /unique/i.test(state.alert),
      'duplicate rejected with the friendly message, got: ' + state.alert);
    expect(state.skuInvalid && /edit-jewellery\.html$/.test(state.url), 'flagged and stays on the form');
    expect(backend.patches.length === 0, 'nothing PATCHed');
  });

  await scenario('edit: RLS denial on update maps to the safe admin-only message', { rlsDenyPatch: true }, async (page) => {
    await openEdit(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'TEST-JEW-001', null, { timeout: 10000 });
    await page.fill('[name="product_name"]', 'Blocked Edit');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      url: location.pathname,
    }));
    expect(/only an active admin/i.test(state.alert) && !/42501|violates row-level/i.test(state.alert),
      'RLS denial explained safely, got: ' + state.alert);
    expect(/edit-jewellery\.html$/.test(state.url), 'stays on the edit page');
  });

  await scenario('edit: a vanished record is verified — nothing claimed changed', { patchMiss: true }, async (page) => {
    await openEdit(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'TEST-JEW-001', null, { timeout: 10000 });
    await page.fill('[name="product_name"]', 'Ghost Edit');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert-danger', { timeout: 8000 });
    const alert = await page.evaluate(() =>
      document.querySelector('#jw-alert .ngd-alert').textContent);
    expect(/no longer exists|could not be verified/i.test(alert) && /Nothing was changed/i.test(alert),
      'verification failure surfaced honestly, got: ' + alert);
  });

  await scenario('archive: confirm first, then archived_at + inactive, gone from the normal list', {}, async (page, backend) => {
    await openEdit(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'TEST-JEW-001', null, { timeout: 10000 });
    const dialogs = [];
    let acceptNext = false;
    page.on('dialog', (d) => { dialogs.push(d.message()); return acceptNext ? d.accept() : d.dismiss(); });
    /* declining the confirmation must change nothing */
    await page.click('#jw-archive');
    await page.waitForTimeout(400);
    expect(dialogs.length === 1 && /Archive TEST-JEW-001/.test(dialogs[0]),
      'confirmation asked first, got: ' + dialogs.join(' | '));
    expect(backend.patches.length === 0, 'cancelled archive changes nothing');
    /* accept: soft delete + redirect with the arrival toast */
    acceptNext = true;
    await page.click('#jw-archive');
    await page.waitForURL('**/admin/jewellery.html?archived=TEST-JEW-001', { timeout: 10000 });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    const patch = backend.patches[0];
    expect(!!patch.changes.archived_at && patch.changes.active === false && !!patch.changes.updated_at,
      'archive sets archived_at + inactive — never a DELETE, got ' + JSON.stringify(patch.changes));
    const stored = backend.jewellery.find((j) => j.sku === 'TEST-JEW-001');
    expect(stored && !!stored.archived_at, 'the row still exists in the table, only archived');
    const state = await page.evaluate(() => ({
      toast: (document.querySelector('#adm-toast .ngd-alert') || { textContent: '' }).textContent,
      listed: !!document.querySelector('[data-adm-row="TEST-JEW-001"]'),
    }));
    expect(/TEST-JEW-001 was archived and removed from the normal inventory/.test(state.toast),
      'arrival toast confirms the archive, got: ' + state.toast);
    expect(!state.listed, 'archived piece no longer in the normal list');
  });

  await scenario('edit: unknown and malformed ids show the not-found state', {}, async (page) => {
    await openEdit(page, 'JEW-ZZZZ9999');
    await page.waitForFunction(() => !document.getElementById('jw-notfound').hidden);
    let state = await page.evaluate(() => ({
      formHidden: document.getElementById('jw-form-wrap').hidden,
      id: document.getElementById('jw-notfound-id').textContent.trim(),
      back: !!document.querySelector('#jw-notfound a[href="jewellery.html"]'),
    }));
    expect(state.formHidden, 'form hidden for an unknown piece');
    expect(state.id === 'JEW-ZZZZ9999' && state.back, 'not-found names the id and offers the way back');
    /* a demo-era id no longer matches the JEW-XXXXXXXX format */
    await page.goto(SITE + '/admin/edit-jewellery.html?id=JW-1002', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('jw-notfound').hidden);
    state = await page.evaluate(() => ({
      formHidden: document.getElementById('jw-form-wrap').hidden,
      id: document.getElementById('jw-notfound-id').textContent.trim(),
    }));
    expect(state.formHidden && state.id === 'JW-1002', 'malformed public_id rejected without a query');
  });

  await scenario('customer cannot open the edit form — sent to their own dashboard', { role: 'customer' }, async (page, backend) => {
    await login(page, 'customer');
    await page.goto(SITE + '/admin/edit-jewellery.html?id=JEW-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    expect(backend.patches.length === 0 && backend.inserts.length === 0,
      'no writes from a customer session');
  });

  await scenario('responsive: 2-col rows at 1440, single column at 390, sticky bar reachable', { viewport: { width: 1440, height: 900 } }, async (page) => {
    await openAdd(page);
    let o = await page.evaluate(() => {
      const sku = document.querySelector('[name="sku"]').getBoundingClientRect();
      const name = document.querySelector('[name="product_name"]').getBoundingClientRect();
      return {
        sideBySide: name.left > sku.right,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(o.sideBySide, 'two-column rows on desktop');
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-form-desktop.png') });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `768 no overflow b=${o.bodyW}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => {
      const sku = document.querySelector('[name="sku"]').getBoundingClientRect();
      const name = document.querySelector('[name="product_name"]').getBoundingClientRect();
      const bar = document.querySelector('.ngd-form-actions').getBoundingClientRect();
      return {
        stacked: name.top > sku.bottom,
        fullWidth: sku.width > 250,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
        barVisible: bar.top < window.innerHeight,
      };
    });
    expect(o.stacked && o.fullWidth, 'single-column full-width fields on mobile');
    expect(o.barVisible, 'sticky action bar within reach');
    expect(o.bodyW <= o.clientW + 1, `390 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-form-mobile.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-form scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
