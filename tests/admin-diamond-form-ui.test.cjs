/* ============================================================
   Admin Add/Edit Diamond form tests (STEP 25).
   Logs in as the mocked admin and verifies both form pages:
   the eight sections with all 27 Supabase-ready fields and
   required indicators, inline + number validation, the honest
   no-save submits (payload exposed, nothing "saved"), Save &
   Add Another, the image picker (type/size validation, preview,
   replace/remove — no upload), the unsaved-changes warning,
   edit prefill from the demo record, the UI-only Archive, the
   not-found state and responsive columns at 1440/768/390.
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

const FIELD_NAMES = ['stock_number', 'report_number', 'shape', 'carat', 'colour', 'clarity',
  'cut', 'polish', 'symmetry', 'fluorescence', 'laboratory', 'certificate_number',
  'certificate_url', 'measurements', 'depth_pct', 'table_pct', 'ratio', 'growth_method',
  'location', 'availability', 'price_per_carat', 'total_price', 'currency',
  'price_visibility', 'featured', 'active', 'internal_notes'];

/* a real 1×1 PNG for upload-preview tests */
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

async function login(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
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

async function fillMinimumValid(page) {
  await page.fill('[name="stock_number"]', 'NGD-2001');
  await page.selectOption('[name="shape"]', 'Round');
  await page.fill('[name="carat"]', '1.25');
  await page.selectOption('[name="colour"]', 'D');
  await page.selectOption('[name="clarity"]', 'VS1');
  await page.selectOption('[name="cut"]', 'Ideal');
  await page.selectOption('[name="laboratory"]', 'IGI');
  await page.selectOption('[name="availability"]', 'In Stock');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('add: eight sections, all 27 fields, required stars, buttons, honest chip', {}, async (page) => {
    await openAdd(page);
    const state = await page.evaluate((names) => ({
      title: document.querySelector('h1').textContent.trim(),
      sections: [...document.querySelectorAll('[data-form-section]')]
        .map((s) => s.getAttribute('data-form-section')),
      sectionTitles: [...document.querySelectorAll('.ngd-form-sec-title')]
        .map((t) => t.textContent.replace(/^\s*\d+\s*/, '').trim()),
      fields: names.filter((n) => !document.querySelector('[name="' + n + '"]')),
      stars: document.querySelectorAll('.ngd-req-star').length,
      feedbacks: document.querySelectorAll('#ngd-diamond-form .invalid-feedback').length,
      buttons: {
        save: (document.getElementById('dia-submit') || {}).textContent?.trim(),
        another: !!document.getElementById('dia-save-another'),
        cancel: document.getElementById('dia-cancel').getAttribute('href'),
        archive: !!document.getElementById('dia-archive'),
      },
      chip: [...document.querySelectorAll('.ngd-demo-chip')].some((c) => /nothing saves yet/i.test(c.textContent)),
      sticky: getComputedStyle(document.querySelector('.ngd-form-actions')).position === 'sticky',
    }), FIELD_NAMES);
    expect(state.title === 'Add Diamond', 'title, got ' + state.title);
    expect(JSON.stringify(state.sections) === JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8']),
      'eight sections in order, got ' + state.sections.join(','));
    expect(state.sectionTitles.join('|') ===
      'Basic Information|Grading Details|Certificate|Measurements|Pricing|Availability|Image|Internal / Admin Settings',
      'section titles per spec, got ' + state.sectionTitles.join('|'));
    expect(state.fields.length === 0, 'all 27 fields present, missing: ' + state.fields.join(','));
    expect(state.stars === 8, 'eight required indicators, got ' + state.stars);
    expect(state.feedbacks >= 20, 'inline error slots prepared, got ' + state.feedbacks);
    expect(state.buttons.save === 'Save Diamond' && state.buttons.another &&
      state.buttons.cancel === 'diamonds.html' && !state.buttons.archive,
      'add-page buttons per spec');
    expect(state.chip, 'honest "nothing saves yet" chip');
    expect(state.sticky, 'sticky save actions');
  });

  await scenario('validation: empty submit flags the 8 required fields; number ranges enforced', {}, async (page) => {
    await openAdd(page);
    await page.click('#dia-submit');
    let state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-diamond-form .is-invalid')].map((el) => el.name),
      alert: (document.querySelector('#dia-alert .ngd-alert') || { textContent: '' }).textContent,
      payload: document.getElementById('ngd-diamond-form').getAttribute('data-ngd-payload'),
    }));
    expect(state.invalid.length === 8, '8 required fields flagged, got ' + state.invalid.join(','));
    expect(/highlighted fields/i.test(state.alert), 'error summary shown');
    expect(!state.payload, 'no payload built for an invalid form');
    await fillMinimumValid(page);
    await page.fill('[name="depth_pct"]', '150');
    await page.fill('[name="ratio"]', '9');
    await page.click('#dia-submit');
    state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-diamond-form .is-invalid')].map((el) => el.name),
    }));
    expect(JSON.stringify(state.invalid.sort()) === JSON.stringify(['depth_pct', 'ratio']),
      'out-of-range numbers flagged, got ' + state.invalid.join(','));
    await page.fill('[name="depth_pct"]', '62.4');
    const cleared = await page.evaluate(() =>
      !document.querySelector('[name="depth_pct"]').classList.contains('is-invalid'));
    expect(cleared, 'typing clears the flag');
  });

  await scenario('honest save: payload exposed, nothing claimed saved, form stays', {}, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page);
    await page.fill('[name="price_per_carat"]', '1400');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent,
      info: !!document.querySelector('#dia-alert .ngd-alert-info'),
      payload: JSON.parse(document.getElementById('ngd-diamond-form').getAttribute('data-ngd-payload')),
      url: location.pathname,
      kept: document.querySelector('[name="stock_number"]').value,
    }));
    expect(state.info && /nothing was\s+saved/i.test(state.alert.replace(/\s+/g, ' ')),
      'honest no-save message, got: ' + state.alert);
    expect(!/success|saved!|added to/i.test(state.alert), 'no fake success wording');
    expect(state.payload.stock_number === 'NGD-2001' && state.payload.carat === 1.25 &&
      state.payload.price_per_carat === 1400 && state.payload.active === true,
      'snake_case payload ready for Supabase');
    expect(/add-diamond\.html$/.test(state.url) && state.kept === 'NGD-2001',
      'stays on the page with values intact');
  });

  await scenario('save & add another: honest notice then a cleared form', {}, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page);
    await page.click('#dia-save-another');
    await page.waitForSelector('#dia-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      stock: document.querySelector('[name="stock_number"]').value,
      shape: document.querySelector('[name="shape"]').value,
    }));
    expect(/nothing was saved/i.test(state.alert) && /cleared/i.test(state.alert),
      'honest add-another notice, got: ' + state.alert);
    expect(state.stock === '' && state.shape === '', 'form cleared for the next entry');
  });

  await scenario('image picker: preview, replace/remove, type and size validation, no upload', {}, async (page) => {
    await openAdd(page);
    await page.setInputFiles('#dia-file', {
      name: 'stone.png', mimeType: 'image/png', buffer: PNG_1PX,
    });
    let state = await page.evaluate(() => ({
      previewShown: !document.getElementById('dia-preview').hidden,
      dropHidden: document.getElementById('dia-drop').hidden,
      src: document.getElementById('dia-preview-img').getAttribute('src') || '',
      label: document.getElementById('dia-preview-name').textContent,
      replace: !!document.getElementById('dia-replace'),
    }));
    expect(state.previewShown && state.dropHidden, 'preview replaces the drop zone');
    expect(state.src.startsWith('data:image/png'), 'local data-URL preview only');
    expect(/stone\.png/.test(state.label), 'file name shown');
    expect(state.replace, 'replace control present');
    await page.click('#dia-remove');
    state = await page.evaluate(() => ({
      previewShown: !document.getElementById('dia-preview').hidden,
      dropShown: !document.getElementById('dia-drop').hidden,
    }));
    expect(!state.previewShown && state.dropShown, 'remove returns to the drop zone');
    await page.setInputFiles('#dia-file', {
      name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello'),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('dia-image-error').textContent,
      previewShown: !document.getElementById('dia-preview').hidden,
    }));
    expect(/isn.t supported/i.test(state.error) && !state.previewShown,
      'wrong type rejected inline, got: ' + state.error);
    await page.setInputFiles('#dia-file', {
      name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('dia-image-error').textContent,
      previewShown: !document.getElementById('dia-preview').hidden,
    }));
    expect(/larger than 10/i.test(state.error) && !state.previewShown,
      'oversize rejected inline, got: ' + state.error);
  });

  await scenario('unsaved changes: dirty form warns before leaving; clean form does not', {}, async (page) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (dialog) => {
      dialogSeen = dialog.type();
      dialog.accept();
    });
    await page.fill('[name="stock_number"]', 'NGD-2002');
    await page.click('.ngd-dash-nav a[data-admin-route="dashboard"]');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    expect(dialogSeen === 'beforeunload', 'beforeunload warning fired for a dirty form');
    /* clean form: straight navigation, no dialog */
    dialogSeen = null;
    await page.goto(SITE + '/admin/add-diamond.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.click('#dia-cancel');
    await page.waitForURL('**/admin/diamonds.html', { timeout: 8000 });
    expect(dialogSeen === null, 'no warning when nothing changed');
  });

  await scenario('edit: prefilled from the demo record with current artwork and edit buttons', {}, async (page) => {
    await openEdit(page, 'NGD-1007');
    await page.waitForFunction(() =>
      (document.querySelector('[name="stock_number"]') || {}).value === 'NGD-1007');
    const state = await page.evaluate(() => ({
      title: document.querySelector('h1').textContent.trim(),
      editingId: document.getElementById('dia-editing-id').textContent.trim(),
      values: {
        shape: document.querySelector('[name="shape"]').value,
        carat: document.querySelector('[name="carat"]').value,
        colour: document.querySelector('[name="colour"]').value,
        clarity: document.querySelector('[name="clarity"]').value,
        laboratory: document.querySelector('[name="laboratory"]').value,
        report: document.querySelector('[name="report_number"]').value,
        measurements: document.querySelector('[name="measurements"]').value,
        depth: document.querySelector('[name="depth_pct"]').value,
        currency: document.querySelector('[name="currency"]').value,
      },
      featured: document.querySelector('[name="featured"]').checked,
      art: !!document.querySelector('#dia-current-art svg'),
      buttons: {
        update: document.getElementById('dia-submit').textContent.trim(),
        archive: !!document.getElementById('dia-archive'),
        another: !!document.getElementById('dia-save-another'),
      },
    }));
    expect(state.title === 'Edit Diamond' && state.editingId === 'NGD-1007', 'editing header');
    expect(state.values.shape === 'Round' && state.values.carat === '0.72' &&
      state.values.colour === 'D' && state.values.clarity === 'IF' &&
      state.values.laboratory === 'IGI', 'core fields prefilled from the record');
    expect(/^LG\d+$/.test(state.values.report) && /mm$/.test(state.values.measurements) &&
      state.values.depth !== '' && state.values.currency === 'USD',
      'derived + demo commercial fields prefilled');
    expect(state.art, 'current artwork shown in the image section');
    expect(state.buttons.update === 'Update Diamond' && state.buttons.archive && !state.buttons.another,
      'edit-page buttons per spec');
  });

  await scenario('edit: honest update payload and the UI-only archive notice', {}, async (page) => {
    await openEdit(page, 'NGD-1007');
    await page.waitForFunction(() =>
      (document.querySelector('[name="stock_number"]') || {}).value === 'NGD-1007');
    await page.fill('[name="carat"]', '0.75');
    await page.click('#dia-submit');
    await page.waitForSelector('#dia-alert .ngd-alert', { timeout: 5000 });
    let state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      payload: JSON.parse(document.getElementById('ngd-diamond-form').getAttribute('data-ngd-payload')),
    }));
    expect(/update payload is ready/i.test(state.alert) && /nothing was saved/i.test(state.alert),
      'honest update notice, got: ' + state.alert);
    expect(state.payload.carat === 0.75 && state.payload.stock_number === 'NGD-1007',
      'update payload carries the edit');
    await page.click('#dia-archive');
    state = await page.evaluate(() => ({
      alert: document.querySelector('#dia-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      url: location.pathname,
    }));
    expect(/Archive is UI-only/i.test(state.alert) && /nothing was archived or deleted/i.test(state.alert),
      'archive is honestly UI-only, got: ' + state.alert);
    expect(/edit-diamond\.html$/.test(state.url), 'archive does not navigate or remove');
  });

  await scenario('edit: unknown id shows the not-found state', {}, async (page) => {
    await openEdit(page, 'NGD-9999');
    await page.waitForFunction(() => !document.getElementById('dia-notfound').hidden);
    const state = await page.evaluate(() => ({
      formHidden: document.getElementById('dia-form-wrap').hidden,
      id: document.getElementById('dia-notfound-id').textContent.trim(),
      back: !!document.querySelector('#dia-notfound a[href="diamonds.html"]'),
    }));
    expect(state.formHidden, 'form hidden for an unknown stone');
    expect(state.id === 'NGD-9999' && state.back, 'not-found names the id and offers the way back');
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
    expect(o.stacked && o.fullWidth, 'single-column full-width fields on mobile');
    expect(o.barVisible, 'sticky action bar within reach');
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
