/* ============================================================
   Recently Viewed tests (LIVE).
   Drives the shared device-local history (assets/js/
   recently-viewed.js): detail visits record id-only entries
   (never for inactive/unknown products, never full objects),
   newest-first with duplicates moving up and a hard cap of 12,
   sections on the homepage / inventory / listing that stay
   hidden with no history and render LIVE batched Supabase rows
   in history order (one query per product type), pruning of
   vanished products, type filtering, the Clear action, cross-tab
   storage sync, a browser without localStorage staying fully
   functional, and the existing Compare / WhatsApp / Certificate
   / Favourite flows remaining intact.
   Run:  node tests/recently-viewed.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://rv-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAABAAAAAQCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const DIAMONDS = [
  {
    id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001',
    shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
    certificate_url: null, measurements: '7.3 × 7.3 × 4.5 mm',
    depth_percentage: 62.1, table_percentage: 57, ratio: 1, growth_method: 'CVD',
    availability: 'In Stock', image_path: null, featured: false, active: true,
    archived_at: null, total_price: 18500, price_per_carat: 12171, currency: 'USD',
    price_visible: false, created_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 'uuid-d2', public_id: 'DIA-SEED0002', stock_number: 'NGD-1002',
    shape: 'Oval', carat: 2.02, color: 'E', clarity: 'VS1', cut: 'Ideal',
    laboratory: 'IGI', report_number: 'LG77110002', certificate_number: 'LG77110002',
    certificate_url: null, measurements: null, depth_percentage: null,
    table_percentage: null, ratio: null, growth_method: 'CVD',
    availability: 'In Stock', image_path: null, featured: false, active: true,
    archived_at: null, price_visible: false, created_at: '2026-08-09T10:00:00Z',
  },
  {
    id: 'uuid-d3', public_id: 'DIA-SEED0003', stock_number: 'NGD-1003',
    shape: 'Round', carat: 1.0, color: 'F', clarity: 'VS2', cut: 'Ideal',
    laboratory: 'IGI', availability: 'In Stock', image_path: null,
    featured: false, active: false, archived_at: null, price_visible: false,
    created_at: '2026-08-08T10:00:00Z',
  },
];
const JEWELS = [
  {
    id: 'uuid-j1', public_id: 'JEW-SEED0001', sku: 'NGD-J-01',
    product_name: 'Aurora Halo Ring', category: 'Rings', subcategory: '',
    short_description: 'A brilliant halo ring.', diamond_weight: 1.2,
    availability: 'available', featured: false, active: true, archived_at: null,
    created_at: '2026-08-10T10:00:00Z', metal: '18k Gold', metal_karat: '18k',
    metal_color: 'Yellow', diamond_pieces: 17, diamond_quality: 'F VS',
    diamond_shape: 'Round', certificate_number: null, gross_weight: 4.2,
    size: '52', price: 2900, currency: 'USD', price_visible: false, description: '',
  },
  {
    id: 'uuid-j2', public_id: 'JEW-SEED0002', sku: 'NGD-J-02',
    product_name: 'Meridian Pendant', category: 'Pendants', subcategory: '',
    short_description: 'A clean-lined pendant.', diamond_weight: 0.8,
    availability: 'available', featured: false, active: true, archived_at: null,
    created_at: '2026-08-09T10:00:00Z', metal: '18k Gold', metal_karat: '18k',
    metal_color: 'White', diamond_pieces: 5, diamond_quality: 'F VS',
    diamond_shape: 'Round', certificate_number: null, gross_weight: 2.8,
    size: null, price: 1400, currency: 'USD', price_visible: false, description: '',
  },
];

const results = [];
let browser;
let SITE;
let batchFetches = { diamonds: 0, jewellery: 0, images: 0 };

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function makeMock() {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, obj) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' }, body: '' });
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      return json(401, { code: 'no_session', error_code: 'no_session', msg: 'no session', message: 'no session' });
    }
    const inFilter = (rows, param) => {
      const value = url.searchParams.get(param) || '';
      if (!value.startsWith('in.')) return rows;
      const ids = value.slice(3).replace(/^\(|\)$/g, '').split(',')
        .map((v) => v.replace(/^"|"$/g, '').trim()).filter(Boolean);
      return rows.filter((r) => ids.includes(r[param === 'jewellery_id' ? 'jewellery_id' : param]));
    };
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = DIAMONDS.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      if (url.searchParams.get('featured') === 'eq.true') rows = rows.filter((d) => d.featured);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      if (pub.startsWith('in.')) { batchFetches.diamonds += 1; rows = inFilter(rows, 'public_id'); }
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = JEWELS.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      if (url.searchParams.get('featured') === 'eq.true') rows = rows.filter((d) => d.featured);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('in.')) { batchFetches.jewellery += 1; rows = inFilter(rows, 'public_id'); }
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery_images' && method === 'GET') {
      if ((url.searchParams.get('jewellery_id') || '').startsWith('in.')) batchFetches.images += 1;
      return json(200, []);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
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

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock());
    if (opts.preset) {
      await context.addInitScript(
        `try { localStorage.setItem('ngdRecentlyViewed', ${JSON.stringify(JSON.stringify(opts.preset))}); } catch (e) {}`);
    }
    if (opts.noStorage) {
      await context.addInitScript(
        `Object.defineProperty(window, 'localStorage', { get: function () { throw new Error('storage disabled'); } });`);
    }
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|SwiftShader/i.test(m.text())) {
        consoleErrors.push(m.text());
      }
    });
    await fn(page, context);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    expect(consoleErrors.length === 0, 'no console errors, got: ' + consoleErrors.join(' | '));
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

const entry = (type, id, viewedAt) => ({ type, id, viewedAt: viewedAt || 1700000000000 });
const stored = () => JSON.parse(localStorage.getItem('ngdRecentlyViewed') || '[]');

async function visit(page, path, readySelector) {
  await page.goto(SITE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el && el.textContent.trim().length > 0;
  }, readySelector);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('a loaded diamond records an id-only entry; invalid and inactive stones never do', {}, async (page) => {
    await visit(page, '/diamond-details.html?id=DIA-SEED0001', '#dd-stock');
    const first = await page.evaluate(stored);
    expect(first.length === 1 && first[0].type === 'diamond' && first[0].id === 'DIA-SEED0001' &&
      typeof first[0].viewedAt === 'number' && first[0].viewedAt > 0,
      'one diamond entry with a timestamp, got ' + JSON.stringify(first));
    expect(Object.keys(first[0]).sort().join(',') === 'id,type,viewedAt',
      'ONLY type/id/viewedAt stored — never product objects: ' + JSON.stringify(first[0]));
    const raw = await page.evaluate(() => localStorage.getItem('ngdRecentlyViewed'));
    expect(!/Round|1\.52|price|IGI|token|eyJ/i.test(raw), 'no product data or secrets in storage: ' + raw);
    /* inactive stone → not-available state → nothing recorded */
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0003', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-notfound').classList.contains('d-none'));
    const after = await page.evaluate(stored);
    expect(after.length === 1 && after[0].id === 'DIA-SEED0001', 'inactive stone never recorded');
    /* existing flows intact on the details page */
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-whatsapp').hidden);
    const flows = await page.evaluate(() => ({
      compare: !document.getElementById('dd-compare').hidden,
      whatsapp: !document.getElementById('dd-whatsapp').hidden,
      cert: !document.getElementById('dd-cert-info').hidden,
      fav: document.getElementById('dd-fav').hasAttribute('aria-pressed'),
      quote: !!document.getElementById('dd-quote'),
    }));
    expect(flows.compare && flows.whatsapp && flows.cert && flows.fav && flows.quote,
      'Compare / WhatsApp / Certificate / Favourite / Quote all intact');
  });

  await scenario('jewellery records too; newest first; a duplicate moves up without duplicating', {}, async (page) => {
    await visit(page, '/diamond-details.html?id=DIA-SEED0001', '#dd-stock');
    await visit(page, '/jewellery-details.html?id=JEW-SEED0001', '#jd-sku');
    let list = await page.evaluate(stored);
    expect(list.length === 2 && list[0].type === 'jewellery' && list[1].type === 'diamond',
      'newest first, got ' + JSON.stringify(list.map((e) => e.type)));
    await visit(page, '/diamond-details.html?id=DIA-SEED0001', '#dd-stock');
    list = await page.evaluate(stored);
    expect(list.length === 2 && list[0].id === 'DIA-SEED0001' && list[1].id === 'JEW-SEED0001',
      'duplicate moved to the top without duplication, got ' + JSON.stringify(list.map((e) => e.id)));
  });

  await scenario('the history never exceeds 12 entries', {
    /* stored newest-first: index 0 is the most recent, the last entry is
       the oldest — that's the one that must roll off at the cap */
    preset: Array.from({ length: 12 }, (_, i) =>
      entry('diamond', 'DIA-OLDST' + String(i).padStart(3, '0'), 1700000012000 - i * 1000)),
  }, async (page) => {
    await visit(page, '/jewellery-details.html?id=JEW-SEED0001', '#jd-sku');
    const list = await page.evaluate(stored);
    expect(list.length === 12, 'capped at 12, got ' + list.length);
    expect(list[0].id === 'JEW-SEED0001', 'newest entry kept at the top');
    expect(!list.some((e) => e.id === 'DIA-OLDST011'), 'the oldest (last) entry rolled off');
    expect(list.some((e) => e.id === 'DIA-OLDST000'), 'the most recent prior entries survive');
  });

  await scenario('homepage: hidden for first-time visitors, and nothing is fetched', {}, async (page) => {
    batchFetches = { diamonds: 0, jewellery: 0, images: 0 };
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.getElementById('featured-diamonds-grid').getAttribute('aria-busy') === 'false');
    const state = await page.evaluate(() => ({
      hidden: document.getElementById('recently-viewed').hidden,
      cards: document.querySelectorAll('#recently-viewed [data-recent-grid] article').length,
    }));
    expect(state.hidden && state.cards === 0, 'section stays hidden with zero history');
    expect(batchFetches.diamonds === 0 && batchFetches.jewellery === 0, 'no batched lookups fired');
  });

  await scenario('homepage: live mixed cards in history order from ONE batched query per type', {
    preset: [entry('diamond', 'DIA-SEED0001', 1700000002000), entry('jewellery', 'JEW-SEED0001', 1700000001000)],
  }, async (page) => {
    batchFetches = { diamonds: 0, jewellery: 0, images: 0 };
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recently-viewed').hidden);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#recently-viewed [data-recent-grid] article')];
      return {
        count: cards.length,
        firstIsDiamond: cards[0].classList.contains('ngd-diamond-card'),
        firstText: cards[0].textContent,
        secondText: cards[1] ? cards[1].textContent : '',
      };
    });
    expect(state.count === 2, 'both history items render, got ' + state.count);
    expect(state.firstIsDiamond && /Round/.test(state.firstText) && /NGD-1001/.test(state.firstText),
      'diamond first (history order) with LIVE row data');
    expect(/Aurora Halo Ring/.test(state.secondText), 'jewellery card carries the live name');
    expect(batchFetches.diamonds === 1 && batchFetches.jewellery === 1 && batchFetches.images === 1,
      'one batched query per type, got ' + JSON.stringify(batchFetches));
  });

  await scenario('vanished and inactive products are skipped and pruned from storage', {
    preset: [entry('diamond', 'DIA-SEED0001', 3), entry('diamond', 'DIA-SEED0003', 2), entry('diamond', 'DIA-GONE0009', 1)],
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recently-viewed').hidden);
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#recently-viewed [data-recent-grid] article').length,
      storage: JSON.parse(localStorage.getItem('ngdRecentlyViewed')),
    }));
    expect(state.cards === 1, 'only the still-public stone renders, got ' + state.cards);
    expect(state.storage.length === 1 && state.storage[0].id === 'DIA-SEED0001',
      'dead ids pruned from storage, got ' + JSON.stringify(state.storage));
  });

  await scenario('inventory and listing sections filter by their product type', {
    preset: [entry('jewellery', 'JEW-SEED0002', 4), entry('diamond', 'DIA-SEED0001', 3),
      entry('jewellery', 'JEW-SEED0001', 2), entry('diamond', 'DIA-SEED0002', 1)],
  }, async (page) => {
    await page.goto(SITE + '/diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recent-diamonds').hidden);
    const dia = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#recent-diamonds [data-recent-grid] article')];
      return {
        count: cards.length,
        allDiamond: cards.every((c) => c.classList.contains('ngd-diamond-card')),
        compareToggles: document.querySelectorAll('#recent-diamonds [data-ngd-compare]').length,
      };
    });
    expect(dia.count === 2 && dia.allDiamond, 'only diamonds on the inventory rail, got ' + dia.count);
    expect(dia.compareToggles === 2, 'compare toggles ride along on inventory cards');
    await page.goto(SITE + '/jewellery.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recent-jewellery').hidden);
    const jew = await page.evaluate(() => ({
      count: document.querySelectorAll('#recent-jewellery [data-recent-grid] article').length,
      names: [...document.querySelectorAll('#recent-jewellery [data-recent-grid] article')].map((c) => c.textContent),
    }));
    expect(jew.count === 2 && /Meridian Pendant/.test(jew.names[0]) && /Aurora Halo Ring/.test(jew.names[1]),
      'only jewellery, history order kept');
  });

  await scenario('Clear Recently Viewed hides the section and empties the history', {
    preset: [entry('diamond', 'DIA-SEED0001')],
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recently-viewed').hidden);
    await page.click('#recently-viewed [data-recent-clear]');
    await page.waitForFunction(() => document.getElementById('recently-viewed').hidden);
    const list = await page.evaluate(stored);
    expect(list.length === 0, 'history emptied');
  });

  await scenario('a change in another tab syncs the visible section', {
    preset: [entry('diamond', 'DIA-SEED0001')],
  }, async (page, context) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('recently-viewed').hidden);
    const other = await context.newPage();
    await other.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await other.evaluate(() => localStorage.setItem('ngdRecentlyViewed', '[]'));
    await page.waitForFunction(() => document.getElementById('recently-viewed').hidden, null, { timeout: 8000 });
    await other.close();
  });

  await scenario('a browser without localStorage keeps every page working, history silently off', {
    noStorage: true,
  }, async (page) => {
    await visit(page, '/diamond-details.html?id=DIA-SEED0001', '#dd-stock');
    const title = await page.evaluate(() => document.getElementById('dd-title').textContent.trim());
    expect(title.length > 0, 'the details page renders normally');
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.getElementById('featured-diamonds-grid').getAttribute('aria-busy') === 'false');
    const hidden = await page.evaluate(() => document.getElementById('recently-viewed').hidden);
    expect(hidden, 'the section simply stays hidden');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} recently-viewed scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
