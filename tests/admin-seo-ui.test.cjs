/* ============================================================
   Admin SEO Manager tests (LIVE).
   Logs in against a compact mocked Supabase backend and drives
   admin/seo.html: SEO live in the sidebar (no Soon chip, two
   honest Soon items left), the registry-driven page table with
   Live / Inactive / Built-in state, indexing chips and length
   badges, built-in prefill for unsaved pages, edit + upsert-by-
   key saving with persistence after a full reload, Cancel, hard
   validation (missing title/description, non-absolute canonical,
   unsafe image URLs) vs length guidance that warns but never
   blocks, the live SERP + social previews, the site-media picker
   and the role guards.
   Run:  node tests/admin-seo-ui.test.cjs
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
    if (url.pathname === '/rest/v1/seo_pages' && method === 'GET') {
      return json(200, opts.rows);
    }
    if (url.pathname === '/rest/v1/seo_pages' && method === 'POST') {
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

async function openSeo(page, user) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', user.email);
  await page.fill('#login-password', user.password);
  await page.click('#login-submit');
  await page.waitForURL('**/admin/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/admin/seo.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-seo-open]').length > 0);
}

const IN_RANGE_TITLE = 'Lab-Grown Diamond Atelier — Craft, Care & Certification'; // 55 ch
const IN_RANGE_DESC = 'From plasma reactor to polishing wheel — meet the certified lab-grown diamonds and the people who grow, cut and grade them at New Grown Diamond.'; // 144 ch

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell + table: SEO live in the sidebar, nine pages with honest state and lengths', {
    rows: [
      { key: 'about', title: 'Our Atelier — New Grown Diamond', meta_description: 'Saved description.', robots_index: true, robots_follow: true, active: true, updated_at: '2026-08-20T09:00:00Z' },
      { key: 'contact', title: 'Contact — New Grown Diamond', meta_description: 'Reach the atelier.', robots_index: false, robots_follow: true, active: true, updated_at: '2026-08-20T09:00:00Z' },
    ],
  }, async (page, user) => {
    await openSeo(page, user);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.ngd-dash-nav [data-admin-route="seo"]');
      const rows = [...document.querySelectorAll('#seo-list tr')];
      const rowFor = (label) => rows.find((r) => r.textContent.includes(label));
      return {
        visible: getComputedStyle(document.body).visibility === 'visible',
        navIsLink: nav.tagName === 'A' && nav.getAttribute('href') === 'seo.html',
        navActive: nav.classList.contains('is-active'),
        navSoon: !!nav.querySelector('.ngd-soon-chip'),
        soonCount: document.querySelectorAll('.ngd-dash-nav .is-soon').length,
        pages: rows.length,
        editButtons: document.querySelectorAll('[data-seo-open]').length,
        aboutLive: /Live/.test(rowFor('About').textContent) && /Index/.test(rowFor('About').textContent),
        contactNoindex: /Noindex/.test(rowFor('Contact').textContent),
        builtIn: rows.filter((r) => /Built-in/.test(r.textContent)).length,
        badges: rows.every((r) => /\d+ ch/.test(r.textContent)),
      };
    });
    expect(state.visible, 'admin guard passed');
    expect(state.navIsLink && state.navActive && !state.navSoon, 'SEO is a live, active route without a Soon chip');
    expect(state.soonCount === 1, 'Users & Roles stays honestly Soon, got ' + state.soonCount);
    expect(state.pages === 9 && state.editButtons === 9, 'all nine registry pages listed, got ' + state.pages);
    expect(state.aboutLive, 'a saved active record shows Live + Index');
    expect(state.contactNoindex, 'robots_index=false shows Noindex');
    expect(state.builtIn === 7, 'unsaved pages say Built-in, got ' + state.builtIn);
    expect(state.badges, 'every page row shows title/description length badges');
  });

  await scenario('unsaved pages prefill the editor from their real built-in tags', {}, async (page, user) => {
    await openSeo(page, user);
    await page.click('[data-seo-open="about"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    const state = await page.evaluate(() => ({
      pageName: document.getElementById('seo-f-page_name').value,
      title: document.getElementById('seo-f-title').value,
      description: document.getElementById('seo-f-meta_description').value,
      updated: document.getElementById('seo-form-updated').textContent,
      serpTitle: document.getElementById('seo-serp-title').textContent,
      serpUrl: document.getElementById('seo-serp-url').textContent,
      schemas: document.getElementById('seo-form-schemas').textContent,
      indexOn: document.getElementById('seo-f-robots_index').checked,
      followOn: document.getElementById('seo-f-robots_follow').checked,
    }));
    expect(state.pageName === 'About' && state.title === 'Know About Us | New Grown Diamond',
      'built-in title prefilled, got ' + state.title);
    expect(/Surat-based lab-grown diamond manufacturer/.test(state.description), 'built-in description prefilled');
    expect(/Not saved yet/.test(state.updated), 'honest unsaved stamp');
    expect(state.serpTitle === 'Know About Us | New Grown Diamond', 'SERP preview starts from the built-in title');
    expect(/your-domain\.com › about\.html/.test(state.serpUrl), 'SERP URL placeholder until a canonical is set');
    expect(/Breadcrumb/.test(state.schemas) && /no raw code/.test(state.schemas),
      'structured data is declared and honest about being generated');
    expect(state.indexOn && state.followOn, 'robots switches default to index, follow');
  });

  await scenario('edit + save upserts by key; a full reload restores the saved values', {}, async (page, user) => {
    saveCalls = [];
    await openSeo(page, user);
    await page.click('[data-seo-open="about"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    await page.fill('#seo-f-title', IN_RANGE_TITLE);
    await page.fill('#seo-f-meta_description', IN_RANGE_DESC);
    await page.fill('#seo-f-canonical_url', 'https://newgrowndiamond.example/about.html');
    await page.fill('#seo-f-og_title', 'Atelier OG');
    await page.uncheck('#seo-f-robots_index');
    await page.click('#seo-save');
    await page.waitForSelector('#seo-toast .ngd-alert-success', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#seo-toast .ngd-alert-success').textContent);
    expect(!/Heads-up/.test(toast), 'in-range lengths save without a warning, got ' + toast);
    expect(saveCalls.length === 1, 'exactly one upsert, got ' + saveCalls.length);
    const sent = saveCalls[0];
    expect(sent.key === 'about' && sent.title === IN_RANGE_TITLE && sent.meta_description === IN_RANGE_DESC &&
      sent.canonical_url === 'https://newgrowndiamond.example/about.html' && sent.og_title === 'Atelier OG' &&
      sent.robots_index === false && sent.robots_follow === true && sent.active === true &&
      sent.meta_keywords === null,
      'payload carries the stable key, edited fields, robots booleans and null empties: ' + JSON.stringify(sent));
    /* full reload — the mock's stored row must come back */
    await page.goto(SITE + '/admin/seo.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('[data-seo-open]').length > 0);
    const listed = await page.evaluate(() =>
      [...document.querySelectorAll('#seo-list tr')].find((r) => r.textContent.includes('About')).textContent);
    expect(/Live/.test(listed) && /Noindex/.test(listed), 'list shows Live + Noindex after the save');
    await page.click('[data-seo-open="about"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    const after = await page.evaluate(() => ({
      title: document.getElementById('seo-f-title').value,
      indexOn: document.getElementById('seo-f-robots_index').checked,
      updated: document.getElementById('seo-form-updated').textContent,
    }));
    expect(after.title === IN_RANGE_TITLE && after.indexOn === false, 'saved values survive a refresh');
    expect(/Saved/.test(after.updated), 'saved timestamp shown');
  });

  await scenario('Cancel restores the last saved values', {
    rows: [{ key: 'education', title: 'The saved education title', meta_description: 'Saved description.', robots_index: true, robots_follow: true, active: true, updated_at: '2026-08-20T09:00:00Z' }],
  }, async (page, user) => {
    saveCalls = [];
    await openSeo(page, user);
    await page.click('[data-seo-open="education"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    await page.fill('#seo-f-title', 'Something I typed and regret');
    await page.click('#seo-cancel');
    const value = await page.evaluate(() => document.getElementById('seo-f-title').value);
    expect(value === 'The saved education title', 'unsaved edit discarded, got ' + value);
    expect(saveCalls.length === 0, 'nothing was written');
  });

  await scenario('hard validation: missing title/description, relative canonical, unsafe image — nothing is sent', {}, async (page, user) => {
    saveCalls = [];
    await openSeo(page, user);
    await page.click('[data-seo-open="home"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    const dangerText = () => page.evaluate(() =>
      (document.querySelector('#seo-toast .ngd-alert-danger') || { textContent: '' }).textContent);

    await page.fill('#seo-f-title', '');
    await page.click('#seo-save');
    await page.waitForSelector('#seo-toast .ngd-alert-danger', { timeout: 5000 });
    expect(/SEO title is required/.test(await dangerText()), 'missing title refused');

    await page.fill('#seo-f-title', 'A perfectly fine homepage title');
    await page.fill('#seo-f-meta_description', '');
    await page.click('#seo-save');
    await page.waitForFunction(() => /description is required/.test((document.querySelector('#seo-toast .ngd-alert-danger') || { textContent: '' }).textContent));

    await page.fill('#seo-f-meta_description', 'A perfectly fine description.');
    await page.fill('#seo-f-canonical_url', 'index.html');
    await page.click('#seo-save');
    await page.waitForFunction(() => /full absolute address/.test((document.querySelector('#seo-toast .ngd-alert-danger') || { textContent: '' }).textContent));

    await page.fill('#seo-f-canonical_url', 'https://newgrowndiamond.example/index.html');
    await page.fill('#seo-f-og_image_url', 'javascript:alert(1)');
    await page.click('#seo-save');
    await page.waitForFunction(() => /Open Graph image/.test((document.querySelector('#seo-toast .ngd-alert-danger') || { textContent: '' }).textContent));

    expect(saveCalls.length === 0, 'no bad payload ever left the browser, got ' + saveCalls.length);
  });

  await scenario('length guidance warns but never blocks a save', {}, async (page, user) => {
    saveCalls = [];
    await openSeo(page, user);
    await page.click('[data-seo-open="manufacturing"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    await page.fill('#seo-f-title', 'Short');
    await page.fill('#seo-f-meta_description', 'Tiny.');
    const counters = await page.evaluate(() => ({
      title: document.getElementById('seo-count-title').className,
      desc: document.getElementById('seo-count-meta_description').className,
      titleText: document.getElementById('seo-count-title').textContent,
    }));
    expect(/is-warn/.test(counters.title) && /is-warn/.test(counters.desc),
      'out-of-range counters show the warning state');
    expect(/5 ch · aim for 50–60/.test(counters.titleText), 'counter says the honest count and range, got ' + counters.titleText);
    await page.click('#seo-save');
    await page.waitForSelector('#seo-toast .ngd-alert-success', { timeout: 5000 });
    const toast = await page.evaluate(() => document.querySelector('#seo-toast .ngd-alert-success').textContent);
    expect(saveCalls.length === 1, 'the save went through despite the warnings');
    expect(/Heads-up/.test(toast) && /50–60/.test(toast) && /140–160/.test(toast),
      'the success toast carries the length warnings, got ' + toast);
  });

  await scenario('SERP and social previews follow the fields live', {}, async (page, user) => {
    await openSeo(page, user);
    await page.click('[data-seo-open="diamonds"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    await page.fill('#seo-f-title', 'Certified Lab-Grown Diamonds — Full Inventory');
    await page.fill('#seo-f-meta_description', 'Search and compare every certified stone.');
    await page.fill('#seo-f-canonical_url', 'https://newgrowndiamond.example/diamonds.html');
    const serp = await page.evaluate(() => ({
      url: document.getElementById('seo-serp-url').textContent,
      title: document.getElementById('seo-serp-title').textContent,
      desc: document.getElementById('seo-serp-desc').textContent,
    }));
    expect(serp.url === 'newgrowndiamond.example › diamonds.html', 'SERP URL from the canonical, got ' + serp.url);
    expect(serp.title === 'Certified Lab-Grown Diamonds — Full Inventory', 'SERP title live');
    expect(serp.desc === 'Search and compare every certified stone.', 'SERP description live');
    /* OG card falls back through og → seo values */
    const og1 = await page.evaluate(() => document.getElementById('seo-og-title').textContent);
    expect(og1 === 'Certified Lab-Grown Diamonds — Full Inventory', 'OG preview falls back to the SEO title');
    await page.fill('#seo-f-og_title', 'Stones worth a closer look');
    const og2 = await page.evaluate(() => ({
      title: document.getElementById('seo-og-title').textContent,
      domain: document.getElementById('seo-og-domain').textContent,
    }));
    expect(og2.title === 'Stones worth a closer look', 'OG preview prefers the OG title');
    expect(og2.domain === 'NEWGROWNDIAMOND.EXAMPLE', 'OG domain from the canonical');
  });

  await scenario('media picker fills the share image from the site-media library with previews', {}, async (page, user) => {
    await openSeo(page, user);
    await page.click('[data-seo-open="home"]');
    await page.waitForSelector('#seo-form:not([hidden])');
    await page.click('[data-seo-pick="seo-f-og_image_url"]');
    await page.waitForSelector('#seo-media-picker:not([hidden])');
    await page.waitForSelector('[data-seo-choose]', { timeout: 5000 });
    await page.click('[data-seo-choose]');
    const state = await page.evaluate(() => ({
      value: document.getElementById('seo-f-og_image_url').value,
      inlineShown: !document.getElementById('seo-f-og_image_url-preview').hidden,
      cardImgShown: !document.getElementById('seo-og-img').hidden,
      cardImgSrc: document.getElementById('seo-og-img').getAttribute('src'),
      pickerHidden: document.getElementById('seo-media-picker').hidden,
    }));
    expect(/\/storage\/v1\/object\/public\/site-media\/homepage\/hero\.webp$/.test(state.value),
      'public media URL filled in, got ' + state.value);
    expect(state.inlineShown, 'inline preview under the field');
    expect(state.cardImgShown && state.cardImgSrc === state.value, 'the social card preview shows the picked image');
    expect(state.pickerHidden, 'picker closes after choosing');
  });

  await scenario('guard: no session goes to login; customer is turned away', { role: 'customer' }, async (page, user) => {
    await page.goto(SITE + '/admin/seo.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
    await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('#login-submit');
    await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
    await page.goto(SITE + '/admin/seo.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/account/dashboard.html', { timeout: 8000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} admin-seo scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
