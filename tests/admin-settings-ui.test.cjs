/* ============================================================
   Admin Settings tests (LIVE).
   Logs in against a compact mocked Supabase backend and drives
   admin/settings.html: Settings live in the sidebar (one honest
   Soon item left), six registry-driven tabbed sections with all
   thirty fields, values loading from site_settings (admin sees
   the admin-only key too), tab switching, save-only-what-changed
   bulk upserts with loading state + truthful toasts and reload
   persistence, the no-op save, honest validation (required
   company name, emails, URLs, phones), the Unsaved-changes chip
   + beforeunload guard, the site-media picker for the logo, and
   the role guards.
   Run:  node tests/admin-settings-ui.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

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
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
let saveCalls = [];
function makeMock(user, opts) {
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
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
      const row = { id: user.id, email: user.email, ...user.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, [row]);
    }
    if (url.pathname === '/rest/v1/site_settings' && method === 'GET') {
      return json(200, opts.rows);
    }
    if (url.pathname === '/rest/v1/site_settings' && method === 'POST') {
      const payload = JSON.parse(req.postData() || '[]');
      const list = Array.isArray(payload) ? payload : [payload];
      saveCalls.push(list);
      const saved = list.map((row) => Object.assign({}, row, { updated_at: '2026-08-21T12:00:00Z' }));
      saved.forEach((row) => {
        const at = opts.rows.findIndex((r) => r.key === row.key);
        if (at === -1) opts.rows.push(row); else opts.rows[at] = row;
      });
      return json(201, saved);
    }
    if (url.pathname === '/storage/v1/object/list/site-media' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const folder = String(body.prefix || '').replace(/\/$/, '');
      return json(200, folder === 'homepage'
        ? [{ name: 'logo.webp', created_at: '2026-08-20T10:00:00Z', metadata: { size: 1000, mimetype: 'image/webp' } }]
        : []);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/site-media/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/webp', headers: CORS, body: Buffer.alloc(8) });
    }
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
    await context.route(SB_HOST + '/**', makeMock(user, { rows: opts.rows || [] }));
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

async function openSettings(page, user) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/settings.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-set-key]').length > 0 &&
    !/Loading saved settings/.test(document.getElementById('set-status').textContent));
}

const dirtyState = () => ({
  chip: !document.getElementById('set-dirty').hidden,
  blocked: (() => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  })(),
});

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell: Settings live in the sidebar, six tabs, all thirty-five fields, honest empty state', {}, async (page, user) => {
    await openSettings(page, user);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.ngd-dash-nav [data-admin-route="settings"]');
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        navIsLink: nav.tagName === 'A' && nav.getAttribute('href') === 'settings.html',
        navActive: nav.classList.contains('is-active'),
        navSoon: !!nav.querySelector('.ngd-soon-chip'),
        soonCount: document.querySelectorAll('.ngd-dash-nav .is-soon').length,
        tabs: [...document.querySelectorAll('[data-set-tab]')].map((t) => t.textContent.trim()),
        panels: document.querySelectorAll('[data-set-panel]').length,
        firstShown: !document.querySelector('[data-set-panel="company"]').hidden,
        othersHidden: document.querySelector('[data-set-panel="display"]').hidden,
        inputs: document.querySelectorAll('[data-set-key]').length,
        status: document.getElementById('set-status').textContent,
        dirty: document.getElementById('set-dirty').hidden,
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.navIsLink && state.navActive && !state.navSoon, 'Settings is a live, active route without a Soon chip');
    expect(state.soonCount === 1, 'only Users & Roles stays honestly Soon, got ' + state.soonCount);
    expect(state.tabs.join(',') === 'Company,Contact,Social,Website,Business features,Display',
      'six sections in order, got ' + state.tabs.join(','));
    expect(state.panels === 6 && state.firstShown && state.othersHidden, 'company panel open, others hidden');
    expect(state.inputs === 35, 'all thirty-five registry fields render, got ' + state.inputs);
    expect(/No saved settings yet/.test(state.status), 'honest empty status, got ' + state.status);
    expect(state.dirty, 'no unsaved-changes chip on load');
  });

  await scenario('saved values load — text, toggles and the admin-only recipient key', {
    rows: [
      { key: 'company_name', value: 'New Grown Diamond Pvt Ltd', updated_at: '2026-08-20T09:00:00Z' },
      { key: 'feature_quotes', value: 'false', updated_at: '2026-08-20T09:00:00Z' },
      { key: 'announcement_enabled', value: 'true', updated_at: '2026-08-20T10:00:00Z' },
      { key: 'contact_form_recipient', value: 'inbox@ngd.example', updated_at: '2026-08-20T09:00:00Z' },
    ],
  }, async (page, user) => {
    await openSettings(page, user);
    const state = await page.evaluate(() => ({
      company: document.getElementById('set-f-company_name').value,
      quotes: document.getElementById('set-f-feature_quotes').checked,
      holds: document.getElementById('set-f-feature_holds').checked,
      announce: document.getElementById('set-f-announcement_enabled').checked,
      maintenance: document.getElementById('set-f-maintenance_mode').checked,
      recipient: document.getElementById('set-f-contact_form_recipient').value,
      badge: /Admin-only/.test(document.querySelector('label[for="set-f-contact_form_recipient"]').textContent),
      status: document.getElementById('set-status').textContent,
    }));
    expect(state.company === 'New Grown Diamond Pvt Ltd', 'text value loaded');
    expect(state.quotes === false && state.holds === true, 'saved toggle off; untouched toggle keeps its default on');
    expect(state.announce === true && state.maintenance === false, 'display toggles honest');
    expect(state.recipient === 'inbox@ngd.example' && state.badge, 'admin-only key shown to the admin, labelled');
    expect(/Last saved/.test(state.status), 'last-saved stamp, got ' + state.status);
  });

  await scenario('tabs switch panels', {}, async (page, user) => {
    await openSettings(page, user);
    await page.click('[data-set-tab="social"]');
    const state = await page.evaluate(() => ({
      social: !document.querySelector('[data-set-panel="social"]').hidden,
      company: document.querySelector('[data-set-panel="company"]').hidden,
      selected: document.querySelector('[data-set-tab="social"]').getAttribute('aria-selected'),
    }));
    expect(state.social && state.company && state.selected === 'true', 'social panel shown, company hidden');
  });

  await scenario('save writes ONLY the changed keys; a full reload restores them', {}, async (page, user) => {
    saveCalls = [];
    await openSettings(page, user);
    await page.fill('#set-f-company_name', 'NGD Atelier LLP');
    await page.click('[data-set-tab="business"]');
    await page.uncheck('#set-f-feature_quotes');
    await page.click('[data-set-tab="social"]');
    await page.fill('#set-f-social_instagram', 'https://instagram.com/ngdatelier');
    await page.click('#set-save');
    await page.waitForSelector('#set-toast .ngd-alert-success', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#set-toast .ngd-alert-success').textContent);
    expect(/3 settings were saved/.test(toast), 'honest count in the toast, got ' + toast);
    expect(saveCalls.length === 1, 'one bulk upsert, got ' + saveCalls.length);
    const sent = saveCalls[0];
    const byKey = {};
    sent.forEach((row) => { byKey[row.key] = row.value; });
    expect(sent.length === 3 && byKey.company_name === 'NGD Atelier LLP' &&
      byKey.feature_quotes === 'false' && byKey.social_instagram === 'https://instagram.com/ngdatelier',
      'exactly the three changed keys: ' + JSON.stringify(sent));
    /* full reload — the mock's stored rows must come back */
    await page.goto(SITE + '/admin/settings.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('[data-set-key]').length > 0 &&
      /Last saved/.test(document.getElementById('set-status').textContent));
    const after = await page.evaluate(() => ({
      company: document.getElementById('set-f-company_name').value,
      quotes: document.getElementById('set-f-feature_quotes').checked,
      instagram: document.getElementById('set-f-social_instagram').value,
    }));
    expect(after.company === 'NGD Atelier LLP' && after.quotes === false &&
      after.instagram === 'https://instagram.com/ngdatelier', 'saved values survive a refresh');
  });

  await scenario('saving with nothing changed writes nothing', {
    rows: [{ key: 'company_name', value: 'New Grown Diamond', updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    saveCalls = [];
    await openSettings(page, user);
    await page.click('#set-save');
    await page.waitForSelector('#set-toast .ngd-alert-info', { timeout: 5000 });
    expect(saveCalls.length === 0, 'no write for a no-op save');
  });

  await scenario('validation: required name, emails, phones and URLs — nothing is sent', {}, async (page, user) => {
    saveCalls = [];
    await openSettings(page, user);
    const dangerHas = (re) => page.waitForFunction((source) =>
      new RegExp(source).test((document.querySelector('#set-toast .ngd-alert-danger') || { textContent: '' }).textContent),
      re.source);

    await page.fill('#set-f-company_name', '');
    await page.click('#set-save');
    await dangerHas(/Company name is required/);

    await page.fill('#set-f-company_name', 'New Grown Diamond');
    await page.click('[data-set-tab="contact"]');
    await page.fill('#set-f-contact_email', 'not-an-email');
    await page.click('#set-save');
    await dangerHas(/valid email address/);

    await page.fill('#set-f-contact_email', 'hello@ngd.example');
    await page.fill('#set-f-contact_phone', 'call me maybe');
    await page.click('#set-save');
    await dangerHas(/valid phone number/);

    await page.fill('#set-f-contact_phone', '+91 98765 43210');
    await page.click('[data-set-tab="social"]');
    await page.fill('#set-f-social_instagram', 'instagram.com/ngd');
    await page.click('#set-save');
    await dangerHas(/full https:\/\/ profile address/);

    const focusTab = await page.evaluate(() => !document.querySelector('[data-set-panel="social"]').hidden);
    expect(focusTab, 'the failing field’s tab is brought forward');
    expect(saveCalls.length === 0, 'no invalid payload ever left the browser, got ' + saveCalls.length);
  });

  await scenario('unsaved changes: chip + leave-page guard until saved', {
    rows: [{ key: 'company_name', value: 'New Grown Diamond', updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    saveCalls = [];
    await openSettings(page, user);
    const before = await page.evaluate(dirtyState);
    expect(!before.chip && !before.blocked, 'clean form: no chip, leaving is free');
    await page.fill('#set-f-company_tagline', 'Grown by science, finished like heritage');
    const during = await page.evaluate(dirtyState);
    expect(during.chip && during.blocked, 'edit pending: chip shown, leaving is guarded');
    await page.click('#set-save');
    await page.waitForSelector('#set-toast .ngd-alert-success', { timeout: 5000 });
    const after = await page.evaluate(dirtyState);
    expect(!after.chip && !after.blocked, 'after save: chip gone, leaving is free again');
  });

  await scenario('media picker fills the logo from the site-media library with preview', {}, async (page, user) => {
    await openSettings(page, user);
    await page.click('[data-set-pick="set-f-logo_url"]');
    await page.waitForSelector('#set-media-picker:not([hidden])');
    await page.waitForSelector('[data-set-choose]', { timeout: 5000 });
    await page.click('[data-set-choose]');
    const state = await page.evaluate(() => ({
      value: document.getElementById('set-f-logo_url').value,
      preview: !document.getElementById('set-f-logo_url-preview').hidden,
      dirty: !document.getElementById('set-dirty').hidden,
      pickerHidden: document.getElementById('set-media-picker').hidden,
    }));
    expect(/\/storage\/v1\/object\/public\/site-media\/homepage\/logo\.webp$/.test(state.value),
      'public media URL filled in, got ' + state.value);
    expect(state.preview && state.dirty && state.pickerHidden, 'preview shown, dirty tracked, picker closed');
  });

  await scenario('guard: no session goes to login; customer is turned away', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/admin/settings.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/settings.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-settings scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
