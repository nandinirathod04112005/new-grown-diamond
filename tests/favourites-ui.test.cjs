/* ============================================================
   Customer Favourites page tests (LIVE).
   Logs in against the compact mocked Supabase backend, seeds
   /rest/v1/favourites with embedded diamond + jewellery records,
   then verifies: the shared dashboard shell with the Favourites
   route active and no demo notice, live mixed cards whose View
   Details links use immutable DIA-/JEW- public ids, tabs, search,
   sort by carat, the real RLS-scoped DELETE on remove (and the
   honest error path when it fails), the exact empty state, the
   no-session guard and layouts at 1440/768/390.
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

function dia(n, stock, publicId, carat, shape) {
  return {
    id: 'fav-d' + n, product_type: 'diamond',
    diamond_id: '00000000-0000-4000-9000-00000000000' + n, jewellery_id: null,
    created_at: '2026-08-0' + n + 'T10:00:00Z',
    jewellery: null,
    diamonds: {
      id: '00000000-0000-4000-9000-00000000000' + n,
      public_id: publicId, stock_number: stock, shape: shape, carat: carat,
      colour: 'E', clarity: 'VS1', cut: 'Excellent', laboratory: 'IGI',
      active: true, archived_at: null,
    },
  };
}
function jew(n, sku, publicId, name, category, weight) {
  return {
    id: 'fav-j' + n, product_type: 'jewellery',
    jewellery_id: '00000000-0000-4000-a000-00000000000' + n, diamond_id: null,
    created_at: '2026-07-0' + n + 'T10:00:00Z',
    diamonds: null,
    jewellery: {
      id: '00000000-0000-4000-a000-00000000000' + n,
      public_id: publicId, sku: sku, product_name: name, category: category,
      diamond_weight: weight, metal_type: '18K White Gold',
      availability: 'ready', active: true, archived_at: null,
    },
  };
}
function seedSet() {
  return [
    dia(7, 'NGD-1007', 'DIA-SEED0007', 3.01, 'Round'),
    dia(1, 'NGD-1001', 'DIA-SEED0001', 1.25, 'Oval'),
    dia(2, 'NGD-1002', 'DIA-SEED0002', 2.05, 'Princess'),
    dia(3, 'NGD-1003', 'DIA-SEED0003', 0.75, 'Pear'),
    jew(1, 'JW-2001', 'JEW-SEED0001', 'Aurora Solitaire Ring', 'Rings', 1.5),
    jew(2, 'JW-2002', 'JEW-SEED0002', 'Halo Pendant', 'Pendants', 0.5),
    jew(3, 'JW-2003', 'JEW-SEED0003', 'Cluster Earrings', 'Earrings', 2.6),
  ];
}

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
let deleteCalls = [];
function makeBackend(opts) {
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
    if (url.pathname === '/rest/v1/favourites' && method === 'GET') {
      // The page must only ever ask for the signed-in customer's rows.
      if (!url.search.includes('user_id=eq.' + USER.id)) return json(400, { message: 'mock: favourites query missing the user_id filter' });
      return json(200, opts.seeds);
    }
    if (url.pathname === '/rest/v1/favourites' && method === 'DELETE') {
      deleteCalls.push({ url: req.url() });
      if (opts.failDelete) return json(500, { message: 'mock delete failure', code: 'XX000' });
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && (method === 'GET' || method === 'HEAD')) {
      // Dashboard widgets probed on the login hop — harmless empty data.
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
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeBackend({ seeds: opts.seeds || seedSet(), failDelete: !!opts.failDelete }));
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

async function openFavourites(page, waitFor) {
  await page.goto(SITE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ngdSupabaseState === 'ready');
  await page.fill('#login-email', USER.email);
  await page.fill('#login-password', USER.password);
  await page.click('#login-submit');
  await page.waitForURL('**/account/dashboard.html', { timeout: 10000 });
  await page.goto(SITE + '/account/favourites.html', { waitUntil: 'domcontentloaded' });
  if (waitFor === 'empty') {
    await page.waitForFunction(() => !document.getElementById('fav-empty').hidden);
  } else {
    await page.waitForFunction(() => document.querySelectorAll('#fav-grid article').length > 0);
  }
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('shell reused: sidebar with Favourites active, live title, no demo notice', {}, async (page) => {
    await openFavourites(page);
    const state = await page.evaluate(() => ({
      topbar: !!document.querySelector('.ngd-dash-topbar [data-ngd-logout]'),
      active: document.querySelector('.ngd-dash-nav .is-active').getAttribute('data-dash-route'),
      dashboardHref: document.querySelector('.ngd-dash-nav a[data-dash-route="dashboard"]').getAttribute('href'),
      holdsHref: document.querySelector('.ngd-dash-nav a[data-dash-route="holds"]').getAttribute('href'),
      title: document.querySelector('h1').textContent.trim(),
      demoNote: !!document.getElementById('fav-demo-note'),
      demoWording: /demo/i.test(document.querySelector('.ngd-dash-main').textContent),
      firstName: document.querySelector('[data-ngd-field="first_name"]').textContent.trim(),
      visible: getComputedStyle(document.body).visibility === 'visible',
    }));
    expect(state.visible, 'guard passed and revealed the page');
    expect(state.topbar, 'shared topbar present');
    expect(state.active === 'favourites', 'Favourites route active, got ' + state.active);
    expect(state.dashboardHref === 'dashboard.html', 'sidebar routes back to the dashboard');
    expect(state.holdsHref === 'holds.html', 'holds is a real route');
    expect(state.title === 'My Favourites', 'page title, got ' + state.title);
    expect(!state.demoNote && !state.demoWording, 'no demo notice or wording anywhere');
    expect(state.firstName === 'Chetan', 'greets the signed-in customer');
  });

  await scenario('live cards: mixed types, spec text, public-id links, paired actions, honest count', {}, async (page) => {
    await openFavourites(page);
    const state = await page.evaluate(() => {
      const links = [...document.querySelectorAll('#fav-grid a.ngd-btn')].map((a) => a.getAttribute('href'));
      const dCard = document.querySelector('#fav-grid a[href*="DIA-SEED0007"]').closest('article');
      const jCard = document.querySelector('#fav-grid a[href*="JEW-SEED0001"]').closest('article');
      return {
        total: document.querySelectorAll('#fav-grid article').length,
        dLinks: links.filter((h) => /^\.\.\/diamond-details\.html\?id=DIA-SEED000\d$/.test(h)).length,
        jLinks: links.filter((h) => /^\.\.\/jewellery-details\.html\?id=JEW-SEED000\d$/.test(h)).length,
        dArt: !!dCard.querySelector('.ngd-diamond-media svg'),
        dStock: dCard.querySelector('.ngd-stock-no').textContent.trim(),
        dTitle: dCard.querySelector('h2').textContent.trim(),
        dRemove: !!dCard.querySelector('[data-fav-remove]'),
        jArt: !!jCard.querySelector('.ngd-jewel-media svg'),
        jName: jCard.querySelector('h2').textContent.trim(),
        jCat: jCard.querySelector('.ngd-jewel-cat').textContent.trim(),
        jRemove: !!jCard.querySelector('[data-fav-remove]'),
        count: document.getElementById('fav-count').textContent,
      };
    });
    expect(state.total === 7, 'seven live favourites, got ' + state.total);
    expect(state.dLinks === 4 && state.jLinks === 3, 'every View Details link uses the DIA-/JEW- public id, got ' + state.dLinks + '+' + state.jLinks);
    expect(state.dArt, 'diamond shape art fallback');
    expect(state.dStock === 'NGD-1007', 'diamond stock number, got ' + state.dStock);
    expect(/Round · 3\.01 ct/.test(state.dTitle), 'diamond title from live specs, got ' + state.dTitle);
    expect(state.jArt, 'jewellery category art fallback');
    expect(state.jName === 'Aurora Solitaire Ring' && state.jCat === 'Rings', 'jewellery name + category, got ' + state.jName + '/' + state.jCat);
    expect(state.dRemove && state.jRemove, 'Remove button on both card types');
    expect(state.count === 'Showing 7 of 7 — 4 diamonds · 3 jewellery', 'honest count, got ' + state.count);
  });

  await scenario('tabs filter by type and move the active chip', {}, async (page) => {
    await openFavourites(page);
    await page.click('[data-fav-tab="diamond"]');
    let state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      jewels: document.querySelectorAll('#fav-grid a[href^="../jewellery-details"]').length,
      active: document.querySelector('#fav-tabs .is-active').getAttribute('data-fav-tab'),
      pressed: document.querySelector('[data-fav-tab="diamond"]').getAttribute('aria-pressed'),
      count: document.getElementById('fav-count').textContent,
    }));
    expect(state.cards === 4 && state.jewels === 0, 'diamonds tab shows only diamonds');
    expect(state.active === 'diamond' && state.pressed === 'true', 'active chip follows');
    expect(/Showing 4 of 7/.test(state.count), 'count reflects the filter, got ' + state.count);
    await page.click('[data-fav-tab="jewellery"]');
    state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      diamonds: document.querySelectorAll('#fav-grid a[href^="../diamond-details"]').length,
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
      href: document.querySelector('#fav-grid a.ngd-btn').getAttribute('href'),
    }));
    expect(state.cards === 1 && /DIA-SEED0007/.test(state.href), 'stock-number search finds the stone');
    await page.fill('#fav-search', 'Aurora');
    state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      href: document.querySelector('#fav-grid a.ngd-btn').getAttribute('href'),
    }));
    expect(state.cards === 1 && /JEW-SEED0001/.test(state.href), 'name search finds the piece');
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
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('#fav-grid a.ngd-btn')]
        .map((a) => new URLSearchParams(a.getAttribute('href').split('?')[1]).get('id')));
    const wanted = ['DIA-SEED0007', 'JEW-SEED0003', 'DIA-SEED0002', 'JEW-SEED0001', 'DIA-SEED0001', 'DIA-SEED0003', 'JEW-SEED0002'];
    expect(JSON.stringify(order) === JSON.stringify(wanted),
      'descending carat across both types, got ' + order.join(','));
    await page.selectOption('#fav-sort', 'carat-asc');
    const asc = await page.evaluate(() =>
      [...document.querySelectorAll('#fav-grid a.ngd-btn')]
        .map((a) => new URLSearchParams(a.getAttribute('href').split('?')[1]).get('id')));
    expect(JSON.stringify(asc) === JSON.stringify([...wanted].reverse()),
      'ascending carat mirrors it, got ' + asc.join(','));
  });

  await scenario('remove sends the real scoped DELETE and updates the list', {}, async (page) => {
    deleteCalls = [];
    await openFavourites(page);
    await page.click('#fav-grid [data-fav-row="fav-d7"] [data-fav-remove]');
    await page.waitForFunction(() => document.querySelectorAll('#fav-grid article').length === 6);
    const state = await page.evaluate(() => ({
      gone: !document.querySelector('#fav-grid [data-fav-row="fav-d7"]'),
      count: document.getElementById('fav-count').textContent,
      undo: !!document.getElementById('fav-undo'),
      toast: document.querySelector('#fav-toast .ngd-alert')?.textContent || '',
    }));
    expect(state.gone, 'card removed from the list');
    expect(state.count === 'Showing 6 of 6 — 3 diamonds · 3 jewellery', 'count follows, got ' + state.count);
    expect(deleteCalls.length === 1, 'exactly one DELETE sent, got ' + deleteCalls.length);
    const del = deleteCalls[0].url;
    expect(/\/rest\/v1\/favourites/.test(del), 'DELETE targets favourites');
    expect(del.includes('user_id=eq.' + USER.id), 'DELETE scoped to the signed-in customer');
    expect(del.includes('product_type=eq.diamond') && /diamond_id=eq\./.test(del), 'DELETE scoped to the exact product');
    expect(!state.undo && state.toast === '', 'no demo undo and no fake message — the row is really gone');
  });

  await scenario('failed remove keeps the card and shows the honest error', { failDelete: true }, async (page) => {
    deleteCalls = [];
    await openFavourites(page);
    await page.click('#fav-grid [data-fav-row="fav-d7"] [data-fav-remove]');
    await page.waitForSelector('#fav-toast .ngd-alert-danger', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#fav-grid article').length,
      still: !!document.querySelector('#fav-grid [data-fav-row="fav-d7"]'),
      toast: document.querySelector('#fav-toast .ngd-alert-danger').textContent.trim(),
      enabled: !document.querySelector('#fav-grid [data-fav-row="fav-d7"] [data-fav-remove]').disabled,
    }));
    expect(state.cards === 7 && state.still, 'nothing pretends to be deleted');
    expect(state.toast === 'We could not remove that favourite. Please try again.', 'honest error copy, got ' + state.toast);
    expect(state.enabled, 'remove button usable again');
    expect(deleteCalls.length === 1, 'the DELETE really was attempted');
  });

  await scenario('true empty state: exact copy, both CTAs, working link', { seeds: [] }, async (page) => {
    await openFavourites(page, 'empty');
    const state = await page.evaluate(() => ({
      empty: !document.getElementById('fav-empty').hidden,
      copy: document.querySelector('#fav-empty h2').textContent.trim(),
      ctas: [...document.querySelectorAll('#fav-empty a.ngd-btn')].map((a) => a.textContent.trim()),
      count: document.getElementById('fav-count').textContent,
      grid: document.getElementById('fav-grid').hidden,
    }));
    expect(state.empty && state.grid, 'true empty state shown, grid hidden');
    expect(/^You haven.t saved any favourites yet\.$/.test(state.copy),
      'exact empty copy, got ' + state.copy);
    expect(JSON.stringify(state.ctas) === JSON.stringify(['Explore Diamonds', 'Explore Jewellery']),
      'both CTAs present, got ' + state.ctas.join(','));
    expect(/No favourites/.test(state.count), 'count reads empty');
    await page.click('#fav-empty a[href="../diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
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

  await scenario('tablet 768 two cards per row; desktop 1440 grid settles', { viewport: { width: 768, height: 1024 } }, async (page) => {
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
    expect(o.perRow >= 3, 'wide grid at 1440, got ' + o.perRow);
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
