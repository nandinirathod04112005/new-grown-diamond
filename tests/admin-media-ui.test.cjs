/* ============================================================
   Admin Media Library tests (LIVE).
   Logs in against a compact mocked Supabase backend and drives
   admin/media.html: the shared shell with Media live in the
   sidebar (no Soon chip), the seeded grid from the site-media
   bucket with name/size/date/category and measured dimensions,
   search + category filters, drag-drop/click upload with
   client-side type & size validation, sanitized filenames,
   duplicate handling, copy-public-URL, confirmed delete, the
   role guards and refresh persistence.
   Run:  node tests/admin-media-ui.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

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

function seedSet() {
  return {
    homepage: [
      { name: 'hero-velvet.webp', created_at: '2026-08-18T10:00:00Z', metadata: { size: 250000, mimetype: 'image/webp' } },
    ],
    diamonds: [
      { name: 'loose-stones.jpg', created_at: '2026-08-15T10:00:00Z', metadata: { size: 1536000, mimetype: 'image/jpeg' } },
    ],
    about: [
      { name: 'atelier-team.png', created_at: '2026-08-12T10:00:00Z', metadata: { size: 51200, mimetype: 'image/png' } },
    ],
  };
}

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
let uploadCalls = [];
let deleteCalls = [];
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
    /* ---- site-media Storage API ---- */
    if (url.pathname === '/storage/v1/object/list/site-media' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const folder = String(body.prefix || '').replace(/\/$/, '');
      return json(200, opts.seeds[folder] || []);
    }
    if (url.pathname.startsWith('/storage/v1/object/site-media/') && method === 'POST') {
      const path = url.pathname.replace('/storage/v1/object/site-media/', '');
      if (opts.duplicatePath === path) {
        return json(400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
      }
      uploadCalls.push({ path, contentType: req.headers()['content-type'] || '' });
      const folder = path.split('/')[0];
      const name = path.split('/').slice(1).join('/');
      (opts.seeds[folder] = opts.seeds[folder] || []).unshift(
        { name, created_at: '2026-08-20T12:00:00Z', metadata: { size: PNG_1PX.length, mimetype: 'image/png' } });
      return json(200, { Key: 'site-media/' + path });
    }
    if (url.pathname === '/storage/v1/object/site-media' && method === 'DELETE') {
      const body = JSON.parse(req.postData() || '{}');
      deleteCalls.push(body.prefixes || []);
      (body.prefixes || []).forEach((p) => {
        const folder = p.split('/')[0];
        const name = p.split('/').slice(1).join('/');
        opts.seeds[folder] = (opts.seeds[folder] || []).filter((row) => row.name !== name);
      });
      return json(200, [{ name: 'deleted' }]);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/site-media/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    /* Dashboard widgets probed on the login hop — harmless empty data. */
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
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: (text) => { window.__copied = text; return Promise.resolve(); } },
        configurable: true,
      });
    });
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(user, {
      seeds: opts.seeds || seedSet(),
      duplicatePath: opts.duplicatePath || '',
    }));
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

