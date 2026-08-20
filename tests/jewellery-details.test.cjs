/* ============================================================
   Jewellery Details page tests (LIVE).
   The details page now loads ONE piece from public.jewellery by
   its public_id (mocked at the network layer, PostgREST-style)
   plus its gallery from public.jewellery_images — the PRIMARY
   photo first, the rest in sort_order, artwork views for pieces
   without photos. Also: real specifications with null-safe
   formatting (incl. the all-metal piece), price gated by
   price_visible ("Price on Request", the amount never reaches
   the HTML), the clean not-available state for unknown /
   malformed / inactive / archived ids, a real error state with
   Retry, live Similar pieces, signed-out CTA redirects (quote /
   hold / favourite → login; Enquire links to the contact page),
   and responsive checks.
   Run:  node tests/jewellery-details.test.cjs
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

function seedJewellery() {
  const base = {
    subcategory: 'Solitaire', short_description: 'A quiet signature piece.',
    description: 'The longer atelier story of this piece.',
    metal: 'Gold', metal_karat: '18K', metal_color: 'White', gross_weight: 4.52,
    diamond_weight: 1.45, diamond_pieces: 25, diamond_quality: 'E–F / VVS',
    diamond_shape: 'Round', certificate_number: 'NGDJ-582337', size: 'Ring size 52',
    price: 5200, currency: 'USD', price_visible: true,
    availability: 'available', featured: false, active: true, archived_at: null,
    created_at: '2026-08-10T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-jw-01', public_id: 'JEW-SEED0001', sku: 'JW-1001', product_name: 'Aurora Test Ring', category: 'Rings' },
    { ...base, id: 'uuid-jw-02', public_id: 'JEW-SEED0002', sku: 'JW-1002', product_name: 'Hidden Price Pendant', category: 'Pendants', price_visible: false, price: 9999, created_at: '2026-08-09T10:00:00Z' },
    { ...base, id: 'uuid-jw-03', public_id: 'JEW-SEED0003', sku: 'JW-1003', product_name: 'Inactive Piece', category: 'Rings', active: false, created_at: '2026-08-08T10:00:00Z' },
    { ...base, id: 'uuid-jw-04', public_id: 'JEW-SEED0004', sku: 'JW-1004', product_name: 'Archived Piece', category: 'Rings', archived_at: '2026-08-01T00:00:00Z', created_at: '2026-08-07T10:00:00Z' },
    { ...base, id: 'uuid-jw-05', public_id: 'JEW-SEED0005', sku: 'JW-1005', product_name: 'Plain Gold Bangle', category: 'Bangles', metal_karat: '22K', diamond_weight: null, diamond_pieces: null, diamond_quality: null, diamond_shape: null, certificate_number: null, gross_weight: null, size: null, created_at: '2026-08-06T10:00:00Z' },
    { ...base, id: 'uuid-jw-06', public_id: 'JEW-SEED0006', sku: 'JW-1006', product_name: 'Second Ring', category: 'Rings', created_at: '2026-08-05T10:00:00Z' },
  ];
}

/* gallery of the recipe piece: primary is NOT the lowest sort_order, so
   the page must show primary first, then the rest in sort_order */
function seedImages() {
  return [
    { id: 'img-a', jewellery_id: 'uuid-jw-01', image_path: 'jewellery/JEW-SEED0001/photoa11111111.png', sort_order: 1, is_primary: false },
    { id: 'img-b', jewellery_id: 'uuid-jw-01', image_path: 'jewellery/JEW-SEED0001/photob22222222.png', sort_order: 2, is_primary: true },
    { id: 'img-c', jewellery_id: 'uuid-jw-01', image_path: 'jewellery/JEW-SEED0001/photoc33333333.png', sort_order: 3, is_primary: false },
  ];
}

