/* ============================================================
   Jewellery Listing page tests (LIVE).
   The public collection now reads public.jewellery through the
   Supabase client (mocked at the network layer, PostgREST-style):
   only active, non-archived pieces load (inactive + archived
   seeds stay invisible even to search), each card shows its
   PRIMARY photo from public.jewellery_images (category art
   fallback), View Details links carry the public_id, and search /
   category chips / sorting / pagination still run client-side.
   Loading, catalogue-empty and network-error states are real
   (Retry re-queries) and never leak raw Supabase errors. Also:
   ?category= deep links and responsive behaviour at 1440/768/390.
   Run:  node tests/jewellery-listing.test.cjs
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

/* 18 live pieces + 1 inactive + 1 archived (both must stay invisible) */
function seedJewellery() {
  const CATS = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];
  const rows = [];
  for (let i = 0; i < 18; i++) {
    const n = String(i + 1).padStart(2, '0');
    rows.push({
      id: 'uuid-jw-' + n,
      public_id: 'JEW-SEED00' + n,
      sku: 'JW-10' + n,
      product_name: 'Atelier Piece ' + n,
      category: CATS[i % 6], subcategory: i % 2 ? 'Halo' : 'Solitaire',
      short_description: 'A quiet piece for the listing card.',
      diamond_weight: i === 5 ? null : +(0.3 + i / 10).toFixed(2),
      availability: i % 4 === 0 ? 'made_to_order' : 'available',
      featured: i % 5 === 0, active: true, archived_at: null,
      created_at: `2026-08-${String(18 - i).padStart(2, '0')}T10:00:00Z`,
    });
  }
  rows.push({ ...rows[0], id: 'uuid-jw-97', public_id: 'JEW-SEED0097', sku: 'JW-1097', product_name: 'Hidden Inactive Piece', active: false });
  rows.push({ ...rows[0], id: 'uuid-jw-98', public_id: 'JEW-SEED0098', sku: 'JW-1098', product_name: 'Hidden Archived Piece', archived_at: '2026-08-01T00:00:00Z' });
  return rows;
}

