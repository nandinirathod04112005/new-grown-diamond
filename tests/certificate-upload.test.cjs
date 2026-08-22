/* ============================================================
   Certificate Upload tests (Admin, LIVE — Diamonds + Jewellery).
   Against a PostgREST/Storage-style mocked Supabase backend:
   both Add/Edit consoles offer an Upload Certificate control
   that stores the file in the public product-certificates
   bucket under <kind>/<public_id>/<random>.<ext> (never the
   original filename) and saves ONLY the public URL into the
   row's certificate_url. Ordering is the proven image recipe:
   new file first, database save second, and only a successful
   save deletes a replaced OWNED file — a failed save deletes
   the fresh upload instead, and external lab links are never
   deleted. Client-side gates: PDF/JPG/PNG/WEBP, 10 MB, and an
   http(s)-only certificate_url on both forms.
   Run:  node tests/certificate-upload.test.cjs
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
const OLD_DIA_PATH = 'diamonds/DIA-EDIT0001/oldcert111111111.pdf';
const OLD_JW_PATH = 'jewellery/JEW-EDIT0001/oldcertjw2222222.png';
const EXTERNAL_CERT = 'https://www.igi.org/verify.php?r=LG58240002';

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
const PDF_MIN = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function seedDiamonds() {
  const base = {
    stock_number: 'NGD-9001', report_number: 'LG58240001', shape: 'Round', carat: 1,
    color: 'D', clarity: 'IF', cut: 'Ideal', polish: 'Excellent', symmetry: 'Very Good',
    fluorescence: 'None', laboratory: 'IGI', certificate_number: 'LG58240001',
    certificate_url: null, measurements: '6.4 × 6.4 × 4.0 mm', depth_percentage: 62,
    table_percentage: 57, ratio: 1, growth_method: 'CVD', location: 'Surat atelier',
    availability: 'In Stock', price_per_carat: 1200, total_price: 1800, currency: 'USD',
    price_visible: false, featured: false, active: true, internal_notes: null,
    image_path: null, created_by: USERS.admin.id,
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-dia-e1', public_id: 'DIA-EDIT0001', certificate_url: CERT_BASE + OLD_DIA_PATH },
    { ...base, id: 'uuid-dia-e2', public_id: 'DIA-EDIT0002', stock_number: 'NGD-9002', report_number: 'LG58240002', certificate_number: 'LG58240002', certificate_url: EXTERNAL_CERT },
  ];
}

function seedJewellery() {
  return [{
    id: 'uuid-jw-e1', public_id: 'JEW-EDIT0001', sku: 'JW-9001',
    product_name: 'Edit Halo Ring', category: 'Rings', subcategory: 'Halo',
    short_description: 'Seed piece', description: 'Story.', metal: 'Gold',
    metal_karat: '18K', metal_color: 'White', gross_weight: 4.5, diamond_weight: 1.45,
    diamond_pieces: 25, diamond_quality: 'E–F / VVS', diamond_shape: 'Round',
    certificate_number: 'NGDJ-9001', certificate_lab: 'HRD',
    certificate_url: CERT_BASE + OLD_JW_PATH, size: 'Ring size 52', price: 5200,
    currency: 'USD', price_visible: false, availability: 'available', featured: false,
    active: true, archived_at: null, internal_notes: null, created_by: USERS.admin.id,
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
  }];
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const user = USERS.admin;
  const diamonds = seedDiamonds();
  const jewellery = seedJewellery();
  const inserts = [];
  const patches = [];
  const uploads = [];
  const removals = [];
  const events = [];
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

    /* ---- product-certificates storage ---- */
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    if (url.pathname.startsWith('/storage/v1/object/product-certificates/') && (method === 'POST' || method === 'PUT')) {
      const p = decodeURIComponent(url.pathname.slice('/storage/v1/object/product-certificates/'.length));
      if (opts.failUpload) {
        return json(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      }
      uploads.push(p);
      events.push('upload:' + p);
      return json(200, { Key: 'product-certificates/' + p, path: p, id: 'cert-' + uploads.length, fullPath: 'product-certificates/' + p });
    }
    if (url.pathname === '/storage/v1/object/product-certificates' && method === 'DELETE') {
      const delBody = JSON.parse(req.postData() || '{}');
      (delBody.prefixes || []).forEach((p) => { removals.push(p); events.push('remove:' + p); });
      return json(200, []);
    }

    /* ---- diamonds ---- */
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      const stockEq = url.searchParams.get('stock_number');
      if (stockEq && stockEq.startsWith('eq.')) rows = rows.filter((d) => d.stock_number === stockEq.slice(3));
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pubEq.slice(3));
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const rec = Array.isArray(body) ? body[0] : body;
      inserts.push(rec);
      events.push('insert');
      if (opts.rlsDenyInsert) {
        return json(401, { code: '42501', message: 'new row violates row-level security policy for table "diamonds"', details: null, hint: null });
      }
      diamonds.push({ id: 'uuid-new-dia', created_at: '2026-08-31T12:00:00Z', updated_at: '2026-08-31T12:00:00Z', ...rec });
      return route.fulfill({ status: 201, headers: CORS, body: '' });
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'PATCH') {
      const changes = JSON.parse(req.postData() || '{}');
      const pubEq = url.searchParams.get('public_id') || '';
      const target = diamonds.find((d) => 'eq.' + d.public_id === pubEq);
      patches.push({ table: 'diamonds', publicId: pubEq.slice(3), changes });
      events.push('patch');
      if (opts.failPatch) {
        return json(500, { code: 'XX000', message: 'mock: the update exploded', details: null, hint: null });
      }
      if (!target) return json(200, []);
      Object.assign(target, changes);
      return json(200, [{ id: target.id }]);
    }

    /* ---- jewellery ---- */
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = jewellery.slice();
      const skuIlike = url.searchParams.get('sku');
      if (skuIlike && skuIlike.startsWith('ilike.')) {
        const want = skuIlike.slice(6).toLowerCase();
        rows = rows.filter((j) => String(j.sku).toLowerCase() === want);
      }
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((j) => j.public_id === pubEq.slice(3));
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((j) => !j.archived_at);
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const rec = Array.isArray(body) ? body[0] : body;
      inserts.push(rec);
      events.push('insert');
      jewellery.push({ id: 'uuid-new-jw', created_at: '2026-08-31T12:00:00Z', updated_at: '2026-08-31T12:00:00Z', ...rec });
      return json(201, [{ id: 'uuid-new-jw' }]);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'PATCH') {
      const changes = JSON.parse(req.postData() || '{}');
      const pubEq = url.searchParams.get('public_id') || '';
      const target = jewellery.find((j) => 'eq.' + j.public_id === pubEq);
      patches.push({ table: 'jewellery', publicId: pubEq.slice(3), changes });
      events.push('patch');
      if (!target) return json(200, []);
      Object.assign(target, changes);
      return json(200, [{ id: target.id }]);
    }
    if (url.pathname === '/rest/v1/jewellery_images' && method === 'GET') return json(200, []);

    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') return json(200, []);
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds, jewellery, inserts, patches, uploads, removals, events };
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