async function openMedia(page, user, waitFor) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/media.html', { waitUntil: 'domcontentloaded' });
  if (waitFor === 'empty') {
    await page.waitForFunction(() => !document.getElementById('med-stage-empty').hidden);
  } else {
    await page.waitForFunction(() => document.querySelectorAll('#med-grid article').length > 0);
  }
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell: Media live in the sidebar (no Soon chip), seeded grid with real metadata', {}, async (page, user) => {
    await openMedia(page, user);
    const state = await page.evaluate(() => {
      const mediaNav = document.querySelector('.ngd-dash-nav [data-admin-route="media"]');
      const cards = [...document.querySelectorAll('#med-grid article')];
      const hero = cards.find((c) => /hero-velvet/.test(c.textContent));
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        navIsLink: mediaNav.tagName === 'A' && mediaNav.getAttribute('href') === 'media.html',
        navActive: mediaNav.classList.contains('is-active'),
        navSoon: !!mediaNav.querySelector('.ngd-soon-chip'),
        soonCount: document.querySelectorAll('.ngd-dash-nav .is-soon').length,
        cards: cards.length,
        heroMeta: hero.querySelector('.ngd-media-meta').textContent,
        heroName: hero.querySelector('.ngd-media-name').textContent.trim(),
        count: document.getElementById('med-count').textContent.trim(),
        loadingHidden: document.getElementById('med-stage-loading').hidden,
        copyBtn: !!hero.querySelector('[data-med-copy]'),
        deleteBtn: !!hero.querySelector('[data-med-delete]'),
      };
    });
    expect(state.visible, 'admin guard passed and revealed the page');
    expect(state.navIsLink && state.navActive && !state.navSoon, 'Media is a live, active sidebar route without a Soon chip');
    expect(state.soonCount === 2, 'Settings and Users stay honestly Soon, got ' + state.soonCount);
    expect(state.cards === 3, 'three seeded files render, got ' + state.cards);
    expect(state.heroName === 'hero-velvet.webp', 'file name shown');
    expect(/Homepage/.test(state.heroMeta) && /0\.24 MB|244 KB/.test(state.heroMeta) && /2026/.test(state.heroMeta),
      'category, size and upload date shown, got ' + state.heroMeta);
    expect(state.copyBtn && state.deleteBtn, 'copy + delete actions on every card');
    expect(state.count === '3 of 3 files', 'honest count, got ' + state.count);
    expect(state.loadingHidden, 'loading stage cleared');
  });

  await scenario('thumbnails load from the public bucket and report their dimensions', {}, async (page, user) => {
    await openMedia(page, user);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-med-dim]')].some((d) => /×/.test(d.textContent)));
    const state = await page.evaluate(() => ({
      src: document.querySelector('#med-grid .ngd-media-thumb img').getAttribute('src'),
      dim: [...document.querySelectorAll('[data-med-dim]')].map((d) => d.textContent),
    }));
    expect(/\/storage\/v1\/object\/public\/site-media\//.test(state.src), 'thumbs come from the public site-media bucket');
    expect(state.dim.some((d) => d === '1×1'), 'image dimensions measured, got ' + state.dim.join(','));
  });

  await scenario('search and category filters narrow the library; clear restores', {}, async (page, user) => {
    await openMedia(page, user);
    await page.fill('#med-search', 'atelier');
    let n = await page.evaluate(() => document.querySelectorAll('#med-grid article').length);
    expect(n === 1, 'search narrows by file name, got ' + n);
    await page.fill('#med-search', '');
    await page.selectOption('#med-category', 'diamonds');
    n = await page.evaluate(() => document.querySelectorAll('#med-grid article').length);
    expect(n === 1, 'category filter narrows, got ' + n);
    await page.fill('#med-search', 'zzz-nothing');
    const noMatch = await page.evaluate(() => !document.getElementById('med-no-match').hidden);
    expect(noMatch, 'no-match stage for a dead-end filter');
    await page.click('#med-clear');
    n = await page.evaluate(() => document.querySelectorAll('#med-grid article').length);
    expect(n === 3, 'clear restores everything, got ' + n);
  });

  await scenario('upload: sanitized name into the chosen category, then listed after reload', {}, async (page, user) => {
    uploadCalls = [];
    await openMedia(page, user);
    await page.selectOption('#med-upload-category', 'homepage');
    await page.setInputFiles('#med-file-input', {
      name: 'Hero Banner (Final).PNG', mimeType: 'image/png', buffer: PNG_1PX,
    });
    await page.waitForSelector('#med-toast .ngd-alert-success', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      toast: document.querySelector('#med-toast .ngd-alert-success').textContent,
      names: [...document.querySelectorAll('.ngd-media-name')].map((n) => n.textContent.trim()),
      count: document.getElementById('med-count').textContent.trim(),
    }));
    expect(uploadCalls.length === 1 && uploadCalls[0].path === 'homepage/hero-banner-final.png',
      'uploaded with a sanitized name into the chosen folder, got ' + JSON.stringify(uploadCalls));
    expect(/image\/png|multipart\/form-data/.test(uploadCalls[0].contentType),
      'original content type carried (directly or as the multipart part), got ' + uploadCalls[0].contentType);
    expect(/1 image uploaded to Homepage/.test(state.toast), 'honest success toast, got ' + state.toast);
    expect(state.names.includes('hero-banner-final.png'), 'library re-listed and shows the new file');
    expect(state.count === '4 of 4 files', 'count follows, got ' + state.count);
  });

  await scenario('upload rejects wrong types and oversized files client-side', {}, async (page, user) => {
    uploadCalls = [];
    await openMedia(page, user);
    await page.setInputFiles('#med-file-input', [
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
      { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024) },
    ]);
    await page.waitForSelector('#med-toast .ngd-alert-danger', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#med-toast .ngd-alert-danger').textContent);
    expect(/notes\.txt.*not a supported image/.test(toast), 'wrong type named honestly, got ' + toast);
    expect(/huge\.png.*limit is 5 MB/.test(toast), 'oversized file named honestly');
    expect(uploadCalls.length === 0, 'nothing was sent to Storage');
  });

  await scenario('duplicate filename: honest error, nothing overwritten', {
    duplicatePath: 'general/twice.png',
  }, async (page, user) => {
    uploadCalls = [];
    await openMedia(page, user);
    await page.selectOption('#med-upload-category', 'general');
    await page.setInputFiles('#med-file-input', { name: 'twice.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.waitForSelector('#med-toast .ngd-alert-danger', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#med-toast .ngd-alert-danger').textContent);
    expect(/twice\.png.*already exists in General/.test(toast), 'duplicate named honestly, got ' + toast);
    expect(uploadCalls.length === 0, 'the existing file was never overwritten');
  });

  await scenario('copy URL puts the public link on the clipboard', {}, async (page, user) => {
    await openMedia(page, user);
    await page.click('#med-grid article [data-med-copy]');
    const state = await page.evaluate(() => ({
      copied: window.__copied,
      label: document.querySelector('#med-grid article [data-med-copy]').textContent.trim(),
    }));
    expect(/\/storage\/v1\/object\/public\/site-media\/(homepage|diamonds|about)\//.test(state.copied || ''),
      'public URL copied, got ' + state.copied);
    expect(state.label === 'Copied ✓', 'button confirms the copy');
  });

  await scenario('delete asks for confirmation, sends the real remove, dismiss sends nothing', {}, async (page, user) => {
    deleteCalls = [];
    await openMedia(page, user);
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.click('[data-med-delete="diamonds/loose-stones.jpg"]');
    await page.waitForTimeout(300);
    expect(deleteCalls.length === 0, 'dismissing the confirm deletes nothing');
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('[data-med-delete="diamonds/loose-stones.jpg"]');
    await page.waitForFunction(() => document.querySelectorAll('#med-grid article').length === 2);
    const state = await page.evaluate(() => ({
      gone: !document.querySelector('[data-med-delete="diamonds/loose-stones.jpg"]'),
      toast: document.querySelector('#med-toast .ngd-alert-success').textContent,
      count: document.getElementById('med-count').textContent.trim(),
    }));
    expect(deleteCalls.length === 1 && deleteCalls[0][0] === 'diamonds/loose-stones.jpg',
      'exactly one remove for the exact path, got ' + JSON.stringify(deleteCalls));
    expect(state.gone && /deleted/.test(state.toast), 'card removed with an honest toast');
    expect(state.count === '2 of 2 files', 'count follows, got ' + state.count);
  });

  await scenario('guard: no session goes to login; customer is turned away', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/admin/media.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/media.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await scenario('empty library shows the inviting empty stage', {
    seeds: {},
  }, async (page, user) => {
    await openMedia(page, user, 'empty');
    const state = await page.evaluate(() => ({
      empty: !document.getElementById('med-stage-empty').hidden,
      count: document.getElementById('med-count').textContent.trim(),
    }));
    expect(state.empty, 'empty stage shown');
    expect(state.count === 'No files yet', 'count reads empty, got ' + state.count);
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-media scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