function makeMock(opts = {}) {
  const jewellery = seedJewellery();
  const images = seedImages();
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
      let rows = images.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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

async function open(page, id) {
  await page.goto(`${SITE}/jewellery-details.html?id=${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#jd-product:not(.d-none)', { timeout: 10000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('live load by public_id: gallery shows the primary first, then sort_order', {}, async (page) => {
    await open(page, 'JEW-SEED0001');
    const state = await page.evaluate(() => ({
      sku: document.getElementById('jd-sku').textContent.trim(),
      name: document.getElementById('jd-name').textContent.trim(),
      chips: document.getElementById('jd-chips').textContent,
      price: document.getElementById('jd-price').textContent.trim(),
      stagePhoto: (document.querySelector('#jd-stage-inner img.ngd-media-photo') || { getAttribute: () => '' }).getAttribute('src') || '',
      thumbSrcs: [...document.querySelectorAll('#jd-thumbs .ngd-thumb img')].map((i) => i.getAttribute('src') || ''),
      thumbs: document.querySelectorAll('#jd-thumbs .ngd-thumb').length,
      specs: [...document.querySelectorAll('#jd-specs div')].length,
      specText: document.getElementById('jd-specs').textContent,
      demoLoaded: !!window.NGD_DEMO_JEWELLERY,
    }));
    expect(state.sku === 'JW-1001' && state.name === 'Aurora Test Ring', 'live identity, got ' + state.sku);
    expect(/In Stock/.test(state.chips) && /Rings · Solitaire/.test(state.chips) &&
      /1\.45 ct diamonds/.test(state.chips), 'availability + category + weight chips');
    expect(state.price === 'USD 5,200', 'visible price formatted, got ' + state.price);
    expect(state.stagePhoto.indexOf('photob22222222.png') !== -1,
      'the PRIMARY photo opens the gallery, got ' + state.stagePhoto);
    expect(state.thumbSrcs.length === 3 &&
      state.thumbSrcs[0].indexOf('photob22222222.png') !== -1 &&
      state.thumbSrcs[1].indexOf('photoa11111111.png') !== -1 &&
      state.thumbSrcs[2].indexOf('photoc33333333.png') !== -1,
      'primary first, then sort_order, got ' + state.thumbSrcs.join(' | '));
    expect(state.thumbs === 4, 'three photos + the 360° slot, got ' + state.thumbs);
    expect(state.specs === 15, 'fifteen spec fields, got ' + state.specs);
    expect(/18K/.test(state.specText) && /NGDJ-582337/.test(state.specText) && /4\.52 g/.test(state.specText),
      'live specification values rendered');
    expect(!state.demoLoaded, 'the demo dataset script is gone from this page');
  });

  await scenario('price_visible=false: "Price on Request", the amount never reaches the HTML', {}, async (page) => {
    await open(page, 'JEW-SEED0002');
    const state = await page.evaluate(() => ({
      price: document.getElementById('jd-price').textContent.trim(),
      leaked: document.documentElement.outerHTML.indexOf('9999') !== -1,
    }));
    expect(state.price === 'Price on Request', 'hidden price masked, got ' + state.price);
    expect(!state.leaked, 'the hidden amount is nowhere in the rendered page');
  });

  await scenario('a piece without photos keeps the artwork views', {}, async (page) => {
    await open(page, 'JEW-SEED0005');
    const state = await page.evaluate(() => ({
      art: !!document.querySelector('#jd-stage-inner svg'),
      photo: !!document.querySelector('#jd-stage-inner img'),
      thumbs: document.querySelectorAll('#jd-thumbs .ngd-thumb').length,
      weight: document.getElementById('jd-specs').textContent,
      cert: document.getElementById('jd-cert-text').textContent,
    }));
    expect(state.art && !state.photo, 'category artwork stage for a piece without photos');
    expect(state.thumbs === 4, 'front/detail/profile + 360° views, got ' + state.thumbs);
    expect(/—/.test(state.weight), 'null diamond fields render as dashes');
    expect(/all-metal piece/i.test(state.cert) && /22K White Gold/.test(state.cert),
      'all-metal certificate copy, got ' + state.cert);
  });

  await scenario('not available: unknown, malformed, inactive and archived ids', {}, async (page) => {
    for (const id of ['JEW-ZZZZ9999', 'JW-1001', 'JEW-SEED0003', 'JEW-SEED0004']) {
      await page.goto(`${SITE}/jewellery-details.html?id=${id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#jd-notfound:not(.d-none)', { timeout: 10000 });
      const state = await page.evaluate(() => ({
        heading: document.querySelector('#jd-notfound .ngd-title').textContent.trim(),
        productHidden: document.getElementById('jd-product').classList.contains('d-none'),
        back: !!document.querySelector('#jd-notfound a[href="jewellery.html"]'),
      }));
      expect(state.heading === 'Piece not available', id + ' → clean state, got ' + state.heading);
      expect(state.productHidden && state.back, id + ' → product hidden with a way back');
    }
  });

  await scenario('network failure: honest error state, Retry recovers', {
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
    await page.goto(`${SITE}/jewellery-details.html?id=JEW-SEED0001`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#jd-error:not(.d-none)', { timeout: 10000 });
    const body = await page.evaluate(() => document.getElementById('jd-error').textContent);
    expect(!/XX000|internal error|supabase/i.test(body), 'no raw Supabase internals shown');
    await page.click('#jd-retry');
    await page.waitForSelector('#jd-product:not(.d-none)', { timeout: 10000 });
  });

  await scenario('similar pieces load live, same category first, link by public_id', {}, async (page) => {
    await open(page, 'JEW-SEED0001');
    await page.waitForFunction(() =>
      document.querySelectorAll('#jd-similar .ngd-jewel-card').length === 3, null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#jd-similar .ngd-jewel-card')].map((c) => c.getAttribute('data-jewellery-id')),
      hrefs: [...document.querySelectorAll('#jd-similar a.ngd-btn')].map((a) => a.getAttribute('href')),
    }));
    expect(state.ids.indexOf('JW-1001') === -1, 'the piece itself is excluded, got ' + state.ids.join(','));
    expect(state.ids[0] === 'JW-1006', 'same-category pieces rank first, got ' + state.ids.join(','));
    expect(state.hrefs.every((h) => /^jewellery-details\.html\?id=JEW-SEED\d{4}$/.test(h)),
      'similar links carry public ids, got ' + state.hrefs.join(','));
  });

  await scenario('signed-out CTAs: quote, hold and favourite lead to login; Enquire links contact', {}, async (page) => {
    await open(page, 'JEW-SEED0001');
    const enquire = await page.evaluate(() =>
      document.getElementById('jd-enquire').getAttribute('href'));
    expect(enquire === 'contact.html?piece=JW-1001&type=enquiry',
      'Enquire carries the piece reference, got ' + enquire);
    for (const id of ['jd-quote', 'jd-hold']) {
      await page.click('#' + id);
      await page.waitForURL('**/login.html', { timeout: 8000 });
      await open(page, 'JEW-SEED0001');
    }
    await page.click('#jd-fav');
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('responsive: tablet 768 stacked, desktop 1440 two columns, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page, 'JEW-SEED0001');
    let o = await page.evaluate(() => ({
      bodyW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.bodyW <= o.clientW + 1, `768 no overflow b=${o.bodyW}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => {
      const stage = document.getElementById('jd-stage').getBoundingClientRect();
      const info = document.getElementById('jd-sku').getBoundingClientRect();
      return {
        sideBySide: info.left > stage.right,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(o.sideBySide, 'two-column layout on desktop');
    expect(o.bodyW <= o.clientW + 1, `1440 no overflow b=${o.bodyW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-details-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-details scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
