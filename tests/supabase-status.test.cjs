/* ============================================================
   Supabase connection status tests (STEP 29).
   Verifies supabase-status.html and the config/client layer:
   the four checks against a mocked project (client Connected,
   Database API Reachable, Auth Available, session Signed out /
   Signed in), that NO key or project URL ever appears in the
   page, that an RLS/permission response still reads as
   Reachable while a true network failure reads as Failed, that
   a missing URL or missing publishable key is handled safely
   (honest Failed rows + the config banner, no JS errors), that
   a blocked Supabase library is reported, and that the page
   stays clean at 390px.
   Run:  node tests/supabase-status.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_KEY = 'sb_publishable_test_key_1234567890';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: '${TEST_KEY}'
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

/* profilesMode: 'empty' → 200 [], 'denied' → 401 permission error,
   'row' → the admin profile row (post-login flows) */
function makeMock(profilesMode) {
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
      if (profilesMode === 'denied') {
        return json(401, { code: '42501', message: 'permission denied for table profiles', details: null, hint: null });
      }
      const row = { id: ADMIN.id, email: ADMIN.email, ...ADMIN.profile, created_at: '2026-01-01T00:00:00Z' };
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) return json(200, row);
      return json(200, profilesMode === 'row' ? [row] : []);
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
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: opts.config || TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(opts.profiles || 'empty'));
    if (opts.routes) await opts.routes(context);
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

async function openStatus(page) {
  await page.goto(SITE + '/supabase-status.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdStatusDone === true, null, { timeout: 10000 });
}

function readRows(page) {
  return page.evaluate(() => {
    const out = {};
    ['client', 'db', 'auth', 'session'].forEach((k) => {
      out[k] = {
        chip: document.querySelector('[data-sb-chip="' + k + '"]').textContent.trim(),
        cls: document.querySelector('[data-sb-chip="' + k + '"]').className,
        note: document.querySelector('[data-sb-note="' + k + '"]').textContent.replace(/\s+/g, ' '),
      };
    });
    return out;
  });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('configured project: all four checks pass, no key or URL shown, re-run works', {}, async (page) => {
    await openStatus(page);
    let rows = await readRows(page);
    expect(rows.client.chip === 'Connected' && /is-good/.test(rows.client.cls),
      'client Connected, got ' + rows.client.chip);
    expect(rows.db.chip === 'Reachable' && /Row Level Security/i.test(rows.db.note),
      'database Reachable with the RLS-aware note, got ' + rows.db.chip + ' / ' + rows.db.note);
    expect(rows.auth.chip === 'Available', 'auth Available, got ' + rows.auth.chip);
    expect(rows.session.chip === 'Signed out' && /expected until login/i.test(rows.session.note),
      'session honestly Signed out, got ' + rows.session.chip);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body.indexOf('sb_publishable_test_key_1234567890') === -1 &&
      body.indexOf('ngd-test.supabase.co') === -1,
      'neither the publishable key nor the project URL appears on the page');
    /* re-run resolves back to the same states */
    await page.click('#sb-rerun');
    await page.waitForFunction(() => window.ngdStatusDone === true, null, { timeout: 10000 });
    rows = await readRows(page);
    expect(rows.client.chip === 'Connected' && rows.db.chip === 'Reachable',
      're-run lands on the same results');
    await page.screenshot({ path: path.join(SCREEN_DIR, 'supabase-status-desktop.png') });
  });

  await scenario('an RLS permission error still reads as Reachable, never as Failed', { profiles: 'denied' }, async (page) => {
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.client.chip === 'Connected', 'client Connected');
    expect(rows.db.chip === 'Reachable' && /protecting the table/i.test(rows.db.note),
      'permission-denied classified as Reachable, got ' + rows.db.chip + ' / ' + rows.db.note);
  });

  await scenario('a true network failure on the data API reads as Failed', {
    routes: async (context) => {
      await context.route(SB_HOST + '/rest/v1/**', (r) => r.abort('connectionfailed'));
    },
  }, async (page) => {
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.client.chip === 'Connected', 'client itself still Connected');
    expect(rows.db.chip === 'Failed' && /check the Project URL/i.test(rows.db.note),
      'network failure honestly reported, got ' + rows.db.chip);
    expect(rows.auth.chip === 'Available', 'local auth interface unaffected');
  });

  await scenario('signed-in session is reported with the account email', { profiles: 'row' }, async (page) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', ADMIN.email);
    await page.fill('#login-password', ADMIN.password);
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.session.chip === 'Signed in' && /admin@ngd\.test/.test(rows.session.note),
      'active session reported, got ' + rows.session.chip + ' / ' + rows.session.note);
    expect(rows.db.chip === 'Reachable', 'database still Reachable when rows are visible');
  });

  await scenario('missing Project URL: safe Failed rows, config banner, no crash', {
    config: `window.NGD_SUPABASE_CONFIG = {
      SUPABASE_URL: 'YOUR_SUPABASE_PROJECT_URL',
      SUPABASE_PUBLISHABLE_KEY: '${TEST_KEY}'
    };`,
  }, async (page) => {
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.client.chip === 'Failed' && /supabase-config\.js/.test(rows.client.note),
      'client Failed pointing at the config file, got ' + rows.client.note);
    expect(rows.db.chip === 'Failed' && /Skipped/i.test(rows.db.note), 'database skipped honestly');
    expect(rows.auth.chip === 'Unavailable' && rows.session.chip === 'Unknown',
      'auth + session rows honest about the missing config');
    const state = await page.evaluate(() => ({
      banner: !!document.getElementById('ngd-config-banner'),
      client: window.ngdSupabase,
      flag: window.ngdSupabaseState,
    }));
    expect(state.banner, 'developer config banner shown');
    expect(state.client === null && state.flag === 'unconfigured', 'no client created');
  });

  await scenario('missing Publishable key: handled just as safely', {
    config: `window.NGD_SUPABASE_CONFIG = {
      SUPABASE_URL: '${SB_HOST}',
      SUPABASE_PUBLISHABLE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
    };`,
  }, async (page) => {
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.client.chip === 'Failed' && /supabase-config\.js/.test(rows.client.note),
      'client Failed pointing at the config file');
    const flag = await page.evaluate(() => window.ngdSupabaseState);
    expect(flag === 'unconfigured', 'placeholder key detected, got ' + flag);
  });

  await scenario('blocked Supabase library is reported without crashing', {
    routes: async (context) => {
      await context.route('**/@supabase/supabase-js@*/dist/umd/supabase.js', (r) => r.abort('blockedbyclient'));
    },
  }, async (page) => {
    await openStatus(page);
    const rows = await readRows(page);
    expect(rows.client.chip === 'Failed' && /library did not load/i.test(rows.client.note),
      'library failure reported honestly, got ' + rows.client.note);
    const flag = await page.evaluate(() => window.ngdSupabaseState);
    expect(flag === 'lib_missing', 'lib_missing state, got ' + flag);
  });

  await scenario('mobile 390: status page stays clean with no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openStatus(page);
    const o = await page.evaluate(() => ({
      rows: document.querySelectorAll('[data-sb-check]').length,
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.rows === 4, 'all four rows present');
    expect(o.bodyW <= o.clientW + 1, `no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'supabase-status-mobile.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} supabase-status scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