/** Storage cleanup is fire-and-forget in the app — poll the mock. */
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

async function openAdmin(page, path) {
  await page.goto(SITE + '/admin/' + path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

/** Edit pages wire the certificate picker after the async record (and,
    for jewellery, gallery) load — wait for the current-certificate row
    to appear before poking the controls. */
async function waitCertReady(page, prefix) {
  await page.waitForFunction((pre) =>
    !document.getElementById(pre + '-certificate-current').hidden, prefix, { timeout: 10000 });
}

async function fillDiamondMinimum(page, stock) {
  await page.fill('[name="stock_number"]', stock || 'NGD-3001');
  await page.selectOption('[name="shape"]', 'Round');
  await page.fill('[name="carat"]', '1.25');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('both add consoles offer the upload control (helper loaded, safe accept, no name attr)', {}, async (page) => {
    await login(page);
    for (const [path, prefix] of [['add-diamond.html', 'dia'], ['add-jewellery.html', 'jw']]) {
      await openAdmin(page, path);
      const state = await page.evaluate((pre) => {
        const input = document.getElementById(pre + '-certificate_file');
        return {
          helper: !!(window.NGDCertUpload && window.NGDCertUpload.BUCKET === 'product-certificates' &&
            window.NGDCertUpload.MAX_BYTES === 10 * 1024 * 1024),
          input: !!input,
          accept: input ? input.getAttribute('accept') : '',
          named: input ? input.hasAttribute('name') : true,
          info: (document.getElementById(pre + '-certificate-file-info') || { textContent: '' }).textContent,
          currentHidden: (document.getElementById(pre + '-certificate-current') || {}).hidden,
        };
      }, prefix);
      expect(state.helper, path + ': NGDCertUpload helper loaded with the 10 MB bucket contract');
      expect(state.input && state.accept === 'application/pdf,image/jpeg,image/png,image/webp',
        path + ': file input limited to PDF/JPG/PNG/WEBP, got ' + state.accept);
      expect(!state.named, path + ': the file input never enters the column payload (no name attribute)');
      expect(/max 10 MB/.test(state.info) || /uploads the file/.test(state.info), path + ': honest helper copy');
      expect(state.currentHidden === true, path + ': no phantom current-certificate row on a blank form');
    }
    /* jewellery add also gained the lab + URL columns */
    const jw = await page.evaluate(() => ({
      labOptions: [...document.querySelectorAll('[name="certificate_lab"] option')].map((o) => o.value).join(','),
      urlType: (document.querySelector('[name="certificate_url"]') || {}).type,
    }));
    expect(jw.labOptions === ',IGI,GIA,HRD,Other', 'grading lab choices, got ' + jw.labOptions);
    expect(jw.urlType === 'url', 'certificate_url is a URL field');
  });

  await scenario('diamond add: the PDF uploads FIRST under a random name, then the insert carries its public URL', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'add-diamond.html');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'IGI Original Report (final) v2.pdf', mimeType: 'application/pdf', buffer: PDF_MIN,
    });
    const picked = await page.evaluate(() =>
      document.getElementById('dia-certificate-file-info').textContent);
    expect(/PDF certificate selected/.test(picked) && /IGI Original Report/.test(picked),
      'the picked file is described honestly, got ' + picked);
    await fillDiamondMinimum(page, 'NGD-3001');
    await page.click('#dia-submit');
    await page.waitForURL('**/admin/diamonds.html?added=NGD-3001', { timeout: 10000 });
    expect(backend.uploads.length === 1 &&
      /^diamonds\/DIA-[A-Z0-9]{8}\/[a-z0-9]{16}\.pdf$/.test(backend.uploads[0]),
      'stored under diamonds/<public_id>/<random>.pdf, got ' + backend.uploads[0]);
    expect(!/IGI|Original|Report|final/i.test(backend.uploads[0].split('/')[2]),
      'the original filename never reaches Storage');
    expect(backend.inserts.length === 1 &&
      backend.inserts[0].certificate_url === CERT_BASE + backend.uploads[0],
      'the row saves the bucket public URL, got ' + backend.inserts[0].certificate_url);
    expect(backend.events.indexOf('upload:' + backend.uploads[0]) < backend.events.indexOf('insert'),
      'upload strictly precedes the insert');
    expect(backend.removals.length === 0, 'nothing deleted on a clean add');
  });

  await scenario('diamond add: wrong type and oversized files are refused before any request', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'add-diamond.html');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'cert.txt', mimeType: 'text/plain', buffer: Buffer.from('not a certificate'),
    });
    let alert = await page.evaluate(() =>
      (document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent);
    expect(/PDF, JPG, PNG or WEBP/.test(alert), 'type rejection copy, got ' + alert);
    let input = await page.evaluate(() => ({
      files: document.getElementById('dia-certificate_file').files.length,
      info: document.getElementById('dia-certificate-file-info').textContent,
    }));
    expect(input.files === 0 && !/selected/.test(input.info), 'the bad file is dropped again');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 37),
    });
    alert = await page.evaluate(() =>
      (document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent);
    expect(/10 MB or smaller/.test(alert), 'size rejection copy, got ' + alert);
    expect(backend.uploads.length === 0 && backend.inserts.length === 0, 'nothing ever left the browser');
  });

  await scenario('diamond add: a rejected insert deletes the fresh upload — no orphan files', { rlsDenyInsert: true }, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'add-diamond.html');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'cert.pdf', mimeType: 'application/pdf', buffer: PDF_MIN,
    });
    await fillDiamondMinimum(page, 'NGD-3002');
    await page.click('#dia-submit');
    await page.waitForFunction(() =>
      /not allowed to change diamonds/i.test((document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent));
    expect(await waitFor(() => backend.removals.length === 1), 'exactly one cleanup delete');
    expect(backend.removals[0] === backend.uploads[0], 'the just-uploaded certificate is removed again');
    expect(backend.events.indexOf('insert') < backend.events.indexOf('remove:' + backend.removals[0]),
      'cleanup only after the insert was rejected');
  });

  await scenario('diamond edit: replace uploads the new file, saves, and only THEN deletes the old owned file', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'edit-diamond.html?id=DIA-EDIT0001');
    await waitCertReady(page, 'dia');
    const before = await page.evaluate(() => ({
      url: document.querySelector('[name="certificate_url"]').value,
      currentShown: !document.getElementById('dia-certificate-current').hidden,
      viewHref: document.getElementById('dia-certificate-view').getAttribute('href'),
      viewTarget: document.getElementById('dia-certificate-view').getAttribute('target'),
      viewRel: document.getElementById('dia-certificate-view').getAttribute('rel'),
    }));
    expect(before.url === CERT_BASE + OLD_DIA_PATH && before.currentShown &&
      before.viewHref === before.url && before.viewTarget === '_blank' &&
      /noopener/.test(before.viewRel) && /noreferrer/.test(before.viewRel),
      'the current certificate offers a safe View link, got ' + before.viewHref);
    await page.setInputFiles('#dia-certificate_file', {
      name: 'newcert.png', mimeType: 'image/png', buffer: PNG_1PX,
    });
    await page.click('#dia-submit');
    await page.waitForURL('**/admin/diamonds.html?updated=NGD-9001', { timeout: 10000 });
    expect(backend.uploads.length === 1 &&
      /^diamonds\/DIA-EDIT0001\/[a-z0-9]{16}\.png$/.test(backend.uploads[0]),
      'replacement stored under the stone\'s folder, got ' + backend.uploads[0]);
    const patch = backend.patches[0];
    expect(patch && patch.changes.certificate_url === CERT_BASE + backend.uploads[0],
      'the row now points at the new certificate');
    expect(await waitFor(() => backend.removals.length === 1) && backend.removals[0] === OLD_DIA_PATH,
      'the OLD owned file is deleted, got ' + backend.removals.join(','));
    const order = [backend.events.indexOf('upload:' + backend.uploads[0]),
      backend.events.indexOf('patch'), backend.events.indexOf('remove:' + OLD_DIA_PATH)];
    expect(order[0] < order[1] && order[1] < order[2],
      'strict upload → save → delete-old ordering, got ' + backend.events.join(' | '));
  });

  await scenario('diamond edit: a failed save deletes the fresh upload and keeps the old certificate', { failPatch: true }, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'edit-diamond.html?id=DIA-EDIT0001');
    await waitCertReady(page, 'dia');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'newcert.pdf', mimeType: 'application/pdf', buffer: PDF_MIN,
    });
    await page.click('#dia-submit');
    await page.waitForFunction(() =>
      !!document.querySelector('#dia-alert .ngd-alert-danger'));
    expect(await waitFor(() => backend.removals.length === 1) &&
      backend.removals[0] === backend.uploads[0],
      'the fresh upload is removed again, got ' + backend.removals.join(','));
    expect(backend.removals.indexOf(OLD_DIA_PATH) === -1, 'the old certificate file survives the failure');
    expect(page.url().includes('edit-diamond.html'), 'no fake success redirect');
  });

  await scenario('diamond edit: Remove certificate clears the URL and retires the owned file after the save', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'edit-diamond.html?id=DIA-EDIT0001');
    await waitCertReady(page, 'dia');
    await page.click('#dia-certificate-remove');
    const cleared = await page.evaluate(() => ({
      url: document.querySelector('[name="certificate_url"]').value,
      currentHidden: document.getElementById('dia-certificate-current').hidden,
    }));
    expect(cleared.url === '' && cleared.currentHidden, 'Remove empties the URL and hides the row');
    await page.click('#dia-submit');
    await page.waitForURL('**/admin/diamonds.html?updated=NGD-9001', { timeout: 10000 });
    expect(backend.patches[0].changes.certificate_url === null, 'the row saves certificate_url = null');
    expect(await waitFor(() => backend.removals.length === 1) && backend.removals[0] === OLD_DIA_PATH,
      'the owned file is deleted after the successful save');
    expect(backend.events.indexOf('patch') < backend.events.indexOf('remove:' + OLD_DIA_PATH),
      'never before the database says yes');
    expect(backend.uploads.length === 0, 'nothing was uploaded');
  });

  await scenario('external lab links are NEVER deleted — replacing or uploading over one leaves it alone', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'edit-diamond.html?id=DIA-EDIT0002');
    await waitCertReady(page, 'dia');
    const before = await page.evaluate(() =>
      document.getElementById('dia-certificate-view').getAttribute('href'));
    expect(before === EXTERNAL_CERT, 'the external link previews as the current certificate');
    await page.setInputFiles('#dia-certificate_file', {
      name: 'owned.pdf', mimeType: 'application/pdf', buffer: PDF_MIN,
    });
    await page.click('#dia-submit');
    await page.waitForURL('**/admin/diamonds.html?updated=NGD-9002', { timeout: 10000 });
    expect(backend.patches[0].changes.certificate_url === CERT_BASE + backend.uploads[0],
      'the row switches to the uploaded certificate');
    await new Promise((r) => setTimeout(r, 400));
    expect(backend.removals.length === 0,
      'no DELETE ever fires for the external URL, got ' + backend.removals.join(','));
  });

  await scenario('jewellery add: lab + number save and the uploaded image fills certificate_url', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'add-jewellery.html');
    await page.fill('[name="sku"]', 'JW-3001');
    await page.fill('[name="product_name"]', 'Certified Halo Ring');
    await page.selectOption('[name="category"]', 'Rings');
    await page.selectOption('[name="certificate_lab"]', 'IGI');
    await page.fill('[name="certificate_number"]', 'NGDJ-3001');
    await page.setInputFiles('#jw-certificate_file', {
      name: 'jewellery scan.png', mimeType: 'image/png', buffer: PNG_1PX,
    });
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?added=JW-3001', { timeout: 10000 });
    expect(backend.uploads.length === 1 &&
      /^jewellery\/JEW-[A-Z0-9]{8}\/[a-z0-9]{16}\.png$/.test(backend.uploads[0]),
      'stored under jewellery/<public_id>/<random>.png, got ' + backend.uploads[0]);
    const rec = backend.inserts[0];
    expect(rec.certificate_lab === 'IGI' && rec.certificate_number === 'NGDJ-3001' &&
      rec.certificate_url === CERT_BASE + backend.uploads[0],
      'lab, number and the bucket URL all in the insert, got ' + JSON.stringify({
        lab: rec.certificate_lab, no: rec.certificate_number, url: rec.certificate_url,
      }));
    expect(backend.events.indexOf('upload:' + backend.uploads[0]) < backend.events.indexOf('insert'),
      'upload strictly precedes the insert');
  });

  await scenario('jewellery edit: lab + URL prefill, and replacing keeps the upload → save → delete-old ordering', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'edit-jewellery.html?id=JEW-EDIT0001');
    await waitCertReady(page, 'jw');
    const before = await page.evaluate(() => ({
      lab: document.querySelector('[name="certificate_lab"]').value,
      url: document.querySelector('[name="certificate_url"]').value,
      currentShown: !document.getElementById('jw-certificate-current').hidden,
      viewHref: document.getElementById('jw-certificate-view').getAttribute('href'),
    }));
    expect(before.lab === 'HRD' && before.url === CERT_BASE + OLD_JW_PATH &&
      before.currentShown && before.viewHref === before.url,
      'the stored certificate prefills, got ' + JSON.stringify(before));
    await page.setInputFiles('#jw-certificate_file', {
      name: 'replacement.pdf', mimeType: 'application/pdf', buffer: PDF_MIN,
    });
    await page.click('#jw-submit');
    await page.waitForURL('**/admin/jewellery.html?updated=JW-9001', { timeout: 10000 });
    expect(backend.uploads.length === 1 &&
      /^jewellery\/JEW-EDIT0001\/[a-z0-9]{16}\.pdf$/.test(backend.uploads[0]),
      'replacement lands in the piece\'s folder, got ' + backend.uploads[0]);
    expect(backend.patches[0].changes.certificate_url === CERT_BASE + backend.uploads[0] &&
      backend.patches[0].changes.certificate_lab === 'HRD',
      'the row keeps its lab and points at the new file');
    expect(await waitFor(() => backend.removals.length === 1) && backend.removals[0] === OLD_JW_PATH,
      'the old owned jewellery certificate is retired, got ' + backend.removals.join(','));
    const order = [backend.events.indexOf('upload:' + backend.uploads[0]),
      backend.events.indexOf('patch'), backend.events.indexOf('remove:' + OLD_JW_PATH)];
    expect(order[0] < order[1] && order[1] < order[2],
      'strict upload → save → delete-old ordering, got ' + backend.events.join(' | '));
  });

  await scenario('jewellery: a non-http(s) certificate URL is blocked client-side — nothing is sent', {}, async (page, backend) => {
    await login(page);
    await openAdmin(page, 'add-jewellery.html');
    await page.fill('[name="sku"]', 'JW-3002');
    await page.fill('[name="product_name"]', 'Bad URL Piece');
    await page.selectOption('[name="category"]', 'Rings');
    await page.evaluate(() => {
      const el = document.querySelector('[name="certificate_url"]');
      el.value = 'javascript:alert(1)';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#jw-submit');
    const state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-jewellery-form .is-invalid')].map((el) => el.name),
      alert: (document.querySelector('#jw-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.invalid.indexOf('certificate_url') !== -1, 'certificate_url flagged, got ' + state.invalid.join(','));
    expect(/highlighted fields/i.test(state.alert), 'validation summary shown');
    expect(backend.inserts.length === 0 && backend.uploads.length === 0, 'nothing was sent');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} certificate-upload scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
