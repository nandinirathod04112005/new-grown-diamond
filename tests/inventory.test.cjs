/* ============================================================
   Diamond Inventory page tests (LIVE).
   The public inventory now reads public.diamonds through the
   Supabase client (mocked at the network layer, PostgREST-style):
   only active, non-archived stones load (the inactive + archived
   seeds are invisible even to search), cards/table render the
   real rows (photo when image_path is set, gem art otherwise),
   View Details links carry the public_id, and search / all filter
   groups / sorting / grid-table switch / pagination still run
   client-side. Loading, catalogue-empty and network-error states
   are real (Retry re-queries) and never leak raw Supabase errors.
   Also: navigation to the live details page, ?shape= preselects,
   legacy ?id= redirects, responsive behaviour at 1440/768/390.
   Run:  node tests/inventory.test.cjs   (see tests/README.md)
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
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

/* 28 live stones + 1 inactive + 1 archived (both must stay invisible) */
function seedDiamonds() {
  const SHAPES = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise'];
  const COLORS = ['D', 'E', 'F', 'G', 'H'];
  const CLAR = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'];
  const CUTS = ['Ideal', 'Excellent', 'Very Good'];
  const rows = [];
  for (let i = 0; i < 28; i++) {
    const n = String(i + 1).padStart(2, '0');
    rows.push({
      public_id: 'DIA-SEED00' + n,
      stock_number: 'NGD-10' + n,
      shape: SHAPES[i % 8],
      carat: +(0.3 + ((i * 13) % 40) / 10).toFixed(2),
      color: COLORS[i % 5], clarity: CLAR[i % 6], cut: CUTS[i % 3],
      laboratory: i % 2 ? 'GIA' : 'IGI',
      growth_method: i % 2 ? 'HPHT' : 'CVD',
      availability: i % 4 === 0 ? 'On Request' : 'In Stock',
      image_path: i === 0 ? 'diamonds/DIA-SEED0001/livephoto12345678.png' : null,
      featured: i % 5 === 0,
      active: true, archived_at: null,
      polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
      report_number: 'LG9911001' + n, certificate_number: 'LG9911001' + n,
      measurements: '6.4 × 6.4 × 4.0 mm', depth_percentage: 62, table_percentage: 57, ratio: 1,
      total_price: 1800 + i * 10, price_per_carat: 1200, currency: 'USD',
      price_visible: i % 3 === 0,
      created_at: `2026-08-${String(28 - i).padStart(2, '0')}T10:00:00Z`,
    });
  }
  rows.push({
    ...rows[0], public_id: 'DIA-SEED0097', stock_number: 'NGD-1097',
    active: false, archived_at: null, image_path: null,
  });
  rows.push({
    ...rows[0], public_id: 'DIA-SEED0098', stock_number: 'NGD-1098',
    active: true, archived_at: '2026-08-01T10:00:00Z', image_path: null,
  });
  return rows;
}

function makeMock(opts = {}) {
  const diamonds = opts.emptyInventory ? [] : seedDiamonds();
  async function handler(route) {
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
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pubEq.slice(4));
      return json(200, rows);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/diamond-images/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds };
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
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    const backend = makeMock(opts);
    await context.route(SB_HOST + '/**', backend.handler);
    if (opts.routes) await opts.routes(context, backend);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page, backend);
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

