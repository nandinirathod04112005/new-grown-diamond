/* ============================================================
   WhatsApp Product Enquiry tests (LIVE).
   Drives the shared helper (assets/js/whatsapp-enquiry.js) on
   both detail pages and the contact page against a mocked
   backend: the CTA exists with safe external-link handling, the
   official number 917339220840 is the fallback while a valid
   Settings number is preferred everywhere, the pre-filled
   message is URL-encoded and contains EXACTLY the public product
   facts + the current page URL (missing values vanish — never
   "undefined"/"null"; hidden prices and internal ids never
   appear), the analytics CustomEvent fires with public facts
   only, unavailable products never show the CTA, the Settings
   feature toggles hide it, and the existing quote / hold /
   inspection / enquire / favourite actions stay intact.
   Run:  node tests/whatsapp-enquiry.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://wa-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const OFFICIAL = '917339220840';

const DIAMONDS = [
  {
    id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001',
    shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
    measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
    ratio: 1, growth_method: 'CVD', availability: 'In Stock', image_path: null,
    featured: false, active: true, archived_at: null,
    total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: true,
    created_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 'uuid-d2', public_id: 'DIA-SEED0002', stock_number: 'NGD-1002',
    shape: 'Oval', carat: 2.02, color: null, clarity: '', cut: 'Ideal',
    polish: null, symmetry: null, fluorescence: null,
    laboratory: null, report_number: null, certificate_number: null,
    measurements: null, depth_percentage: null, table_percentage: null,
    ratio: null, growth_method: 'CVD', availability: 'In Stock', image_path: null,
    featured: false, active: true, archived_at: null,
    total_price: 7777, price_per_carat: null, currency: 'USD', price_visible: false,
    created_at: '2026-08-09T10:00:00Z',
  },
  {
    id: 'uuid-d3', public_id: 'DIA-SEED0003', stock_number: 'NGD-1003',
    shape: 'Round', carat: 1.0, color: 'E', clarity: 'VS1', cut: 'Ideal',
    laboratory: 'IGI', availability: 'In Stock', image_path: null,
    active: false, archived_at: null, price_visible: false,
    created_at: '2026-08-08T10:00:00Z',
  },
];
const JEWELS = [{
  id: 'uuid-j1', public_id: 'JEW-SEED0001', sku: 'NGD-J-01',
  product_name: 'Aurora Halo Ring', category: 'Rings', subcategory: '',
  short_description: 'A brilliant halo ring.', description: '', metal: '18k Gold',
  metal_karat: '18k', metal_color: 'Yellow', diamond_weight: 1.2, diamond_pieces: 17,
  diamond_quality: 'F VS', diamond_shape: 'Round', certificate_number: null,
  gross_weight: 4.2, size: '52', availability: 'available', active: true,
  archived_at: null, price: 2900, currency: 'USD', price_visible: false,
  created_at: '2026-08-10T10:00:00Z',
}];

const settingsRows = (obj) => Object.keys(obj).map((key) => ({ key, value: obj[key] }));

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function makeMock(opts) {
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
    if (url.pathname === '/rest/v1/site_settings' && method === 'GET') {
      return json(200, opts.settings || []);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = DIAMONDS.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = JEWELS.slice();
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      return json(200, rows);
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []); // favourites, jewellery_images, seo, content…
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  };
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  try {
    await installCdnRoutes(context);
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(opts));
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|SwiftShader/i.test(m.text())) {
        consoleErrors.push(m.text());
      }
    });
    await fn(page);
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

const ctaState = (id) => ({
  hidden: document.getElementById(id).hidden,
  href: document.getElementById(id).getAttribute('href'),
  target: document.getElementById(id).getAttribute('target'),
  rel: document.getElementById(id).getAttribute('rel'),
  text: document.getElementById(id).textContent.trim(),
  hasIcon: !!document.getElementById(id).querySelector('svg'),
});

function decoded(href) {
  return decodeURIComponent(href.split('?text=')[1]);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('diamond details: CTA with the official number, an exact encoded public message and safe target', {}, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-whatsapp').hidden);
    const state = await page.evaluate(ctaState, 'dd-whatsapp');
    expect(state.text === 'Enquire on WhatsApp' && state.hasIcon, 'premium labelled CTA with icon');
    expect(state.target === '_blank' && /noopener/.test(state.rel) && /noreferrer/.test(state.rel),
      'safe external-link handling, got ' + state.rel);
    expect(state.href.startsWith('https://wa.me/' + OFFICIAL + '?text='),
      'official number used as the fallback, got ' + state.href.slice(0, 40));
    const encodedPart = state.href.split('?text=')[1];
    expect(!encodedPart.includes(' ') && encodedPart.includes('%20') && encodedPart.includes('%0A'),
      'message is URL-encoded (no raw spaces or newlines)');
    const expected = [
      'Hello New Grown Diamond,', '',
      'I am interested in this diamond.', '',
      'Stock ID: NGD-1001', 'Shape: Round', 'Carat: 1.52 ct', 'Color: D', 'Clarity: VVS1',
      'Certificate: IGI LG77110001',
      'Product Link: ' + SITE + '/diamond-details.html?id=DIA-SEED0001', '',
      'Please share more details.',
    ].join('\n');
    const message = decoded(state.href);
    expect(message === expected, 'EXACTLY the public facts + current URL — nothing more. Got:\n' + message);
    expect(!/18500|price|uuid-|eyJ|Bearer|sb_publishable/i.test(message),
      'no price, internal id or token material anywhere');
    /* existing actions untouched */
    const actions = await page.evaluate(() => ({
      quote: !!document.getElementById('dd-quote'), hold: !!document.getElementById('dd-hold'),
      inspect: !!document.getElementById('dd-inspect'),
      fav: document.getElementById('dd-fav').hasAttribute('aria-pressed'),
      compare: !document.getElementById('dd-compare').hidden,
    }));
    expect(actions.quote && actions.hold && actions.inspect && actions.fav && actions.compare,
      'quote / hold / inspection / favourite / compare all still present');
    /* analytics hook — public facts only */
    const detail = await page.evaluate(() => new Promise((resolve) => {
      window.addEventListener('ngd:whatsapp-enquiry', (e) => resolve(e.detail), { once: true });
      const cta = document.getElementById('dd-whatsapp');
      cta.addEventListener('click', (e) => e.preventDefault());
      cta.click();
    }));
    expect(detail.productType === 'diamond' && detail.productId === 'DIA-SEED0001' &&
      Object.keys(detail).length === 2, 'analytics event carries only type + public id: ' + JSON.stringify(detail));
  });

  await scenario('missing values simply vanish — never "undefined", "null" or placeholder dashes', {}, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0002', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-whatsapp').hidden);
    const message = await page.evaluate(() =>
      decodeURIComponent(document.getElementById('dd-whatsapp').getAttribute('href').split('?text=')[1]));
    expect(!/undefined|null|—/.test(message), 'no fabricated values, got:\n' + message);
    expect(!message.includes('Color:') && !message.includes('Clarity:') && !message.includes('Certificate:'),
      'missing fields drop their whole line');
    expect(message.includes('Stock ID: NGD-1002') && message.includes('Shape: Oval') &&
      message.includes('Carat: 2.02 ct') &&
      message.includes('Product Link: ' + SITE + '/diamond-details.html?id=DIA-SEED0002'),
      'present fields still listed');
    expect(!/7777|price/i.test(message), 'the hidden price never enters the message');
  });

  await scenario('jewellery details: CTA with an exact public message and the analytics hook', {}, async (page) => {
    await page.goto(SITE + '/jewellery-details.html?id=JEW-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('jd-whatsapp').hidden);
    const state = await page.evaluate(ctaState, 'jd-whatsapp');
    expect(state.text === 'Enquire on WhatsApp' && state.target === '_blank' &&
      /noopener/.test(state.rel) && /noreferrer/.test(state.rel), 'labelled CTA with safe target');
    expect(state.href.startsWith('https://wa.me/' + OFFICIAL + '?text='), 'official number fallback');
    const expected = [
      'Hello New Grown Diamond,', '',
      'I am interested in this jewellery product.', '',
      'Product: Aurora Halo Ring', 'SKU: NGD-J-01', 'Category: Rings',
      'Product Link: ' + SITE + '/jewellery-details.html?id=JEW-SEED0001', '',
      'Please share more details.',
    ].join('\n');
    const message = decoded(state.href);
    expect(message === expected, 'EXACTLY the public facts + current URL. Got:\n' + message);
    expect(!/2900|price|uuid-j/i.test(message), 'no hidden price or internal id');
    const actions = await page.evaluate(() => ({
      quote: !!document.getElementById('jd-quote'), hold: !!document.getElementById('jd-hold'),
      enquire: !!document.getElementById('jd-enquire'),
      fav: document.getElementById('jd-fav').hasAttribute('aria-pressed'),
    }));
    expect(actions.quote && actions.hold && actions.enquire && actions.fav, 'existing jewellery actions intact');
    const detail = await page.evaluate(() => new Promise((resolve) => {
      window.addEventListener('ngd:whatsapp-enquiry', (e) => resolve(e.detail), { once: true });
      const cta = document.getElementById('jd-whatsapp');
      cta.addEventListener('click', (e) => e.preventDefault());
      cta.click();
    }));
    expect(detail.productType === 'jewellery' && detail.productId === 'JEW-SEED0001', 'analytics event fired');
  });

  await scenario('a valid Settings number is preferred — on the product CTA and the contact card alike', {
    settings: settingsRows({ whatsapp_number: '+91 91234 56789', contact_phone: '+91 98765 43210' }),
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      !document.getElementById('dd-whatsapp').hidden &&
      (document.getElementById('dd-whatsapp').getAttribute('href') || '').includes('919123456789'));
    const href = await page.evaluate(() => document.getElementById('dd-whatsapp').getAttribute('href'));
    expect(href.startsWith('https://wa.me/919123456789?text='), 'configured number wins, got ' + href.slice(0, 44));
    await page.goto(SITE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('[data-ngd-whatsapp]'));
    const contact = await page.evaluate(() =>
      document.querySelector('[data-ngd-whatsapp]').getAttribute('href'));
    expect(contact === 'https://wa.me/919123456789', 'the contact card resolves through the same helper');
  });

  await scenario('without a configured number the contact card falls back to the official line', {
    settings: settingsRows({ contact_phone: '+91 98765 43210' }),
  }, async (page) => {
    await page.goto(SITE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('[data-ngd-whatsapp]'));
    const href = await page.evaluate(() =>
      document.querySelector('[data-ngd-whatsapp]').getAttribute('href'));
    expect(href === 'https://wa.me/' + OFFICIAL, 'official fallback number on the contact card, got ' + href);
  });

  await scenario('unavailable or unknown products never show a WhatsApp CTA', {}, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0003', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-notfound').classList.contains('d-none'));
    const inactive = await page.evaluate(() => document.getElementById('dd-whatsapp').hidden);
    expect(inactive, 'inactive stone: CTA stays hidden with the not-available state');
    await page.goto(SITE + '/diamond-details.html?id=not-a-real-id', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-notfound').classList.contains('d-none'));
    const malformed = await page.evaluate(() => document.getElementById('dd-whatsapp').hidden);
    expect(malformed, 'malformed id: CTA stays hidden');
  });

  await scenario('the Settings enquiry toggles hide the WhatsApp CTAs like every other enquiry action', {
    settings: settingsRows({ feature_diamond_enquiry: 'false', feature_jewellery_enquiry: 'false' }),
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      getComputedStyle(document.getElementById('dd-whatsapp')).display === 'none');
    await page.goto(SITE + '/jewellery-details.html?id=JEW-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      getComputedStyle(document.getElementById('jd-whatsapp')).display === 'none' &&
      getComputedStyle(document.getElementById('jd-enquire')).display === 'none');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} whatsapp-enquiry scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
