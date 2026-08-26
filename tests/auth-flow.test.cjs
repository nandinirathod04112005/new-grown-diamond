/* ============================================================
   Supabase Step 4A auth-flow tests.

   Runs the real site files in Chromium against a MOCKED Supabase
   backend (Playwright route interception of ngd-test.supabase.co)
   so login / signup / guards / logout are exercised end-to-end
   WITHOUT real credentials. Testing against your real Supabase
   project is described in docs/SUPABASE_AUTH_TEST.md.

   Run:  node tests/auth-flow.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
/* Injected for the unconfigured-state scenario — the on-disk config now
   carries the real project values, so placeholder behaviour is tested by
   serving placeholders here, never by reading the disk file. */
const PLACEHOLDER_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_PROJECT_URL',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};`;

/* ---------------- mock Supabase backend ---------------- */

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt(sub, email) {
  return (
    b64url({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    b64url({ sub, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig'
  );
}

function makeBackend(opts = {}) {
  const uid = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
  const users = {
    'admin@ngd.test': {
      id: uid(1), password: 'Admin#12345', confirmed: true,
      profile: { role: 'admin', account_status: 'active', full_name: 'Asha Admin', company_name: null, phone: '+911111111111' },
    },
    'customer@ngd.test': {
      id: uid(2), password: 'Customer#12345', confirmed: true,
      profile: { role: 'customer', account_status: 'active', full_name: 'Chetan Customer', company_name: 'Chetan Gems LLP', phone: '+912222222222' },
    },
    'suspended@ngd.test': {
      id: uid(3), password: 'Suspend#12345', confirmed: true,
      profile: { role: 'customer', account_status: 'suspended', full_name: 'Sam Suspended', company_name: null, phone: '+913333333333' },
    },
    'inactive@ngd.test': {
      id: uid(4), password: 'Inactive#12345', confirmed: true,
      profile: { role: 'customer', account_status: 'inactive', full_name: 'Ina Inactive', company_name: null, phone: '+914444444444' },
    },
    'noprofile@ngd.test': {
      id: uid(5), password: 'NoProfile#12345', confirmed: true, profile: null,
    },
    'unconfirmed@ngd.test': {
      id: uid(6), password: 'Unconfirmed#12345', confirmed: false,
      profile: { role: 'customer', account_status: 'active', full_name: 'Uma Unconfirmed', company_name: null, phone: '+915555555555' },
    },
  };
  let nextId = 90;
  const calls = [];
  const signups = [];

  const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
  const json = (route, status, obj) =>
    route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });

  function userObject(rec, email, extra = {}) {
    return {
      id: rec.id,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: rec.confirmed ? '2026-01-01T00:00:00Z' : null,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: rec.profile
        ? { full_name: rec.profile.full_name, company_name: rec.profile.company_name, phone: rec.profile.phone }
        : {},
      identities: [
        {
          identity_id: 'ii-' + rec.id, id: rec.id, user_id: rec.id, provider: 'email',
          identity_data: { email, sub: rec.id },
          created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z',
        },
      ],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...extra,
    };
  }

  function sessionPayload(rec, email) {
    return {
      access_token: makeJwt(rec.id, email),
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'rt-' + email,
      user: userObject(rec, email),
    };
  }

  /* GoTrue error body — includes both the 2024-01-01 string `code`
     and the legacy `error_code`/`msg` fields so every supabase-js
     parsing path produces the same AuthApiError. */
  function authError(route, status, code, msg) {
    return json(route, status, { code, error_code: code, msg, message: msg });
  }

  function findByAuth(req) {
    const auth = req.headers()['authorization'] || '';
    const m = auth.match(/^Bearer (.+)$/i);
    if (!m) return null;
    try {
      const payload = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString());
      if (payload.email && users[payload.email]) return { email: payload.email, rec: users[payload.email] };
    } catch (_e) { /* invalid token */ }
    return null;
  }

  async function handler(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    calls.push({ method, path: url.pathname, grant: url.searchParams.get('grant_type') });

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-max-age': '3600',
        },
        body: '',
      });
    }

    if (url.pathname === '/auth/v1/token' && method === 'POST') {
      if (opts.failToken) return route.abort('failed');
      const body = JSON.parse(req.postData() || '{}');
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const rec = users[body.email];
        if (!rec || rec.password !== body.password) {
          return authError(route, 400, 'invalid_credentials', 'Invalid login credentials');
        }
        if (!rec.confirmed) {
          return authError(route, 400, 'email_not_confirmed', 'Email not confirmed');
        }
        return json(route, 200, sessionPayload(rec, body.email));
      }
      if (grant === 'refresh_token') {
        const email = String(body.refresh_token || '').replace(/^rt-/, '');
        const rec = users[email];
        if (!rec) return authError(route, 400, 'refresh_token_not_found', 'Invalid Refresh Token');
        return json(route, 200, sessionPayload(rec, email));
      }
      return authError(route, 400, 'unsupported_grant_type', 'unsupported grant type');
    }

    if (url.pathname === '/auth/v1/signup' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      signups.push(body);
      if (users[body.email]) {
        /* Supabase obfuscation: existing email → user with identities: [] */
        return json(route, 200, userObject(users[body.email], body.email, {
          identities: [], confirmation_sent_at: '2026-01-01T00:00:00Z',
        }));
      }
      const meta = body.data || {};
      const rec = {
        id: uid(nextId++),
        password: body.password,
        confirmed: !!opts.autoconfirm,
        profile: {
          role: 'customer', /* mirrors the DB trigger: browser never sets this */
          account_status: 'active',
          full_name: meta.full_name || null,
          company_name: meta.company_name || null,
          phone: meta.phone || null,
        },
      };
      users[body.email] = rec;
      if (opts.autoconfirm) return json(route, 200, sessionPayload(rec, body.email));
      return json(route, 200, userObject(rec, body.email, { confirmation_sent_at: '2026-01-01T00:00:00Z' }));
    }

    if (url.pathname === '/auth/v1/logout' && method === 'POST') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      const found = findByAuth(req);
      if (!found) return authError(route, 401, 'no_session', 'invalid claim: missing sub claim');
      return json(route, 200, userObject(found.rec, found.email));
    }

    if (url.pathname === '/rest/v1/profiles' && method === 'GET') {
      const found = findByAuth(req);
      const idFilter = url.searchParams.get('id');
      let rows = [];
      if (found && found.rec.profile) {
        const row = { id: found.rec.id, email: found.email, ...found.rec.profile, created_at: '2026-01-01T00:00:00Z' };
        if (!idFilter || idFilter === 'eq.' + found.rec.id) rows = [row];
      }
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) {
        if (rows.length === 1) return json(route, 200, rows[0]);
        return json(route, 406, {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: 'The result contains 0 rows',
          hint: null,
        });
      }
      return json(route, 200, rows);
    }

    return json(route, 404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }

  return { users, calls, signups, handler };
}