async function open(page, query) {
  await page.goto(`${SITE}/diamonds.html${query || ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#inv-grid .ngd-diamond-card', { timeout: 10000 });
}

async function countText(page) {
  return (await page.textContent('#inv-count')).trim();
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live load: 9 cards of the 28 active stones, newest first, photo + art', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#inv-grid .ngd-diamond-card')];
      return {
        cards: cards.length,
        firstStock: cards[0].getAttribute('data-diamond-id'),
        firstPhoto: (cards[0].querySelector('.ngd-diamond-media img') || { getAttribute: () => '' }).getAttribute('src') || '',
        secondArt: !!cards[1].querySelector('.ngd-diamond-media svg'),
        detailsHref: cards[0].querySelector('a.ngd-btn').getAttribute('href'),
        loadingHidden: document.getElementById('inv-loading').classList.contains('d-none'),
        pagination: document.querySelectorAll('#inv-pagination .ngd-page-btn').length > 0,
        demoLoaded: !!window.NGD_DEMO_DIAMONDS,
      };
    });
    expect(state.cards === 9, 'first page holds 9 cards, got ' + state.cards);
    expect(state.firstStock === 'NGD-1001', 'newest stone first, got ' + state.firstStock);
    expect(/Showing 1–9 of 28/.test(await countText(page)), 'count over the LIVE rows, got ' + await countText(page));
    expect(state.firstPhoto.indexOf('diamonds/DIA-SEED0001/livephoto12345678.png') !== -1,
      'a stone with image_path renders its real photo, got ' + state.firstPhoto);
    expect(state.secondArt, 'stones without a photo fall back to gem art');
    expect(state.detailsHref === 'diamond-details.html?id=DIA-SEED0001',
      'View Details links by public_id, got ' + state.detailsHref);
    expect(state.loadingHidden && state.pagination, 'loading finished, pagination rendered');
    expect(!state.demoLoaded, 'the demo dataset script is gone from this page');
  });

  await scenario('inactive and archived stones are invisible — even to search', {}, async (page) => {
    await open(page);
    await page.fill('#inv-search', 'NGD-1097');
    await page.waitForFunction(() => !document.getElementById('inv-empty').classList.contains('d-none'));
    let count = await countText(page);
    expect(/No stones match/.test(count), 'inactive stone unreachable, got ' + count);
    await page.fill('#inv-search', 'NGD-1098');
    await page.waitForFunction(() =>
      /No stones match/.test(document.getElementById('inv-count').textContent));
    await page.fill('#inv-search', '');
    await page.waitForFunction(() =>
      /of 28/.test(document.getElementById('inv-count').textContent));
    count = await countText(page);
    expect(/of 28/.test(count), 'exactly the 28 active stones, got ' + count);
  });

  await scenario('search narrows by stock number and by shape', {}, async (page) => {
    await open(page);
    await page.fill('#inv-search', 'NGD-1007');
    await page.waitForFunction(() =>
      document.querySelectorAll('#inv-grid .ngd-diamond-card').length === 1);
    const one = await page.evaluate(() =>
      document.querySelector('#inv-grid .ngd-diamond-card').getAttribute('data-diamond-id'));
    expect(one === 'NGD-1007', 'stock search narrows to the stone, got ' + one);
    await page.fill('#inv-search', 'oval');
    await page.waitForFunction(() =>
      /of 4/.test(document.getElementById('inv-count').textContent) ||
      document.querySelectorAll('#inv-grid .ngd-diamond-card').length === 4);
    const shapes = await page.evaluate(() =>
      [...document.querySelectorAll('#inv-grid .ngd-diamond-title')].map((t) => t.textContent.trim()));
    expect(shapes.length === 4 && shapes.every((s) => s === 'Oval'),
      'shape search finds the four ovals, got ' + shapes.join(','));
  });

  await scenario('filters narrow correctly and combine (AND)', {}, async (page) => {
    await open(page);
    await page.check('#inv-f-shape-round');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#inv-grid .ngd-diamond-title')].every((t) => t.textContent.trim() === 'Round'));
    await page.check('#inv-f-colour-d');
    await page.waitForFunction(() => {
      const cards = [...document.querySelectorAll('#inv-grid .ngd-diamond-card')];
      return cards.length > 0 && cards.every((c) =>
        c.querySelector('.ngd-diamond-title').textContent.trim() === 'Round');
    });
    const state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#inv-grid .ngd-diamond-card')].map((c) => c.getAttribute('data-diamond-id')),
      badge: document.getElementById('inv-filter-badge').textContent.trim(),
    }));
    /* Round = i%8===0 → i 0,8,16,24; colour D = i%5===0 → i 0. AND → NGD-1001 */
    expect(JSON.stringify(state.ids) === JSON.stringify(['NGD-1001']),
      'two filters AND together, got ' + state.ids.join(','));
    await page.click('#inv-clear');
    await page.waitForFunction(() =>
      /of 28/.test(document.getElementById('inv-count').textContent));
  });

  await scenario('every filter group renders (8 groups incl. carat range)', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      groups: document.querySelectorAll('#inv-filters .ngd-filter-group').length,
      legends: [...document.querySelectorAll('#inv-filters .ngd-filter-legend')].map((l) => l.textContent.trim()),
      caratInputs: !!document.querySelector('#inv-carat-min') && !!document.querySelector('#inv-carat-max'),
    }));
    expect(state.groups === 8, 'eight filter groups, got ' + state.groups);
    expect(state.legends.join('|') ===
      'Shape|Carat range|Colour|Clarity|Cut|Laboratory|Growth Method|Availability',
      'filter legends per spec, got ' + state.legends.join('|'));
    expect(state.caratInputs, 'carat range inputs present');
  });

  await scenario('sorting reorders by carat both ways', {}, async (page) => {
    await open(page);
    await page.selectOption('#inv-sort', 'carat-desc');
    await page.waitForTimeout(120);
    let carats = await page.evaluate(() =>
      [...document.querySelectorAll('#inv-grid .ngd-diamond-carat')].map((c) => parseFloat(c.textContent)));
    let sorted = [...carats].sort((a, b) => b - a);
    expect(JSON.stringify(carats) === JSON.stringify(sorted), 'carat high→low on the page');
    await page.selectOption('#inv-sort', 'carat-asc');
    await page.waitForTimeout(120);
    carats = await page.evaluate(() =>
      [...document.querySelectorAll('#inv-grid .ngd-diamond-carat')].map((c) => parseFloat(c.textContent)));
    sorted = [...carats].sort((a, b) => a - b);
    expect(JSON.stringify(carats) === JSON.stringify(sorted), 'carat low→high on the page');
  });

  await scenario('grid/table switch works; table rows are complete with public_id links', {}, async (page) => {
    await open(page);
    await page.click('#inv-view-table');
    await page.waitForSelector('#inv-table-wrap:not(.d-none)');
    const state = await page.evaluate(() => {
      const first = document.querySelector('#inv-table-body tr');
      return {
        gridHidden: document.getElementById('inv-grid').classList.contains('d-none'),
        rows: document.querySelectorAll('#inv-table-body tr').length,
        cells: first.querySelectorAll('td').length,
        stock: first.querySelector('.ngd-stock-cell').textContent.trim(),
        avail: !!first.querySelector('.ngd-avail'),
        view: first.querySelector('a.ngd-link').getAttribute('href'),
      };
    });
    expect(state.gridHidden && state.rows === 9, 'table view shows the page rows');
    expect(state.cells === 10, 'ten data columns per row, got ' + state.cells);
    expect(state.stock === 'NGD-1001' && state.avail, 'row anatomy intact');
    expect(state.view === 'diamond-details.html?id=DIA-SEED0001',
      'table View link by public_id, got ' + state.view);
    await page.click('#inv-view-grid');
    await page.waitForSelector('#inv-grid:not(.d-none)');
  });

  await scenario('pagination pages through and resets on filter change', {}, async (page) => {
    await open(page);
    await page.click('#inv-pagination [data-page="4"]');
    await page.waitForFunction(() =>
      /Showing 28–28 of 28/.test(document.getElementById('inv-count').textContent));
    const lastPage = await page.evaluate(() =>
      document.querySelectorAll('#inv-grid .ngd-diamond-card').length);
    expect(lastPage === 1, 'last page holds the remainder, got ' + lastPage);
    await page.check('#inv-f-availability-on-request');
    await page.waitForFunction(() =>
      /Showing 1–7 of 7/.test(document.getElementById('inv-count').textContent));
  });

  await scenario('View Details navigates to the live details page', {}, async (page) => {
    await open(page);
    await page.click('#inv-grid .ngd-diamond-card a.ngd-btn');
    await page.waitForURL('**/diamond-details.html?id=DIA-SEED0001', { timeout: 10000 });
    await page.waitForSelector('#dd-product:not(.d-none)', { timeout: 10000 });
    const stock = await page.textContent('#dd-stock');
    expect(stock.trim() === 'NGD-1001', 'details page loaded the same live stone, got ' + stock);
  });

  await scenario('?shape=round preselects the filter; legacy ?id redirects to details', {}, async (page) => {
    await open(page, '?shape=round');
    const state = await page.evaluate(() => ({
      checked: document.querySelector('#inv-f-shape-round').checked,
      titles: [...document.querySelectorAll('#inv-grid .ngd-diamond-title')].map((t) => t.textContent.trim()),
    }));
    expect(state.checked && state.titles.every((t) => t === 'Round'), 'shape param applies the filter');
    await page.goto(`${SITE}/diamonds.html?id=DIA-SEED0002`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/diamond-details.html?id=DIA-SEED0002', { timeout: 10000 });
  });

  await scenario('real error state with Retry re-querying Supabase', {
    routes: async (context, backend) => {
      let calls = 0;
      await context.route(SB_HOST + '/rest/v1/diamonds*', (route) => {
        if (route.request().method() === 'GET' && ++calls === 1) {
          return route.fulfill({
            status: 500, contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ code: 'XX000', message: 'internal error' }),
          });
        }
        return backend.handler(route);
      });
    },
  }, async (page) => {
    await page.goto(`${SITE}/diamonds.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#inv-error:not(.d-none)', { timeout: 10000 });
    const state = await page.evaluate(() => ({
      count: document.getElementById('inv-count').textContent,
      body: document.getElementById('inv-error').textContent,
    }));
    expect(/could not be loaded/i.test(state.count), 'honest error line, got ' + state.count);
    expect(!/XX000|internal error|supabase/i.test(state.body), 'no raw Supabase internals shown');
    await page.click('#inv-retry');
    await page.waitForSelector('#inv-grid .ngd-diamond-card', { timeout: 10000 });
  });

  await scenario('empty catalogue shows the curated-empty state', { emptyInventory: true }, async (page) => {
    await page.goto(`${SITE}/diamonds.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#inv-none:not(.d-none)', { timeout: 10000 });
    const count = await countText(page);
    expect(/No stones in the inventory yet/.test(count), 'honest empty count, got ' + count);
  });

  await scenario('mobile 390: offcanvas filters work, 1-col grid, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    await page.click('[data-bs-target="#invFilterCanvas"]');
    await page.waitForSelector('#invFilterCanvas.show', { timeout: 5000 });
    await page.check('#inv-f-shape-round');
    await page.click('#invFilterCanvas .btn-close');
    await page.waitForFunction(() => !document.querySelector('#invFilterCanvas.show'));
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#inv-grid .ngd-diamond-card')];
      return {
        titles: cards.map((c) => c.querySelector('.ngd-diamond-title').textContent.trim()),
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        badge: document.getElementById('inv-filter-badge').textContent.trim(),
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.titles.length && state.titles.every((t) => t === 'Round'), 'offcanvas filter applies');
    expect(state.perRow === 1, 'single-column cards on mobile');
    expect(state.badge === '1', 'filter badge counts, got ' + state.badge);
    expect(state.bodyW <= state.clientW + 1, `390 no overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'inventory-mobile.png') });
  });

  await scenario('tablet 768: table scrolls inside its card, page never scrolls sideways', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    await page.click('#inv-view-table');
    await page.waitForSelector('#inv-table-wrap:not(.d-none)');
    const state = await page.evaluate(() => {
      const wrap = document.querySelector('#inv-table-wrap .table-responsive');
      window.scrollTo(9999, 0);
      return {
        contained: wrap.scrollWidth >= wrap.clientWidth && getComputedStyle(wrap).overflowX !== 'visible',
        pageScrollX: window.scrollX,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.contained && state.pageScrollX === 0 && state.bodyW <= state.clientW + 1,
      'overflow stays inside the table card');
  });

  await scenario('desktop screenshot', {}, async (page) => {
    await open(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'inventory-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} inventory scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
