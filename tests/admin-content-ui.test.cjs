/* ============================================================
   Admin Content Manager tests (LIVE).
   Logs in against a compact mocked Supabase backend and drives
   admin/content.html: Content live in the sidebar (no Soon
   chip), the registry-driven section list with saved/built-in
   state, editing + upsert-by-key saving with persistence after
   a full reload, Cancel restoring saved values, URL validation,
   the active switch, the site-media picker filling image fields
   with preview, and the role guards.
   Run:  node tests/admin-content-ui.test.cjs
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
    if (url.pathname === '/rest/v1/site_content' && method === 'GET') {
      return json(200, opts.rows);
    }
    if (url.pathname === '/rest/v1/site_content' && method === 'POST') {
      const payload = JSON.parse(req.postData() || '{}');
      saveCalls.push(payload);
      const saved = Object.assign({}, payload, { updated_at: '2026-08-21T12:00:00Z' });
      const at = opts.rows.findIndex((r) => r.key === payload.key);
      if (at === -1) opts.rows.push(saved); else opts.rows[at] = saved;
      return json(201, saved);
    }
    if (url.pathname === '/storage/v1/object/list/site-media' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const folder = String(body.prefix || '').replace(/\/$/, '');
      return json(200, folder === 'homepage'
        ? [{ name: 'hero.webp', created_at: '2026-08-20T10:00:00Z', metadata: { size: 1000, mimetype: 'image/webp' } }]
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

async function openContent(page, user) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/content.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-cnt-open]').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + registry: Content live in the sidebar, nine sections with honest state', {
    rows: [{ key: 'homepage_hero', subheading: 'Saved eyebrow', active: true, updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    await openContent(page, user);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.ngd-dash-nav [data-admin-route="content"]');
      const items = [...document.querySelectorAll('[data-cnt-open]')];
      const hero = items.find((i) => /Homepage · Hero/.test(i.textContent));
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        navIsLink: nav.tagName === 'A' && nav.getAttribute('href') === 'content.html',
        navActive: nav.classList.contains('is-active'),
        navSoon: !!nav.querySelector('.ngd-soon-chip'),
        soonCount: document.querySelectorAll('.ngd-dash-nav .is-soon').length,
        sections: items.length,
        heroLive: /Live/.test(hero.textContent),
        builtIn: items.filter((i) => /built-in copy/.test(i.textContent)).length,
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.navIsLink && state.navActive && !state.navSoon, 'Content is a live, active route without a Soon chip');
    expect(state.soonCount === 3, 'SEO, Settings and Users stay honestly Soon, got ' + state.soonCount);
    expect(state.sections === 9, 'all nine registry sections listed, got ' + state.sections);
    expect(state.heroLive, 'a saved active section shows as Live');
    expect(state.builtIn === 8, 'unsaved sections say built-in copy, got ' + state.builtIn);
  });

  await scenario('edit + save upserts by key; a full reload still shows the saved copy', {}, async (page, user) => {
    saveCalls = [];
    await openContent(page, user);
    await page.click('[data-cnt-open="homepage_hero"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    await page.fill('#cnt-f-subheading', 'New eyebrow from the console');
    await page.fill('#cnt-f-body', 'A fresh lead paragraph.');
    await page.fill('#cnt-f-cta_text', 'Shop Stones');
    await page.fill('#cnt-f-cta_url', 'diamonds.html?src=cms');
    await page.click('#cnt-save');
    await page.waitForSelector('#cnt-toast .ngd-alert-success', { timeout: 5000 });
    expect(saveCalls.length === 1, 'exactly one upsert, got ' + saveCalls.length);
    const sent = saveCalls[0];
    expect(sent.key === 'homepage_hero' && sent.subheading === 'New eyebrow from the console' &&
      sent.body === 'A fresh lead paragraph.' && sent.cta_url === 'diamonds.html?src=cms' && sent.active === true,
      'payload carries the stable key and the edited fields: ' + JSON.stringify(sent));
    /* full reload — the mock's stored row must come back */
    await page.goto(SITE + '/admin/content.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('[data-cnt-open]').length > 0);
    await page.click('[data-cnt-open="homepage_hero"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    const after = await page.evaluate(() => ({
      subheading: document.getElementById('cnt-f-subheading').value,
      updated: document.getElementById('cnt-form-updated').textContent,
    }));
    expect(after.subheading === 'New eyebrow from the console', 'saved value survives a refresh');
    expect(/Saved/.test(after.updated), 'saved timestamp shown');
  });

  await scenario('Cancel restores the last saved values', {
    rows: [{ key: 'footer_content', body: 'The saved footer line.', active: true, updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    saveCalls = [];
    await openContent(page, user);
    await page.click('[data-cnt-open="footer_content"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    await page.fill('#cnt-f-body', 'Something I typed and regret');
    await page.click('#cnt-cancel');
    const value = await page.evaluate(() => document.getElementById('cnt-f-body').value);
    expect(value === 'The saved footer line.', 'unsaved edit discarded, got ' + value);
    expect(saveCalls.length === 0, 'nothing was written');
  });

  await scenario('unsafe URLs are refused before anything is sent', {}, async (page, user) => {
    saveCalls = [];
    await openContent(page, user);
    await page.click('[data-cnt-open="homepage_hero"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    await page.fill('#cnt-f-cta_url', 'javascript:alert(1)');
    await page.click('#cnt-save');
    await page.waitForSelector('#cnt-toast .ngd-alert-danger', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#cnt-toast .ngd-alert-danger').textContent);
    expect(/must be a normal http\(s\)/.test(toast), 'honest validation copy, got ' + toast);
    expect(saveCalls.length === 0, 'the bad payload never left the browser');
  });

  await scenario('the active switch saves an inactive section, listed honestly', {
    rows: [{ key: 'homepage_story', subheading: 'Saved', active: true, updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    saveCalls = [];
    await openContent(page, user);
    await page.click('[data-cnt-open="homepage_story"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    await page.uncheck('#cnt-active');
    await page.click('#cnt-save');
    await page.waitForSelector('#cnt-toast .ngd-alert-success', { timeout: 5000 });
    expect(saveCalls.length === 1 && saveCalls[0].active === false, 'active:false saved');
    const chip = await page.evaluate(() =>
      [...document.querySelectorAll('[data-cnt-open]')].find((i) => /Manufacturing Story/.test(i.textContent)).textContent);
    expect(/Inactive/.test(chip), 'list shows the Inactive state');
  });

  await scenario('media picker fills image fields from the site-media library with preview', {}, async (page, user) => {
    await openContent(page, user);
    await page.click('[data-cnt-open="about_intro"]');
    await page.waitForSelector('#cnt-form:not([hidden])');
    await page.click('[data-cnt-pick="cnt-f-image_url"]');
    await page.waitForSelector('#cnt-media-picker:not([hidden])');
    await page.waitForSelector('[data-cnt-choose]', { timeout: 5000 });
    await page.click('[data-cnt-choose]');
    const state = await page.evaluate(() => ({
      value: document.getElementById('cnt-f-image_url').value,
      previewShown: !document.getElementById('cnt-f-image_url-preview').hidden,
      previewSrc: document.getElementById('cnt-f-image_url-preview').getAttribute('src'),
      pickerHidden: document.getElementById('cnt-media-picker').hidden,
    }));
    expect(/\/storage\/v1\/object\/public\/site-media\/homepage\/hero\.webp$/.test(state.value),
      'public media URL filled in, got ' + state.value);
    expect(state.previewShown && state.previewSrc === state.value, 'inline preview shows the picked image');
    expect(state.pickerHidden, 'picker closes after choosing');
  });

  await scenario('guard: no session goes to login; customer is turned away', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/admin/content.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/content.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-content scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
