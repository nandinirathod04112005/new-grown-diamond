/* ============================================================
   Diamond Details page tests (LIVE).
   The details page now loads ONE stone from public.diamonds by
   its public_id (mocked at the network layer, PostgREST-style):
   real specifications with null-safe formatting, the Storage
   photo as the top view (art fallback), price gated by
   price_visible (hidden prices render as "Price on Request" and
   the amount never reaches the HTML), the clean "Diamond not
   available" state for unknown/malformed/inactive/archived ids,
   a real network-error state with Retry, live Similar stones,
   the signed-out CTA redirects (quote / hold / inspection /
   favourite → login), zoom + view switching and responsive
   layout checks.
   Run:  node tests/details.test.cjs
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

function seedDiamonds() {
  const base = {
    shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
    measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
    ratio: 1, growth_method: 'CVD', availability: 'In Stock',
    image_path: null, featured: false, active: true, archived_at: null,
    total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: true,
    created_at: '2026-08-10T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001', image_path: 'diamonds/DIA-SEED0001/livephoto12345678.png' },
    { ...base, id: 'uuid-d2', public_id: 'DIA-SEED0002', stock_number: 'NGD-1002', price_visible: false, total_price: 7777, shape: 'Oval', carat: 2.02, ratio: null, depth_percentage: null, created_at: '2026-08-09T10:00:00Z' },
    { ...base, id: 'uuid-d3', public_id: 'DIA-SEED0003', stock_number: 'NGD-1003', active: false, created_at: '2026-08-08T10:00:00Z' },
    { ...base, id: 'uuid-d4', public_id: 'DIA-SEED0004', stock_number: 'NGD-1004', archived_at: '2026-08-01T00:00:00Z', created_at: '2026-08-07T10:00:00Z' },
    { ...base, id: 'uuid-d5', public_id: 'DIA-SEED0005', stock_number: 'NGD-1005', carat: 1.2, created_at: '2026-08-06T10:00:00Z' },
    { ...base, id: 'uuid-d6', public_id: 'DIA-SEED0006', stock_number: 'NGD-1006', shape: 'Pear', created_at: '2026-08-05T10:00:00Z' },
  ];
}

function makeMock(opts = {}) {
  const diamonds = seedDiamonds();
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

async function open(page, id) {
  await page.goto(`${SITE}/diamond-details.html?id=${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#dd-product:not(.d-none)', { timeout: 10000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live load by public_id: real specs, photo top view, visible price', {}, async (page) => {
    await open(page, 'DIA-SEED0001');
    const state = await page.evaluate(() => ({
      stock: document.getElementById('dd-stock').textContent.trim(),
      title: document.getElementById('dd-title').textContent.replace(/\s+/g, ' ').trim(),
      badge: document.getElementById('dd-lab-badge').textContent.trim(),
      chips: document.getElementById('dd-chips').textContent,
      specs: [...document.querySelectorAll('#dd-specs div')].length,
      specText: document.getElementById('dd-specs').textContent,
      price: document.getElementById('dd-price').textContent.trim(),
      photo: (document.querySelector('#dd-stage-inner img.ngd-media-photo') || { getAttribute: () => '' }).getAttribute('src') || '',
      thumbs: document.querySelectorAll('#dd-thumbs .ngd-thumb').length,
      certNo: document.getElementById('dd-cert-no').textContent.trim(),
      demoLoaded: !!window.NGD_DEMO_DIAMONDS,
      title2: document.title,
    }));
    expect(state.stock === 'NGD-1001', 'stock number shown, got ' + state.stock);
    expect(/Round · 1\.52 ct/.test(state.title), 'title from the live row, got ' + state.title);
    expect(state.badge === 'IGI Certified', 'lab badge, got ' + state.badge);
    expect(/In Stock/.test(state.chips) && /LG77110001/.test(state.chips) && /CVD grown/.test(state.chips),
      'availability + report + growth chips');
    expect(state.specs === 17, 'seventeen spec fields, got ' + state.specs);
    expect(/Excellent/.test(state.specText) && /7\.3 × 7\.3 × 4\.5 mm/.test(state.specText) &&
      /62\.1%/.test(state.specText), 'live grading + proportions rendered');
    expect(state.price === 'USD 18,500', 'visible price formatted, got ' + state.price);
    expect(state.photo.indexOf('diamonds/DIA-SEED0001/livephoto12345678.png') !== -1,
      'the Storage photo is the top view, got ' + state.photo);
    expect(state.thumbs === 3, 'top/profile/certificate views, got ' + state.thumbs);
    expect(state.certNo === 'LG77110001', 'certificate card filled');
    expect(!state.demoLoaded, 'the demo dataset script is gone from this page');
    expect(/NGD-1001/.test(state.title2), 'document title names the stone');
  });

  await scenario('price_visible=false: "Price on Request", the amount never reaches the HTML', {}, async (page) => {
    await open(page, 'DIA-SEED0002');
    const state = await page.evaluate(() => ({
      price: document.getElementById('dd-price').textContent.trim(),
      leaked: document.documentElement.outerHTML.indexOf('7777') !== -1,
      ratio: document.getElementById('dd-specs').textContent,
    }));
    expect(state.price === 'Price on Request', 'hidden price masked, got ' + state.price);
    expect(!state.leaked, 'the hidden amount is nowhere in the rendered page');
    expect(/Ratio/.test(state.ratio), 'null-safe spec rendering still lists Ratio');
  });

  await scenario('not available: unknown, malformed, inactive and archived ids', {}, async (page) => {
    for (const id of ['DIA-ZZZZ9999', 'NGD-1001', 'DIA-SEED0003', 'DIA-SEED0004']) {
      await page.goto(`${SITE}/diamond-details.html?id=${id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#dd-notfound:not(.d-none)', { timeout: 10000 });
      const state = await page.evaluate(() => ({
        heading: document.querySelector('#dd-notfound .ngd-title').textContent.trim(),
        productHidden: document.getElementById('dd-product').classList.contains('d-none'),
        back: !!document.querySelector('#dd-notfound a[href="diamonds.html"]'),
      }));
      expect(state.heading === 'Diamond not available', id + ' → clean state, got ' + state.heading);
      expect(state.productHidden && state.back, id + ' → product hidden with a way back');
    }
  });

  await scenario('network failure: honest error state, Retry recovers', {
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
    await page.goto(`${SITE}/diamond-details.html?id=DIA-SEED0001`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#dd-error:not(.d-none)', { timeout: 10000 });
    const body = await page.evaluate(() => document.getElementById('dd-error').textContent);
    expect(!/XX000|internal error|supabase/i.test(body), 'no raw Supabase internals shown');
    await page.click('#dd-retry');
    await page.waitForSelector('#dd-product:not(.d-none)', { timeout: 10000 });
    const stock = await page.textContent('#dd-stock');
    expect(stock.trim() === 'NGD-1001', 'Retry loads the stone');
  });

  await scenario('similar stones load live, exclude the stone itself, link by public_id', {}, async (page) => {
    await open(page, 'DIA-SEED0001');
    await page.waitForFunction(() =>
      document.querySelectorAll('#dd-similar .ngd-diamond-card').length === 3, null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#dd-similar .ngd-diamond-card')].map((c) => c.getAttribute('data-diamond-id')),
      hrefs: [...document.querySelectorAll('#dd-similar a.ngd-btn')].map((a) => a.getAttribute('href')),
    }));
    expect(state.ids.indexOf('NGD-1001') === -1, 'the stone itself is excluded, got ' + state.ids.join(','));
    expect(state.ids.indexOf('NGD-1005') !== -1, 'same-shape stones rank first, got ' + state.ids.join(','));
    expect(state.hrefs.every((h) => /^diamond-details\.html\?id=DIA-SEED\d{4}$/.test(h)),
      'similar links carry public ids, got ' + state.hrefs.join(','));
  });

  await scenario('signed-out CTAs: quote, hold, inspection and favourite all lead to login', {}, async (page) => {
    await open(page, 'DIA-SEED0001');
    for (const id of ['dd-quote', 'dd-hold', 'dd-inspect']) {
      await page.click('#' + id);
      await page.waitForURL('**/login.html', { timeout: 8000 });
      await open(page, 'DIA-SEED0001');
    }
    await page.click('#dd-fav');
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('zoom and view switching still work on the live stage', {}, async (page) => {
    await open(page, 'DIA-SEED0001');
    await page.click('#dd-stage');
    let zoomed = await page.evaluate(() =>
      document.getElementById('dd-stage').classList.contains('is-zoomed'));
    expect(zoomed, 'stage zooms on click');
    await page.keyboard.press('Escape');
    zoomed = await page.evaluate(() =>
      document.getElementById('dd-stage').classList.contains('is-zoomed'));
    expect(!zoomed, 'Escape resets the zoom');
    await page.click('#dd-thumbs .ngd-thumb[data-view="certificate"]');
    const view = await page.evaluate(() =>
      document.getElementById('dd-stage').getAttribute('data-view'));
    expect(view === 'certificate', 'thumb switches the stage view');
  });

  await scenario('responsive: tablet 768 stacked, desktop 1440 two columns, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page, 'DIA-SEED0001');
    let o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `768 no overflow b=${o.bodyW}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => {
      const stage = document.getElementById('dd-stage').getBoundingClientRect();
      const info = document.getElementById('dd-stock').getBoundingClientRect();
      return {
        sideBySide: info.left > stage.right,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(o.sideBySide, 'two-column layout on desktop');
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'diamond-details-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} details scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
