/* ============================================================
   Admin Add/Edit Jewellery form tests (STEP 27).
   Logs in as the mocked admin and verifies both form pages:
   the nine sections with all 23 Supabase-ready fields and
   required indicators, inline + number validation, the honest
   no-save submits (payload exposed with the ordered images
   array, nothing "saved"), Save & Add Another, the multi-image
   gallery (type/size validation, previews, primary badge,
   set-primary, reorder, remove — no upload), the
   unsaved-changes warning, edit prefill from the demo record
   with its demo gallery, the UI-only Archive, the not-found
   state and responsive columns at 1440/768/390.
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

const FIELD_NAMES = ['sku', 'product_name', 'size', 'short_description', 'full_description',
  'category', 'subcategory', 'metal', 'metal_karat', 'metal_colour', 'gross_weight',
  'diamond_weight', 'diamond_pieces', 'diamond_quality', 'diamond_shape',
  'certificate_number', 'price', 'currency', 'price_visibility', 'availability',
  'featured', 'active', 'internal_notes'];

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
  await page.goto(SITE + '/admin/add-jewellery.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function openEdit(page, id) {
  await login(page);
  await page.goto(SITE + '/admin/edit-jewellery.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
}

async function fillMinimumValid(page) {
  await page.fill('[name="sku"]', 'JW-2001');
  await page.fill('[name="product_name"]', 'Test Aurora Ring');
  await page.selectOption('[name="category"]', 'Rings');
  await page.fill('[name="short_description"]', 'A test piece for the payload preview.');
  await page.selectOption('[name="metal"]', 'Gold');
  await page.selectOption('[name="availability"]', 'In Stock');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('add: nine sections, all 23 fields, required stars, buttons, honest chip', {}, async (page) => {
    await openAdd(page);
    const state = await page.evaluate((names) => ({
      title: document.querySelector('h1').textContent.trim(),
      sections: [...document.querySelectorAll('[data-form-section]')]
        .map((s) => s.getAttribute('data-form-section')),
      sectionTitles: [...document.querySelectorAll('.ngd-form-sec-title')]
        .map((t) => t.textContent.replace(/^\s*\d+\s*/, '').trim()),
      fields: names.filter((n) => !document.querySelector('[name="' + n + '"]')),
      stars: document.querySelectorAll('.ngd-req-star').length,
      categories: [...document.querySelectorAll('[name="category"] option')].map((o) => o.value).filter(Boolean),
      multiple: document.getElementById('jw-file').hasAttribute('multiple'),
      drop: !!document.getElementById('jw-drop'),
      galleryHidden: document.getElementById('jw-gallery-wrap').hidden,
      buttons: {
        save: (document.getElementById('jw-submit') || {}).textContent?.trim(),
        another: !!document.getElementById('jw-save-another'),
        cancel: document.getElementById('jw-cancel').getAttribute('href'),
        archive: !!document.getElementById('jw-archive'),
      },
      chip: [...document.querySelectorAll('.ngd-demo-chip')].some((c) => /nothing saves yet/i.test(c.textContent)),
      sticky: getComputedStyle(document.querySelector('.ngd-form-actions')).position === 'sticky',
    }), FIELD_NAMES);
    expect(state.title === 'Add Jewellery', 'title, got ' + state.title);
    expect(JSON.stringify(state.sections) === JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9']),
      'nine sections in order, got ' + state.sections.join(','));
    expect(state.sectionTitles.join('|') ===
      'Basic Information|Category|Metal Details|Diamond Details|Certificate|Pricing|Availability|Product Images|Internal / Admin Settings',
      'section titles per spec, got ' + state.sectionTitles.join('|'));
    expect(state.fields.length === 0, 'all 23 fields present, missing: ' + state.fields.join(','));
    expect(state.stars === 6, 'six required indicators, got ' + state.stars);
    expect(JSON.stringify(state.categories) === JSON.stringify(
      ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles', 'Other']),
      'seven categories incl. Other, got ' + state.categories.join(','));
    expect(state.multiple && state.drop && state.galleryHidden,
      'multi-file input with drop zone; gallery hidden while empty');
    expect(state.buttons.save === 'Save Jewellery' && state.buttons.another &&
      state.buttons.cancel === 'jewellery.html' && !state.buttons.archive,
      'add-page buttons per spec');
    expect(state.chip, 'honest "nothing saves yet" chip');
    expect(state.sticky, 'sticky save actions');
  });

  await scenario('validation: empty submit flags the 6 required fields; number ranges enforced', {}, async (page) => {
    await openAdd(page);
    await page.click('#jw-submit');
    let state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-jewellery-form .is-invalid')].map((el) => el.name),
      alert: (document.querySelector('#jw-alert .ngd-alert') || { textContent: '' }).textContent,
      payload: document.getElementById('ngd-jewellery-form').getAttribute('data-ngd-payload'),
    }));
    expect(state.invalid.length === 6, '6 required fields flagged, got ' + state.invalid.join(','));
    expect(/highlighted fields/i.test(state.alert), 'error summary shown');
    expect(!state.payload, 'no payload built for an invalid form');
    await fillMinimumValid(page);
    await page.fill('[name="gross_weight"]', '600');
    await page.fill('[name="diamond_weight"]', '60');
    await page.click('#jw-submit');
    state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-jewellery-form .is-invalid')].map((el) => el.name),
    }));
    expect(JSON.stringify(state.invalid.sort()) === JSON.stringify(['diamond_weight', 'gross_weight']),
      'out-of-range numbers flagged, got ' + state.invalid.join(','));
    await page.fill('[name="gross_weight"]', '4.50');
    const cleared = await page.evaluate(() =>
      !document.querySelector('[name="gross_weight"]').classList.contains('is-invalid'));
    expect(cleared, 'typing clears the flag');
  });

  await scenario('honest save: payload exposed with empty images array, nothing claimed saved', {}, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page);
    await page.fill('[name="price"]', '5200');
    await page.fill('[name="diamond_pieces"]', '25');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent,
      info: !!document.querySelector('#jw-alert .ngd-alert-info'),
      payload: JSON.parse(document.getElementById('ngd-jewellery-form').getAttribute('data-ngd-payload')),
      url: location.pathname,
      kept: document.querySelector('[name="sku"]').value,
    }));
    expect(state.info && /nothing was\s+saved/i.test(state.alert.replace(/\s+/g, ' ')),
      'honest no-save message, got: ' + state.alert);
    expect(!/success|saved!|added to/i.test(state.alert), 'no fake success wording');
    expect(state.payload.sku === 'JW-2001' && state.payload.category === 'Rings' &&
      state.payload.price === 5200 && state.payload.diamond_pieces === 25 &&
      state.payload.active === true && Array.isArray(state.payload.images) &&
      state.payload.images.length === 0,
      'snake_case payload with images array ready for Supabase');
    expect(/add-jewellery\.html$/.test(state.url) && state.kept === 'JW-2001',
      'stays on the page with values intact');
  });

  await scenario('save & add another: honest notice then a cleared form', {}, async (page) => {
    await openAdd(page);
    await fillMinimumValid(page);
    await page.setInputFiles('#jw-file', {
      name: 'piece.png', mimeType: 'image/png', buffer: PNG_1PX,
    });
    await page.waitForFunction(() =>
      document.querySelectorAll('#jw-gallery .ngd-img-tile').length === 1);
    await page.click('#jw-save-another');
    await page.waitForSelector('#jw-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      sku: document.querySelector('[name="sku"]').value,
      category: document.querySelector('[name="category"]').value,
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
      galleryHidden: document.getElementById('jw-gallery-wrap').hidden,
    }));
    expect(/nothing was saved/i.test(state.alert) && /cleared/i.test(state.alert),
      'honest add-another notice, got: ' + state.alert);
    expect(state.sku === '' && state.category === '', 'form cleared for the next entry');
    expect(state.tiles === 0 && state.galleryHidden, 'gallery cleared with the form');
  });

  await scenario('multi-image gallery: previews, primary badge, set-primary, reorder, remove, validation', {}, async (page) => {
    await openAdd(page);
    await page.setInputFiles('#jw-file', [
      { name: 'a.png', mimeType: 'image/png', buffer: PNG_1PX },
      { name: 'b.png', mimeType: 'image/png', buffer: PNG_1PX },
    ]);
    await page.waitForFunction(() => {
      const imgs = [...document.querySelectorAll('#jw-gallery .ngd-img-tile-frame img')];
      return imgs.length === 2 && imgs.every((i) => (i.getAttribute('src') || '').startsWith('data:image/png'));
    });
    let state = await page.evaluate(() => ({
      order: [...document.querySelectorAll('#jw-gallery .ngd-img-tile-name')].map((n) => n.textContent.split(' · ')[0]),
      primaryBadges: [...document.querySelectorAll('#jw-gallery .ngd-img-tile')].map((t) =>
        !!t.querySelector('.ngd-status-chip')),
      firstPrimary: document.querySelector('#jw-gallery .ngd-img-tile').classList.contains('is-primary'),
    }));
    expect(JSON.stringify(state.order) === JSON.stringify(['a.png', 'b.png']), 'both previews in order');
    expect(state.firstPrimary && state.primaryBadges[0] && !state.primaryBadges[1],
      'first image is primary by default');
    /* set b as primary, then move it first */
    await page.click('.ngd-img-tile[data-img-uid="2"] [data-img-act="primary"]');
    state = await page.evaluate(() => ({
      badges: [...document.querySelectorAll('#jw-gallery .ngd-img-tile')].map((t) => !!t.querySelector('.ngd-status-chip')),
    }));
    expect(!state.badges[0] && state.badges[1], 'Set as Primary moves the badge');
    await page.click('.ngd-img-tile[data-img-uid="2"] [data-img-act="left"]');
    state = await page.evaluate(() => ({
      order: [...document.querySelectorAll('#jw-gallery .ngd-img-tile-name')].map((n) => n.textContent.split(' · ')[0]),
      firstPrimary: document.querySelector('#jw-gallery .ngd-img-tile').classList.contains('is-primary'),
      leftDisabled: document.querySelector('#jw-gallery .ngd-img-tile [data-img-act="left"]').disabled,
    }));
    expect(JSON.stringify(state.order) === JSON.stringify(['b.png', 'a.png']), 'reorder moves the image');
    expect(state.firstPrimary && state.leftDisabled, 'primary travelled with its image; edge arrow disabled');
    await page.click('.ngd-img-tile[data-img-uid="1"] [data-img-act="remove"]');
    state = await page.evaluate(() => ({
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
      badge: !!document.querySelector('#jw-gallery .ngd-status-chip'),
    }));
    expect(state.tiles === 1 && state.badge, 'remove leaves the primary in place');
    /* type + size validation, nothing added */
    await page.setInputFiles('#jw-file', {
      name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello'),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('jw-image-error').textContent,
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
    }));
    expect(/isn.t supported/i.test(state.error) && state.tiles === 1,
      'wrong type rejected inline, got: ' + state.error);
    await page.setInputFiles('#jw-file', {
      name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    });
    state = await page.evaluate(() => ({
      error: document.getElementById('jw-image-error').textContent,
      tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
    }));
    expect(/larger than 10/i.test(state.error) && state.tiles === 1,
      'oversize rejected inline, got: ' + state.error);
    /* payload carries the surviving image as primary at position 1 */
    await fillMinimumValid(page);
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert', { timeout: 5000 });
    const payload = await page.evaluate(() =>
      JSON.parse(document.getElementById('ngd-jewellery-form').getAttribute('data-ngd-payload')));
    expect(payload.images.length === 1 && payload.images[0].filename === 'b.png' &&
      payload.images[0].position === 1 && payload.images[0].is_primary === true,
      'images payload carries order + primary, got ' + JSON.stringify(payload.images));
  });

  await scenario('unsaved changes: dirty form warns before leaving; clean form does not', {}, async (page) => {
    await openAdd(page);
    let dialogSeen = null;
    page.on('dialog', (dialog) => {
      dialogSeen = dialog.type();
      dialog.accept();
    });
    await page.fill('[name="sku"]', 'JW-2002');
    await page.click('.ngd-dash-nav a[data-admin-route="dashboard"]');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    expect(dialogSeen === 'beforeunload', 'beforeunload warning fired for a dirty form');
    /* clean form: straight navigation, no dialog */
    dialogSeen = null;
    await page.goto(SITE + '/admin/add-jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    await page.click('#jw-cancel');
    await page.waitForURL('**/admin/jewellery.html', { timeout: 8000 });
    expect(dialogSeen === null, 'no warning when nothing changed');
  });

  await scenario('edit: prefilled from the demo record with demo gallery and edit buttons', {}, async (page) => {
    await openEdit(page, 'JW-1002');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'JW-1002');
    const state = await page.evaluate(() => {
      const rec = window.NGD_DEMO_JEWELLERY.find((p) => p.id === 'JW-1002');
      const v = (n) => document.querySelector('[name="' + n + '"]').value;
      return {
        title: document.querySelector('h1').textContent.trim(),
        editingId: document.getElementById('jw-editing-id').textContent.trim(),
        mismatches: [
          ['product_name', v('product_name') === rec.name],
          ['category', v('category') === rec.category],
          ['subcategory', v('subcategory') === rec.subcategory],
          ['short_description', v('short_description') === rec.description],
          ['metal', v('metal') === rec.metal],
          ['metal_karat', v('metal_karat') === rec.metalKarat],
          ['metal_colour', v('metal_colour') === rec.metalColour],
          ['diamond_weight', parseFloat(v('diamond_weight')) === rec.weightCt],
          ['diamond_pieces', parseInt(v('diamond_pieces'), 10) === rec.diamondPieces],
          ['diamond_quality', v('diamond_quality') === rec.diamondQuality],
          ['diamond_shape', v('diamond_shape') === rec.diamondShape],
          ['certificate_number', v('certificate_number') === rec.certificateNo],
          ['gross_weight', parseFloat(v('gross_weight')) === rec.grossWeight],
          ['size', v('size') === rec.size],
          ['availability', v('availability') === rec.availability],
          ['currency', v('currency') === 'USD'],
          ['price', v('price') !== ''],
        ].filter((pair) => !pair[1]).map((pair) => pair[0]),
        featured: document.querySelector('[name="featured"]').checked,
        active: document.querySelector('[name="active"]').checked,
        gallery: {
          tiles: document.querySelectorAll('#jw-gallery .ngd-img-tile').length,
          art: !!document.querySelector('#jw-gallery .ngd-img-tile-frame svg'),
          firstPrimary: document.querySelector('#jw-gallery .ngd-img-tile').classList.contains('is-primary'),
          badge: (document.querySelector('#jw-gallery .ngd-status-chip') || { textContent: '' }).textContent.trim(),
          names: [...document.querySelectorAll('#jw-gallery .ngd-img-tile-name')].map((n) => n.textContent.split(' · ')[0]),
        },
        buttons: {
          update: document.getElementById('jw-submit').textContent.trim(),
          archive: !!document.getElementById('jw-archive'),
          another: !!document.getElementById('jw-save-another'),
        },
      };
    });
    expect(state.title === 'Edit Jewellery' && state.editingId === 'JW-1002', 'editing header');
    expect(state.mismatches.length === 0, 'all fields prefilled from the record, wrong: ' + state.mismatches.join(','));
    expect(!state.featured && state.active, 'deterministic featured/active flags (JW-1002)');
    expect(state.gallery.tiles === 3 && state.gallery.art, 'three demo gallery tiles with artwork');
    expect(state.gallery.firstPrimary && state.gallery.badge === 'Primary',
      'primary badge on the first gallery image');
    expect(JSON.stringify(state.gallery.names) === JSON.stringify(
      ['JW-1002-hero.webp', 'JW-1002-angle.webp', 'JW-1002-detail.webp']),
      'demo gallery names, got ' + state.gallery.names.join(','));
    expect(state.buttons.update === 'Update Jewellery' && state.buttons.archive && !state.buttons.another,
      'edit-page buttons per spec');
    /* an all-metal piece prefils with empty diamond fields */
    await page.goto(SITE + '/admin/edit-jewellery.html?id=JW-1017', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'JW-1017');
    const allMetal = await page.evaluate(() => ({
      weight: document.querySelector('[name="diamond_weight"]').value,
      quality: document.querySelector('[name="diamond_quality"]').value,
      cert: document.querySelector('[name="certificate_number"]').value,
      art: !!document.querySelector('#jw-gallery .ngd-img-tile-frame svg'),
    }));
    expect(allMetal.weight === '' && allMetal.quality === '' && allMetal.cert === '',
      'null diamond fields stay blank for the all-metal bangle');
    expect(allMetal.art, 'bangle artwork gallery still shown');
  });

  await scenario('edit: honest update payload with ordered images and the UI-only archive notice', {}, async (page) => {
    await openEdit(page, 'JW-1002');
    await page.waitForFunction(() =>
      (document.querySelector('[name="sku"]') || {}).value === 'JW-1002');
    await page.fill('[name="price"]', '6000');
    await page.click('#jw-submit');
    await page.waitForSelector('#jw-alert .ngd-alert', { timeout: 5000 });
    let state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      payload: JSON.parse(document.getElementById('ngd-jewellery-form').getAttribute('data-ngd-payload')),
    }));
    expect(/update payload is ready/i.test(state.alert) && /nothing was saved/i.test(state.alert),
      'honest update notice, got: ' + state.alert);
    expect(state.payload.sku === 'JW-1002' && state.payload.price === 6000,
      'update payload carries the edit');
    expect(state.payload.images.length === 3 &&
      state.payload.images.map((i) => i.position).join(',') === '1,2,3' &&
      state.payload.images[0].is_primary === true &&
      state.payload.images[0].filename === 'JW-1002-hero.webp',
      'ordered images payload with primary first, got ' + JSON.stringify(state.payload.images));
    await page.click('#jw-archive');
    state = await page.evaluate(() => ({
      alert: document.querySelector('#jw-alert .ngd-alert').textContent.replace(/\s+/g, ' '),
      url: location.pathname,
    }));
    expect(/Archive is UI-only/i.test(state.alert) && /nothing was archived or deleted/i.test(state.alert),
      'archive is honestly UI-only, got: ' + state.alert);
    expect(/edit-jewellery\.html$/.test(state.url), 'archive does not navigate or remove');
  });

  await scenario('edit: unknown id shows the not-found state', {}, async (page) => {
    await openEdit(page, 'JW-9999');
    await page.waitForFunction(() => !document.getElementById('jw-notfound').hidden);
    const state = await page.evaluate(() => ({
      formHidden: document.getElementById('jw-form-wrap').hidden,
      id: document.getElementById('jw-notfound-id').textContent.trim(),
      back: !!document.querySelector('#jw-notfound a[href="jewellery.html"]'),
    }));
    expect(state.formHidden, 'form hidden for an unknown piece');
    expect(state.id === 'JW-9999' && state.back, 'not-found names the id and offers the way back');
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