/* ---------------- harness ---------------- */

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const backend = makeBackend(opts);
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: opts.placeholderConfig ? PLACEHOLDER_CONFIG : TEST_CONFIG,
      })
    );
    await context.route(SB_HOST + '/**', backend.handler);

    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await fn({ page, context, backend });

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

async function uiLogin(page, email, password) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('#login-submit');
}

async function alertText(page, boxId) {
  const sel = '#' + boxId + ' .ngd-alert';
  await page.waitForSelector(sel, { timeout: 8000 });
  return (await page.textContent(sel)).trim();
}

/* ---------------- scenarios ---------------- */

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('supabase client initializes (single shared instance)', {}, async ({ page }) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      state: window.ngdSupabaseState,
      hasClient: !!window.ngdSupabase,
      configured: window.ngdIsSupabaseConfigured(),
      root: window.NGD_SITE_ROOT,
      hasAuthApi: !!(window.NGDAuth && window.NGDAuth.requireAdmin && window.NGDAuth.logout),
    }));
    expect(state.state === 'ready', 'client state ready, got ' + state.state);
    expect(state.hasClient, 'window.ngdSupabase exists');
    expect(state.configured, 'ngdIsSupabaseConfigured() true');
    expect(state.root === SITE + '/', 'site root derived, got ' + state.root);
    expect(state.hasAuthApi, 'NGDAuth API exposed');
  });

  await scenario('placeholder config shows setup banner, no crash', { placeholderConfig: true }, async ({ page }) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#ngd-config-banner');
    const state = await page.evaluate(() => window.ngdSupabaseState);
    expect(state === 'unconfigured', 'state unconfigured, got ' + state);
    await page.fill('#login-email', 'a@b.co');
    await page.fill('#login-password', 'x');
    await page.click('#login-submit');
    const text = await alertText(page, 'login-alert');
    expect(/not configured/i.test(text), 'warning mentions configuration, got: ' + text);
  });

  await scenario('login validation blocks empty submit (no request sent)', {}, async ({ page, backend }) => {
    await page.goto(SITE + '/login.html', { waitUntil: 'networkidle' });
    await page.click('#login-submit');
    await page.waitForFunction(() =>
      document.getElementById('ngd-login-form').classList.contains('was-validated')
    );
    expect(backend.calls.filter((c) => c.path === '/auth/v1/token').length === 0, 'no token request on invalid form');
    expect(page.url().endsWith('/login.html'), 'still on login page');
  });

  await scenario('wrong password → safe error, button re-enabled', {}, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'totally-wrong');
    const text = await alertText(page, 'login-alert');
    expect(/incorrect email or password/i.test(text), 'friendly wrong-credentials message, got: ' + text);
    await page.waitForFunction(() => !document.getElementById('login-submit').disabled);
    expect(page.url().endsWith('/login.html'), 'no redirect on failure');
  });

  await scenario('unconfirmed email → verify message', {}, async ({ page }) => {
    await uiLogin(page, 'unconfirmed@ngd.test', 'Unconfirmed#12345');
    const text = await alertText(page, 'login-alert');
    expect(/verify your email/i.test(text), 'verify-email message, got: ' + text);
  });

  await scenario('customer login → account dashboard with profile data', {}, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    await page.waitForFunction(
      () => document.querySelector('[data-ngd-field="full_name"]').textContent.trim() !== '—'
    );
    const fields = await page.evaluate(() => ({
      name: document.querySelector('[data-ngd-field="full_name"]').textContent.trim(),
      email: document.querySelector('[data-ngd-field="email"]').textContent.trim(),
      company: document.querySelector('[data-ngd-field="company_name"]').textContent.trim(),
      role: document.querySelector('[data-ngd-field="role"]').textContent.trim(),
      visible: document.body.style.visibility,
    }));
    expect(fields.name === 'Chetan Customer', 'full name shown, got ' + fields.name);
    expect(fields.email === 'customer@ngd.test', 'email shown');
    expect(fields.company === 'Chetan Gems LLP', 'company shown');
    expect(fields.role === 'customer', 'role read from profiles table');
    expect(fields.visible === 'visible', 'guarded body revealed');
  });

  await scenario('admin login → admin dashboard', {}, async ({ page }) => {
    await uiLogin(page, 'admin@ngd.test', 'Admin#12345');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    await page.waitForFunction(
      () => document.querySelector('[data-ngd-field="full_name"]').textContent.trim() !== '—'
    );
    const name = await page.textContent('[data-ngd-field="full_name"]');
    expect(name.trim() === 'Asha Admin', 'admin name shown');
  });

  await scenario('suspended account → signed out + unavailable message', {}, async ({ page }) => {
    await uiLogin(page, 'suspended@ngd.test', 'Suspend#12345');
    const text = await alertText(page, 'login-alert');
    expect(
      text.includes('Your account is currently unavailable. Please contact support.'),
      'exact unavailable message, got: ' + text
    );
    expect(page.url().endsWith('/login.html'), 'stays on login page');
    const session = await page.evaluate(async () => (await window.ngdSupabase.auth.getSession()).data.session);
    expect(session === null, 'session cleared after suspension block');
  });

  await scenario('inactive account → signed out + unavailable message', {}, async ({ page }) => {
    await uiLogin(page, 'inactive@ngd.test', 'Inactive#12345');
    const text = await alertText(page, 'login-alert');
    expect(/currently unavailable/i.test(text), 'unavailable message, got: ' + text);
    const session = await page.evaluate(async () => (await window.ngdSupabase.auth.getSession()).data.session);
    expect(session === null, 'session cleared');
  });

  await scenario('missing profile → signed out + safe message', {}, async ({ page }) => {
    await uiLogin(page, 'noprofile@ngd.test', 'NoProfile#12345');
    const text = await alertText(page, 'login-alert');
    expect(/could not load your account details/i.test(text), 'missing-profile message, got: ' + text);
    const session = await page.evaluate(async () => (await window.ngdSupabase.auth.getSession()).data.session);
    expect(session === null, 'session cleared');
  });

  await scenario('auth network failure → friendly error', { failToken: true }, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    const text = await alertText(page, 'login-alert');
    expect(/unable to reach|connection/i.test(text), 'network message, got: ' + text);
    await page.waitForFunction(() => !document.getElementById('login-submit').disabled);
  });

  await scenario('signup validation: mismatched passwords blocked locally', {}, async ({ page, backend }) => {
    await page.goto(SITE + '/register.html', { waitUntil: 'networkidle' });
    await page.fill('#reg-full-name', 'Nia New');
    await page.fill('#reg-email', 'nia@ngd.test');
    await page.fill('#reg-phone', '+919876543210');
    await page.selectOption('#reg-country', 'India');
    await page.fill('#reg-password', 'Password#123');
    await page.fill('#reg-confirm', 'Different#123');
    await page.check('#reg-terms');
    await page.click('#register-submit');
    await page.waitForFunction(() =>
      document.getElementById('ngd-register-form').classList.contains('was-validated')
    );
    expect(await page.$eval('#reg-confirm', (el) => !el.checkValidity()), 'confirm field flagged invalid');
    expect(backend.signups.length === 0, 'no signup request sent');
  });

  await scenario('signup (email confirmation ON) → exact verify message + safe metadata only', {}, async ({ page, backend }) => {
    await page.goto(SITE + '/register.html', { waitUntil: 'networkidle' });
    await page.fill('#reg-full-name', 'Nia New');
    await page.fill('#reg-company', 'Nia Jewels');
    await page.fill('#reg-email', 'nia@ngd.test');
    await page.fill('#reg-phone', '+919876543210');
    await page.selectOption('#reg-country', 'India');
    await page.fill('#reg-password', 'Password#123');
    await page.fill('#reg-confirm', 'Password#123');
    await page.check('#reg-terms');
    await page.click('#register-submit');
    const text = await alertText(page, 'register-alert');
    expect(
      text === 'Account created. Please check your email to verify your account.',
      'exact confirmation message, got: ' + text
    );
    expect(backend.signups.length === 1, 'one signup request');
    const sent = backend.signups[0];
    const keys = Object.keys(sent.data || {}).sort();
    expect(
      JSON.stringify(keys) === JSON.stringify(['company_name', 'country', 'full_name', 'phone']),
      'metadata keys exactly full_name/company_name/phone/country, got ' + keys.join(',')
    );
    expect(!('role' in (sent.data || {})), 'no role in metadata');
    expect(!('role' in sent), 'no role at top level');
    expect((await page.$eval('#reg-email', (el) => el.value)) === '', 'form reset after success');
  });

  await scenario('signup with existing email → already-exists message', {}, async ({ page }) => {
    await page.goto(SITE + '/register.html', { waitUntil: 'networkidle' });
    await page.fill('#reg-full-name', 'Chetan Again');
    await page.fill('#reg-email', 'customer@ngd.test');
    await page.fill('#reg-phone', '+912222222222');
    await page.selectOption('#reg-country', 'Belgium');
    await page.fill('#reg-password', 'Password#123');
    await page.fill('#reg-confirm', 'Password#123');
    await page.check('#reg-terms');
    await page.click('#register-submit');
    const text = await alertText(page, 'register-alert');
    expect(/already exists/i.test(text), 'already-exists message, got: ' + text);
  });

  await scenario('signup (confirmation OFF, session returned) → customer dashboard', { autoconfirm: true }, async ({ page }) => {
    await page.goto(SITE + '/register.html', { waitUntil: 'networkidle' });
    await page.fill('#reg-full-name', 'Auto Confirmed');
    await page.fill('#reg-email', 'auto@ngd.test');
    await page.fill('#reg-phone', '+911234567890');
    await page.selectOption('#reg-country', 'Singapore');
    await page.fill('#reg-password', 'Password#123');
    await page.fill('#reg-confirm', 'Password#123');
    await page.check('#reg-terms');
    await page.click('#register-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    await page.waitForFunction(
      () => document.querySelector('[data-ngd-field="full_name"]').textContent.trim() !== '—'
    );
    const name = await page.textContent('[data-ngd-field="full_name"]');
    expect(name.trim() === 'Auto Confirmed', 'new customer profile shown');
  });

  await scenario('guard: customer dashboard without session → login', {}, async ({ page }) => {
    await page.goto(SITE + '/account/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('guard: admin dashboard without session → login', {}, async ({ page }) => {
    await page.goto(SITE + '/admin/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('guard: customer visiting admin page → own dashboard', {}, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    await page.goto(SITE + '/admin/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('signed-in customer on login page → customer dashboard', {}, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('signed-in admin on login page → admin dashboard', {}, async ({ page }) => {
    await uiLogin(page, 'admin@ngd.test', 'Admin#12345');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
  });

  await scenario('logout → login page notice; dashboard locked afterwards', {}, async ({ page }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    await page.click('[data-ngd-logout]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
    const text = await alertText(page, 'login-alert');
    expect(/signed out/i.test(text), 'signed-out notice, got: ' + text);
    const session = await page.evaluate(async () => (await window.ngdSupabase.auth.getSession()).data.session);
    expect(session === null, 'session gone after logout');
    await page.goto(SITE + '/account/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('refresh keeps the admin session; header shows real name, email and role', {}, async ({ page }) => {
    await uiLogin(page, 'admin@ngd.test', 'Admin#12345');
    await page.waitForURL('**/admin/dashboard.html', { timeout: 8000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      getComputedStyle(document.body).visibility === 'visible', null, { timeout: 8000 });
    const state = await page.evaluate(() => ({
      url: location.pathname,
      topbar: document.getElementById('admin-profile-area').textContent.replace(/\s+/g, ' '),
    }));
    expect(/admin\/dashboard\.html$/.test(state.url), 'still on the dashboard after refresh');
    expect(/Asha Admin/.test(state.topbar) && /admin@ngd\.test/.test(state.topbar) &&
      /Administrator/.test(state.topbar),
      'header shows the real full name, email and role, got ' + state.topbar);
  });

  await scenario('account suspended mid-session → signed out on next guard', {}, async ({ page, backend }) => {
    await uiLogin(page, 'customer@ngd.test', 'Customer#12345');
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
    backend.users['customer@ngd.test'].profile.account_status = 'suspended';
    await page.reload({ waitUntil: 'domcontentloaded' }).catch((err) => {
      /* the suspension guard's own redirect can supersede the reload
         mid-flight — that abort IS the behaviour under test */
      if (!/ERR_ABORTED|frame was detached/i.test(String(err))) throw err;
    });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    const text = await alertText(page, 'login-alert');
    expect(/currently unavailable/i.test(text), 'unavailable notice after mid-session suspension');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} auth scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
