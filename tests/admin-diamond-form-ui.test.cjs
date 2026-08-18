/* ============================================================
   Admin Add/Edit Diamond form tests (LIVE ADD, STEP 32).
   Against a PostgREST-style mocked Supabase backend: the add
   form really INSERTS into diamonds (unique DIA- public_id,
   created_by from the session, duplicate stock numbers rejected
   both by the pre-check and by the 23505 constraint path, RLS
   denials mapped to a safe message), then redirects to the
   inventory where the new stone appears in the re-read list.
   Also: client-side validation over the real column names,
   Save & Add Another, the preview-only image picker, the
   unsaved-changes warning, the edit page's honest demo prefill,
   a customer being turned away, and responsive columns.
   Run:  node tests/admin-diamond-form-ui.test.cjs
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

function seedDiamonds() {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const n = String(i + 1).padStart(2, '0');
    rows.push({
      id: 'uuid-dia-' + n, public_id: 'DIA-SEED00' + n,
      stock_number: 'NGD-10' + n, report_number: 'LG5824001' + n,
      shape: 'Round', carat: 1, color: 'D', clarity: 'IF', cut: 'Ideal',
      polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
      laboratory: 'IGI', certificate_number: 'LG5824001' + n, certificate_url: null,
      measurements: '6.4 × 6.4 × 4.0 mm', depth_percentage: 62, table_percentage: 57, ratio: 1,
      growth_method: 'CVD', location: 'Surat atelier', availability: 'In Stock',
      price_per_carat: 1200, total_price: 1800, currency: 'USD', price_visible: false,
      featured: false, active: true, internal_notes: null,
      created_by: USERS.admin.id,
      created_at: `2026-08-${n}T10:00:00Z`, updated_at: `2026-08-${n}T10:00:00Z`,
    });
  }
  return rows;
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts = {}) {
  const user = USERS[opts.role || 'admin'];
  const diamonds = seedDiamonds();
  const inserts = [];
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
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      const stockEq = url.searchParams.get('stock_number');
      if (stockEq && stockEq.startsWith('eq.')) {
        rows = rows.filter((d) => d.stock_number === stockEq.slice(3));
        if (opts.precheckMiss) rows = [];
      }
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const rec = Array.isArray(body) ? body[0] : body;
      inserts.push(rec);
      if (opts.rlsDenyInsert) {
        return json(401, { code: '42501', message: 'new row violates row-level security policy for table "diamonds"', details: null, hint: null });
      }
      if (diamonds.some((d) => d.stock_number === rec.stock_number)) {
        return json(409, { code: '23505', message: 'duplicate key value violates unique constraint "diamonds_stock_number_key"', details: 'Key (stock_number) already exists.', hint: null });
      }
      newSeq++;
      diamonds.push({
        id: 'uuid-new-' + newSeq,
        created_at: '2026-08-31T12:00:0' + newSeq + 'Z',
        updated_at: '2026-08-31T12:00:0' + newSeq + 'Z',
        ...rec,
      });
      return route.fulfill({ status: 201, headers: CORS, body: '' });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds, inserts };
}

const FIELD_NAMES = ['stock_number', 'report_number', 'shape', 'carat', 'color', 'clarity',
  'cut', 'polish', 'symmetry', 'fluorescence', 'laboratory', 'certificate_number',
  'certificate_url', 'measurements', 'depth_percentage', 'table_percentage', 'ratio',
  'growth_method', 'location', 'availability', 'price_per_carat', 'total_price', 'currency',
  'price_visible', 'featured', 'active', 'internal_notes'];

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
  await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function openEdit(page, id) {
  await login(page);
  await page.goto(SITE + '/admin/edit-diamond.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function fillMinimumValid(page, stock) {
  await page.fill('[name="stock_number"]', stock || 'NGD-2001');
  await page.selectOption('[name="shape"]', 'Round');
  await page.fill('[name="carat"]', '1.25');
  await page.selectOption('[name="color"]', 'D');
  await page.selectOption('[name="clarity"]', 'VS1');
  await page.selectOption('[name="cut"]', 'Ideal');
  await page.selectOption('[name="laboratory"]', 'IGI');
  await page.selectOption('[name="availability"]', 'In Stock');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('add: eight sections, all 27 real columns, live chip, buttons', {}, async (page) => {
    await openAdd(page);
    const state = await page.evaluate((names) => ({
      title: document.querySelector('h1').textContent.trim(),
      sections: [...document.querySelectorAll('[data-form-section]')]
        .map((s) => s.getAttribute('data-form-section')),
      fields: names.filter((n) => !document.querySelector('[name="' + n + '"]')),
      stars: document.querySelectorAll('.ngd-req-star').length,
      priceVisibleType: (document.querySelector('[name="price_visible"]') || {}).type,
      chip: [...document.querySelectorAll('.ngd-demo-chip')].map((c) => c.textContent.trim()).join('|'),
      buttons: {
        save: (document.getElementById('dia-submit') || {}).textContent?.trim(),
        another: !!document.getElementById('dia-save-another'),
        cancel: document.getElementById('dia-cancel').getAttribute('href'),
        archive: !!document.getElementById('dia-archive'),
      },
      sticky: getComputedStyle(document.querySelector('.ngd-form-actions')).position === 'sticky',
    }), FIELD_NAMES);
    expect(state.title === 'Add Diamond', 'title, got ' + state.title);
    expect(JSON.stringify(state.sections) === JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8']),
      'eight sections in order');
    expect(state.fields.length === 0, 'all 27 column-named fields present, missing: ' + state.fields.join(','));
    expect(state.stars === 3, 'three required indicators, got ' + state.stars);
    expect(state.priceVisibleType === 'checkbox', 'price_visible is a boolean checkbox');
    expect(/saves to Supabase/i.test(state.chip), 'live chip, got ' + state.chip);
    expect(state.buttons.save === 'Save Diamond' && state.buttons.another &&
      state.buttons.cancel === 'diamonds.html' && !state.buttons.archive, 'add-page buttons');
    expect(state.sticky, 'sticky save actions');
  });

  await scenario('validation: required fields, number ranges, URL check — nothing sent', {}, async (page, backend) => {
    await openAdd(page);
    await page.click('#dia-submit');
    let state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-diamond-form .is-invalid')].map((el) => el.name),
      alert: (document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(JSON.stringify(state.invalid) === JSON.stringify(['stock_number', 'shape', 'carat']),
      'the three required fields are flagged, got ' + state.invalid.join(','));
    expect(/highlighted fields/i.test(state.alert), 'error summary shown');
    await fillMinimumValid(page);
    await page.fill('[name="depth_percentage"]', '150');
    await page.fill('[name="certificate_url"]', 'not-a-url');
    await page.click('#dia-submit');
    state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-diamond-form .is-invalid')].map((el) => el.name).sort(),
    }));
    expect(JSON.stringify(state.invalid) === JSON.stringify(['certificate_url', 'depth_percentage']),
      'range + URL validation, got ' + state.invalid.join(','));
    expect(backend.inserts.length === 0, 'nothing was sent while invalid');
  });

  await scenario('live insert: DIA- public_id + created_by, success, redirect, appears in the list', {}, async (page, backend) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (d) => { dialogSeen = d.type(); d.accept(); });
    await fillMinimumValid(page, 'NGD-2001');
    await page.fill('[name="price_per_carat"]', '1400');
    await page.click('#dia-submit');
    await page.waitForURL('**/admin/diamonds.html?added=NGD-2001', { timeout: 10000 });
    await page.waitForFunction(() =>
      document.querySelectorAll('#adm-table-body tr').length > 0, null, { timeout: 10000 });
    expect(backend.inserts.length === 1, 'exactly one insert sent');
    const rec = backend.inserts[0];
    expect(/^DIA-[A-HJ-NP-Z2-9]{8}$/.test(rec.public_id),
      'generated public_id like DIA-XXXXXXXX, got ' + rec.public_id);
    expect(rec.created_by === USERS.admin.id, 'created_by is the signed-in admin');
    expect(rec.stock_number === 'NGD-2001' && rec.color === 'D' && rec.carat === 1.25 &&
      rec.price_per_carat === 1400 && rec.price_visible === false && rec.active === true,
      'real column payload, got ' + JSON.stringify(rec).slice(0, 120));
    expect(dialogSeen === null, 'no unsaved-changes warning after a successful save');
    const state = await page.evaluate(() => ({
      row: !!document.querySelector('[data-adm-row="NGD-2001"]'),
      toast: (document.querySelector('#adm-toast .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.row, 'the new stone appears in the re-read live list');
    expect(/NGD-2001 was added to the inventory/.test(state.toast), 'arrival toast confirms it');
  });

  await scenario('duplicate stock number rejected by the pre-check, nothing inserted', {}, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'NGD-1001');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
      stockInvalid: document.querySelector('[name="stock_number"]').classList.contains('is-invalid'),
      url: location.pathname,
    }));
    expect(/NGD-1001 already exists/i.test(state.alert) && /unique/i.test(state.alert),
      'friendly duplicate message, got: ' + state.alert);
    expect(state.stockInvalid, 'stock field flagged');
    expect(/add-diamond\.html$/.test(state.url), 'stays on the form');
    expect(backend.inserts.length === 0, 'insert never sent — caught by the pre-check');
  });

  await scenario('duplicate at insert time (23505 race) maps to the same safe message', { precheckMiss: true }, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'NGD-1001');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
      url: location.pathname,
    }));
    expect(backend.inserts.length === 1, 'insert reached the database constraint');
    expect(/already exists|must be unique/i.test(state.alert) && !/23505|constraint/i.test(state.alert),
      'unique-violation mapped safely, got: ' + state.alert);
    expect(/add-diamond\.html$/.test(state.url), 'stays on the form');
  });

  await scenario('RLS denial maps to a safe admin-only message', { rlsDenyInsert: true }, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page, 'NGD-2009');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
    }));
    expect(/only an active admin/i.test(state.alert) && /Row Level Security/i.test(state.alert),
      'RLS denial explained safely, got: ' + state.alert);
    expect(!/42501|violates row-level/i.test(state.alert), 'no raw database internals');
  });

  await scenario('save & add another: real insert, cleared form, distinct public_ids', {}, async (page, backend) => {
    await openAdd(page);
    await fillMinimumValid(page, 'NGD-2002');
    await page.click('#dia-save-another');
    await page.waitForSelector('#dia-alert .ngd-alert-success', { timeout: 8000 });
    let state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
      stock: document.querySelector('[name="stock_number"]').value,
    }));
    expect(/NGD-2002 was added to the inventory/.test(state.alert) && /cleared/i.test(state.alert),
      'true success notice, got: ' + state.alert);
    expect(state.stock === '', 'form cleared for the next stone');
    await fillMinimumValid(page, 'NGD-2003');
    await page.click('#dia-save-another');
    await page.waitForFunction(() =>
      /NGD-2003/.test((document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent),
      null, { timeout: 8000 });
    expect(backend.inserts.length === 2, 'two inserts sent');
    expect(backend.inserts[0].public_id !== backend.inserts[1].public_id,
      'each stone gets its own public_id');
  });

  await scenario('image picker still previews locally only (no upload)', {}, async (page) => {
    await openAdd(page);
    await page.setInputFiles('#dia-file', {
      name: 'stone.png', mimeType: 'image/png', buffer: PNG_1PX,
    });
    let state = await page.evaluate(() => ({
      previewShown: !document.getElementById('dia-preview').hidden,
      src: document.getElementById('dia-preview-img').getAttribute('src') || '',
    }));
    expect(state.previewShown && state.src.startsWith('data:image/png'), 'local data-URL preview');
    await page.setInputFiles('#dia-file', {
      name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello'),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('dia-image-error').textContent,
    }));
    expect(/isn.t supported/i.test(state.error), 'wrong type rejected inline');
  });

  await scenario('unsaved changes: dirty form warns before leaving; clean form does not', {}, async (page) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (dialog) => {
      dialogSeen = dialog.type();
      dialog.accept();
    });
    await page.fill('[name="stock_number"]', 'NGD-2004');
    await page.click('.ngd-dash-nav a[data-admin-route="dashboard"]');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    expect(dialogSeen === 'beforeunload', 'beforeunload warning fired for a dirty form');
    dialogSeen = null;
    await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.click('#dia-cancel');
    await page.waitForURL('**/admin/diamonds.html', { timeout: 8000 });
    expect(dialogSeen === null, 'no warning when nothing changed');
  });

  await scenario('edit: honest demo prefill on the real column names, no fake update', {}, async (page) => {
    await openEdit(page, 'NGD-1007');
    await page.waitForFunction(() =>
      (document.querySelector('[name="stock_number"]') || {}).value === 'NGD-1007');
    const state = await page.evaluate(() => {
      const rec = window.NGD_DEMO_DIAMONDS.find((d) => d.id === 'NGD-1007');
      const v = (n) => document.querySelector('[name="' + n + '"]').value;
      return {
        title: document.querySelector('h1').textContent.trim(),
        chip: [...document.querySelectorAll('.ngd-demo-chip')].map((c) => c.textContent.trim()).join('|'),
        mismatches: [
          ['color', v('color') === rec.colour],
          ['depth_percentage', parseFloat(v('depth_percentage')) === rec.depthPct],
          ['table_percentage', parseFloat(v('table_percentage')) === rec.tablePct],
          ['laboratory', v('laboratory') === rec.lab],
          ['growth_method', v('growth_method') === rec.growth],
        ].filter((p) => !p[1]).map((p) => p[0]),
        buttons: {
          update: document.getElementById('dia-submit').textContent.trim(),
          archive: !!document.getElementById('dia-archive'),
          another: !!document.getElementById('dia-save-another'),
        },
      };
    });
    expect(state.title === 'Edit Diamond', 'edit page reached');
    expect(/editing arrives next/i.test(state.chip), 'honest edit chip, got ' + state.chip);
    expect(state.mismatches.length === 0, 'demo prefill mapped onto real columns, wrong: ' + state.mismatches.join(','));
    expect(state.buttons.update === 'Update Diamond' && state.buttons.archive && !state.buttons.another,
      'edit-page buttons');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert', { timeout: 5000 });
    const alert = await page.evaluate(() =>
      document.querySelector('#dia-alert .ngd-alert').textContent.replace(/\s+/g, ' '));
    expect(/updating is not wired yet/i.test(alert) && /nothing in the database was changed/i.test(alert),
      'honest no-update notice, got: ' + alert);
  });

  await scenario('customer cannot open the add form — sent to their own dashboard', { role: 'customer' }, async (page) => {
    await login(page, 'customer');
    await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('responsive: 2-col rows at 1440, single column at 390, sticky bar reachable', { viewport: { width: 1440, height: 900 } }, async (page) => {
    await openAdd(page);
    let o = await page.evaluate(() => {
      const stock = document.querySelector('[name="stock_number"]').getBoundingClientRect();
      const shape = document.querySelector('[name="shape"]').getBoundingClientRect();
      return {
        sideBySide: shape.left > stock.right,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(o.sideBySide, 'two-column rows on desktop');
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'diamond-form-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => {
      const stock = document.querySelector('[name="stock_number"]').getBoundingClientRect();
      const shape = document.querySelector('[name="shape"]').getBoundingClientRect();
      const bar = document.querySelector('.ngd-form-actions').getBoundingClientRect();
      return {
        stacked: shape.top > stock.bottom,
        fullWidth: stock.width > 250,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
        barVisible: bar.top < window.innerHeight,
      };
    });
    expect(o.stacked && o.fullWidth && o.barVisible, 'single-column mobile with reachable bar');
    expect(o.bodyW <= o.clientW + 1, `390 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'diamond-form-mobile.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} diamond-form scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
