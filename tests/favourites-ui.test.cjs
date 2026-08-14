/* ============================================================
   Customer Favourites UI tests (STEP 21).
   Logs in against the compact mocked Supabase backend, then
   verifies the favourites page: shared dashboard shell with the
   Favourites route active, the demo notice, mixed diamond +
   jewellery cards with their spec fields and paired
   View/Remove actions, tabs, search, sort, the honest
   demo-only removal with Undo, the exact empty-state copy with
   both CTAs, the no-session guard and layouts at 1440/768/390.
   Run:  node tests/favourites-ui.test.cjs
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

const USER = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'customer@ngd.test',
  password: 'Customer#12345',
  profile: {
    role: 'customer', account_status: 'active',
    full_name: 'Chetan Customer', company_name: 'Chetan Gems LLP', phone: '+912222222222',
  },
};

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function makeJwt() {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ sub: USER.id, email: USER.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.testsig';
}
function userObject() {
  return {
    id: USER.id, aud: 'authenticated', role: 'authenticated', email: USER.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: USER.profile.full_name },
    identities: [{ identity_id: 'ii-1', id: USER.id, user_id: USER.id, provider: 'email', identity_data: { email: USER.email, sub: USER.id }, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-01-01T00:00:00Z' }],
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
      (body.email === USER.email && body.password === USER.password);
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
    const row = { id: USER.id, email: USER.email, ...USER.profile, created_at: '2026-01-01T00:00:00Z' };
    const accept = req.headers()['accept'] || '';
    if (accept.includes('vnd.pgrst.object')) return json(200, row);
    return json(200, [row]);
  }
  return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
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

async function openFavourites(page) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', USER.email);
  await page.fill('#login-password', USER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/account/favourites.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('#fav-grid article').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell reused: sidebar with Favourites active, title, honest demo notice', {}, async (page) => {
    await openFavourites(page);
    const state = await page.evaluate(() => ({
      topbar: !!document.querySelector('.ngd-dash-topbar [data-ngd-logout]'),
      active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-dash-route'),
      dashboardHref: document.querySelector('.ngd-dash-nav a[data-dash-route="dashboard"]').getAttribute('href'),
      soon: document.querySelectorAll('.ngd-dash-nav .is-soon').length,
      title: document.querySelector('h1').textContent.trim(),
      notice: document.getElementById('fav-demo-note').textContent,
      visible: getComputedStyle(document.body).visibility === 'visible',
    }));
    expect(state.visible, 'guard passed and revealed the page');
    expect(state.topbar, 'shared topbar present');
    expect(state.active === 'favourites', 'Favourites route active, got ' + state.active);
    expect(state.dashboardHref === 'dashboard.html', 'sidebar routes back to the dashboard');
    expect(state.soon === 2, 'Soon items preserved');
    expect(state.title === 'My Favourites', 'page title, got ' + state.title);
    expect(/demo preview/i.test(state.notice) && /nothing is saved or deleted/i.test(state.notice),
      'honest demo notice present');
  });

  await scenario('mixed demo cards carry every spec field and paired actions', {}, async (page) => {
    await openFavourites(page);
    const state = await page.evaluate(() => {
      const dCard = document.querySelector('[data-fav-type="diamond"]');
      const jCard = document.querySelector('[data-fav-type="jewellery"]');
      const dTerms = [...dCard.querySelectorAll('dt')].map((t) => t.textContent.trim());
      return {
        total: document.querySelectorAll('#fav-grid article').length,
        diamonds: document.querySelectorAll('[data-fav-type="diamond"]').length,
        pieces: document.querySelectorAll('[data-fav-type="jewellery"]').length,
        chips: document.querySelectorAll('#fav-grid .ngd-fav-chip').length,
        dArt: !!dCard.querySelector('.ngd-diamond-media svg'),
        dStock: dCard.querySelector('.ngd-stock-no').textContent.trim(),
        dTerms,
        dView: dCard.querySelector('a.ngd-btn').getAttribute('href'),
        dRemove: !!dCard.querySelector('[data-fav-remove]'),
        jArt: !!jCard.querySelector('.ngd-jewel-figure svg'),
        jName: jCard.querySelector('.ngd-jewel-name').textContent.trim().length,
        jCat: jCard.querySelector('.ngd-jewel-cat').textContent.trim().length,
        jWeight: !!jCard.querySelector('.ngd-weight-chip'),
        jAvail: !!jCard.querySelector('.ngd-avail'),
        jView: jCard.querySelector('a.ngd-btn').getAttribute('href'),
        jRemove: !!jCard.querySelector('[data-fav-remove]'),
        count: document.getElementById('fav-count').textContent,
      };
    });
    expect(state.total === 7 && state.diamonds === 4 && state.pieces === 3,
      'seven demo favourites (4 + 3), got ' + state.total);
    expect(state.chips === 7, 'every card chipped Demo');
    expect(state.dArt && /^NGD-\d+$/.test(state.dStock), 'diamond art + stock number');
    expect(['Shape', 'Carat', 'Colour', 'Clarity', 'Laboratory'].every((t) => state.dTerms.includes(t)),
      'diamond spec fields, got ' + state.dTerms.join(','));
    expect(/^\.\.\/diamond-details\.html\?id=NGD-/.test(state.dView), 'diamond View Details link');
    expect(state.jArt && state.jName > 3 && state.jCat > 3, 'jewellery art, name and category');
    expect(state.jWeight && state.jAvail, 'jewellery weight + availability');
    expect(/^\.\.\/jewellery-details\.html\?id=JW-/.test(state.jView), 'jewellery View Details link');
    expect(state.dRemove && state.jRemove, 'Remove button on both card types');
    expect(/Showing 7 of 7/.test(state.count), 'result count, got ' + state.count);
  });

  await scenario('tabs filter by type and move the active chip', {}, async (page) => {
    await openFavourites(page);
    await page.click('[data-fav-tab="diamond"]');
    let state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      jewels: document.querySelectorAll('[data-fav-type="jewellery"]').length,
      active: document.querySelector('#fav-tabs .is-active').getAttribute('data-fav-tab'),
      pressed: document.querySelector('[data-fav-tab="diamond"]').getAttribute('aria-pressed'),
    }));
    expect(state.cards === 4 && state.jewels === 0, 'diamonds tab shows only diamonds');
    expect(state.active === 'diamond' && state.pressed === 'true', 'active chip follows');
    await page.click('[data-fav-tab="jewellery"]');
    state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      diamonds: document.querySelectorAll('[data-fav-type="diamond"]').length,
    }));
    expect(state.cards === 3 && state.diamonds === 0, 'jewellery tab shows only pieces');
    await page.click('[data-fav-tab="all"]');
    state = await page.evaluate(() => ({ cards: document.querySelectorAll('#fav-grid article').length }));
    expect(state.cards === 7, 'All restores the full set');
  });

  await scenario('search narrows across both types; clear-search recovers', {}, async (page) => {
    await openFavourites(page);
    await page.fill('#fav-search', 'NGD-1007');
    let state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      id: document.querySelector('#fav-grid article').getAttribute('data-fav-id'),
    }));
    expect(state.cards === 1 && state.id === 'NGD-1007', 'stock-number search finds the stone');
    await page.fill('#fav-search', 'zzz-nothing');
    state = await page.evaluate(() => ({
      noMatch: !document.getElementById('fav-no-match').hidden,
      empty: document.getElementById('fav-empty').hidden,
    }));
    expect(state.noMatch && state.empty, 'no-match message shown, true empty state reserved');
    await page.click('#fav-clear-search');
    state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      value: document.getElementById('fav-search').value,
    }));
    expect(state.cards === 7 && state.value === '', 'clear search restores everything');
  });

  await scenario('sort by carat orders mixed favourites', {}, async (page) => {
    await openFavourites(page);
    await page.selectOption('#fav-sort', 'carat-desc');
    const carats = await page.evaluate(() =>
      [...document.querySelectorAll('#fav-grid article')].map((card) => {
        const chip = card.querySelector('.ngd-diamond-carat, .ngd-weight-chip');
        return chip ? parseFloat(chip.textContent) : 0;
      }));
    const sorted = [...carats].sort((a, b) => b - a);
    expect(JSON.stringify(carats) === JSON.stringify(sorted),
      'descending carat order, got ' + carats.join(','));
  });

  await scenario('remove updates only the demo preview, with honest toast and Undo', {}, async (page) => {
    await openFavourites(page);
    await page.click('[data-fav-id="NGD-1007"] [data-fav-remove]');
    let state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      gone: !document.querySelector('[data-fav-id="NGD-1007"]'),
      toast: document.querySelector('#fav-toast .ngd-alert').textContent,
      count: document.getElementById('fav-count').textContent,
    }));
    expect(state.cards === 6 && state.gone, 'card removed from the preview');
    expect(/demo preview/i.test(state.toast) && /nothing was saved or deleted/i.test(state.toast),
      'honest removal message, got: ' + state.toast);
    expect(/Showing 6 of 6/.test(state.count), 'count follows, got ' + state.count);
    await page.click('#fav-undo');
    state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      back: !!document.querySelector('[data-fav-id="NGD-1007"]'),
      toastGone: !document.querySelector('#fav-toast .ngd-alert'),
    }));
    expect(state.cards === 7 && state.back && state.toastGone, 'Undo restores the item');
  });

  await scenario('removing everything reveals the exact empty state with both CTAs', {}, async (page) => {
    await openFavourites(page);
    for (let i = 0; i < 7; i++) {
      await page.click('#fav-grid article [data-fav-remove]');
      await page.waitForTimeout(60);
    }
    const state = await page.evaluate(() => ({
      empty: !document.getElementById('fav-empty').hidden,
      copy: document.querySelector('#fav-empty h2').textContent.trim(),
      ctas: [...document.querySelectorAll('#fav-empty a.ngd-btn')].map((a) => a.textContent.trim()),
      count: document.getElementById('fav-count').textContent,
    }));
    expect(state.empty, 'true empty state shown');
    expect(/^You haven.t saved any favourites yet\.$/.test(state.copy),
      'exact empty copy, got ' + state.copy);
    expect(JSON.stringify(state.ctas) === JSON.stringify(['Explore Diamonds', 'Explore Jewellery']),
      'both CTAs present, got ' + state.ctas.join(','));
    expect(/No favourites/.test(state.count), 'count reads empty');
    await page.click('#fav-empty a[href="../diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('View Details opens the catalogue detail page', {}, async (page) => {
    await openFavourites(page);
    await page.click('[data-fav-id="NGD-1007"] a.ngd-btn');
    await page.waitForURL('**/diamond-details.html?id=NGD-1007', { timeout: 8000 });
    const stock = await page.evaluate(() =>
      document.body.textContent.includes('NGD-1007'));
    expect(stock, 'details page shows the stone');
  });

  await scenario('guard: favourites without a session redirects to login', {}, async (page) => {
    await page.goto(SITE + '/account/favourites.html', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('mobile 390: drawer shell, single-column cards, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openFavourites(page);
    const state = await page.evaluate(() => {
      /* measure the grid columns — the articles inside carry hover/tilt
         transforms that can nudge their rects by a few pixels */
      const cols = [...document.querySelectorAll('#fav-grid > div')];
      const cards = [...document.querySelectorAll('#fav-grid article')];
      return {
        burger: getComputedStyle(document.querySelector('.ngd-burger-btn')).display !== 'none',
        perRow: cols.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cols[0].getBoundingClientRect().top) < 4).length,
        removeH: cards[0].querySelector('[data-fav-remove]').getBoundingClientRect().height,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.burger, 'drawer burger on mobile');
    expect(state.perRow === 1, 'single-column cards, got ' + state.perRow);
    expect(state.removeH >= 36, 'touch-sized remove button');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'favourites-mobile.png') });
  });

  await scenario('tablet 768 two cards per row; desktop 1440 four per row', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openFavourites(page);
    /* measure the grid columns, not the articles — card hover/tilt
       transforms can nudge article rects by a few pixels */
    const perRow = () => page.evaluate(() => {
      const cols = [...document.querySelectorAll('#fav-grid > div')];
      return {
        perRow: cols.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cols[0].getBoundingClientRect().top) < 4).length,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    let o = await perRow();
    expect(o.perRow === 2, 'two cards per row at 768, got ' + o.perRow);
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    o = await perRow();
    expect(o.perRow === 4, 'four cards per row at 1440, got ' + o.perRow);
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'favourites-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} favourites-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