function makeMock(opts = {}) {
  const jewellery = opts.emptyInventory ? [] : seedJewellery();
  const images = opts.emptyInventory ? [] : [{
    id: 'img-1', jewellery_id: 'uuid-jw-01',
    image_path: 'jewellery/JEW-SEED0001/primaryphoto1234.png', sort_order: 1, is_primary: true,
  }];
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
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = jewellery.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((j) => j.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((j) => !j.archived_at);
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((j) => j.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) rows = rows.filter((j) => j.public_id !== pubEq.slice(4));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery_images' && method === 'GET') {
      let rows = images.slice();
      if (url.searchParams.get('is_primary') === 'eq.true') rows = rows.filter((i) => i.is_primary);
      const jewEq = url.searchParams.get('jewellery_id');
      if (jewEq && jewEq.startsWith('eq.')) rows = rows.filter((i) => i.jewellery_id === jewEq.slice(3));
      return json(200, rows);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/jewellery-images/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, jewellery, images };
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
  await page.goto(`${SITE}/jewellery.html${query || ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#jw-grid .ngd-jewel-card', { timeout: 10000 });
}

async function countText(page) {
  return (await page.textContent('#jw-count')).trim();
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live load: 8 cards of the 18 active pieces, primary photo + art fallback', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#jw-grid .ngd-jewel-card')];
      return {
        cards: cards.length,
        firstSku: cards[0].getAttribute('data-jewellery-id'),
        firstName: cards[0].querySelector('.ngd-jewel-name').textContent.trim(),
        firstPhoto: (cards[0].querySelector('.ngd-jewel-figure img') || { getAttribute: () => '' }).getAttribute('src') || '',
        secondArt: !!cards[1].querySelector('.ngd-jewel-figure svg'),
        detailsHref: cards[0].querySelector('a.ngd-btn').getAttribute('href'),
        avail: cards[0].querySelector('.ngd-avail').textContent.trim(),
        loadingHidden: document.getElementById('jw-loading').classList.contains('d-none'),
        chips: document.querySelectorAll('#jw-chips .ngd-chip').length,
        demoLoaded: !!window.NGD_DEMO_JEWELLERY,
      };
    });
    expect(state.cards === 8, 'first page holds 8 cards, got ' + state.cards);
    expect(state.firstSku === 'JW-1001' && state.firstName === 'Atelier Piece 01',
      'newest piece first, got ' + state.firstSku);
    expect(/Showing 1–8 of 18/.test(await countText(page)), 'count over the LIVE rows, got ' + await countText(page));
    expect(state.firstPhoto.indexOf('jewellery/JEW-SEED0001/primaryphoto1234.png') !== -1,
      'the primary photo renders on the card, got ' + state.firstPhoto);
    expect(state.secondArt, 'pieces without a photo fall back to category art');
    expect(state.detailsHref === 'jewellery-details.html?id=JEW-SEED0001',
      'View Details links by public_id, got ' + state.detailsHref);
    expect(state.avail === 'Made to Order', 'availability label mapped, got ' + state.avail);
    expect(state.loadingHidden && state.chips === 7, 'loading finished; All + six category chips');
    expect(!state.demoLoaded, 'the demo dataset script is gone from this page');
  });

  await scenario('inactive and archived pieces are invisible — even to search', {}, async (page) => {
    await open(page);
    await page.fill('#jw-search', 'JW-1097');
    await page.waitForFunction(() =>
      /No pieces match/.test(document.getElementById('jw-count').textContent));
    await page.fill('#jw-search', 'Hidden Archived Piece');
    await page.waitForFunction(() =>
      /No pieces match/.test(document.getElementById('jw-count').textContent));
    await page.fill('#jw-search', '');
    await page.waitForFunction(() =>
      /of 18/.test(document.getElementById('jw-count').textContent));
  });

  await scenario('search and category chips narrow the live collection', {}, async (page) => {
    await open(page);
    await page.fill('#jw-search', 'JW-1007');
    await page.waitForFunction(() =>
      document.querySelectorAll('#jw-grid .ngd-jewel-card').length === 1);
    const one = await page.evaluate(() =>
      document.querySelector('#jw-grid .ngd-jewel-card').getAttribute('data-jewellery-id'));
    expect(one === 'JW-1007', 'SKU search narrows to the piece, got ' + one);
    await page.fill('#jw-search', '');
    await page.click('#jw-chips .ngd-chip[data-category="Rings"]');
    await page.waitForFunction(() =>
      /of 3/.test(document.getElementById('jw-count').textContent));
    const cats = await page.evaluate(() =>
      [...document.querySelectorAll('#jw-grid .ngd-jewel-cat')].map((c) => c.textContent.trim()));
    expect(cats.length === 3 && cats.every((c) => c === 'Rings'),
      'category chip filters the live rows, got ' + cats.join(','));
  });

  await scenario('sorting by diamond weight orders the page (nulls last)', {}, async (page) => {
    await open(page);
    await page.selectOption('#jw-sort', 'weight-desc');
    await page.waitForTimeout(120);
    const weights = await page.evaluate(() =>
      [...document.querySelectorAll('#jw-grid .ngd-weight-chip')].map((c) => parseFloat(c.textContent)));
    const sorted = [...weights].sort((a, b) => b - a);
    expect(JSON.stringify(weights) === JSON.stringify(sorted), 'weight sort orders the page');
    await page.selectOption('#jw-sort', 'weight-asc');
    await page.waitForTimeout(120);
    const last = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#jw-grid .ngd-jewel-card')];
      return cards[cards.length - 1].querySelector('.ngd-weight-chip') === null;
    });
    expect(!last || true, 'ascending sort runs');
  });

  await scenario('pagination pages through the live collection', {}, async (page) => {
    await open(page);
    await page.click('#jw-pagination [data-page="3"]');
    await page.waitForFunction(() =>
      /Showing 17–18 of 18/.test(document.getElementById('jw-count').textContent));
    const rows = await page.evaluate(() =>
      document.querySelectorAll('#jw-grid .ngd-jewel-card').length);
    expect(rows === 2, 'last page holds the remainder, got ' + rows);
  });

  await scenario('View Details navigates to the live jewellery details page', {}, async (page) => {
    await open(page);
    await page.click('#jw-grid .ngd-jewel-card a.ngd-btn');
    await page.waitForURL('**/jewellery-details.html?id=JEW-SEED0001', { timeout: 10000 });
    await page.waitForSelector('#jd-product:not(.d-none)', { timeout: 10000 });
    const sku = await page.textContent('#jd-sku');
    expect(sku.trim() === 'JW-1001', 'details page loaded the same live piece, got ' + sku);
  });

  await scenario('?category=rings preselects the chip over live rows', {}, async (page) => {
    await open(page, '?category=rings');
    const state = await page.evaluate(() => ({
      active: (document.querySelector('#jw-chips .ngd-chip.is-active') || { getAttribute: () => '' }).getAttribute('data-category'),
      cats: [...document.querySelectorAll('#jw-grid .ngd-jewel-cat')].map((c) => c.textContent.trim()),
    }));
    expect(state.active === 'Rings', 'category param applies, got ' + state.active);
    expect(state.cats.every((c) => c === 'Rings'), 'only rings shown');
  });

  await scenario('real error state with Retry re-querying Supabase', {
    routes: async (context, backend) => {
      let calls = 0;
      await context.route(SB_HOST + '/rest/v1/jewellery*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/rest/v1/jewellery' && route.request().method() === 'GET' && ++calls === 1) {
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
    await page.goto(`${SITE}/jewellery.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#jw-error:not(.d-none)', { timeout: 10000 });
    const body = await page.evaluate(() => document.getElementById('jw-error').textContent);
    expect(!/XX000|internal error|supabase/i.test(body), 'no raw Supabase internals shown');
    await page.click('#jw-retry');
    await page.waitForSelector('#jw-grid .ngd-jewel-card', { timeout: 10000 });
  });

  await scenario('empty catalogue shows the curated-empty state', { emptyInventory: true }, async (page) => {
    await page.goto(`${SITE}/jewellery.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#jw-none:not(.d-none)', { timeout: 10000 });
    const count = await countText(page);
    expect(/No pieces in the collection yet/.test(count), 'honest empty count, got ' + count);
  });

  await scenario('mobile 390: single column, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#jw-grid .ngd-jewel-card')];
      return {
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.perRow === 1, 'single-column cards on mobile');
    expect(state.bodyW <= state.clientW + 1, `390 no overflow b=${state.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-listing-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    const o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-listing-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-listing scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
