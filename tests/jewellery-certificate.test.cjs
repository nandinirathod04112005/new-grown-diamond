/* ============================================================
   Jewellery Certificate Viewer tests (LIVE).
   Drives the upgraded certificate card on jewellery-details.html:
   lab + report render from the live row, a validated http(s)
   certificate_url unlocks View Certificate (image → modal <img>,
   PDF → modal iframe with an Open PDF fallback, other pages →
   a direct safe external link), unsafe protocols are refused,
   number-without-URL pieces show the honest "Certificate copy
   available on request." line instead of a dead button, all-metal
   pieces keep their hallmarked message with no debris, and the
   modal stays usable at 390px while the existing CTAs keep
   working.
   Run:  node tests/jewellery-certificate.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://jwcert-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const IMG_CERT = SB_HOST + '/storage/v1/object/public/product-certificates/jewellery/JEW-CERT0001/aaaabbbbcccc0001.png';
const PDF_CERT = SB_HOST + '/storage/v1/object/public/product-certificates/jewellery/JEW-CERT0002/aaaabbbbcccc0002.pdf';
const LINK_CERT = 'https://www.igi.org/verify.php?r=NGDJ-1003';

function seedJewellery() {
  const base = {
    subcategory: 'Solitaire', short_description: 'A quiet signature piece.',
    description: 'The longer atelier story of this piece.',
    metal: 'Gold', metal_karat: '18K', metal_color: 'White', gross_weight: 4.52,
    diamond_weight: 1.45, diamond_pieces: 25, diamond_quality: 'E–F / VVS',
    diamond_shape: 'Round', size: 'Ring size 52',
    price: 5200, currency: 'USD', price_visible: false,
    availability: 'available', featured: false, active: true, archived_at: null,
    created_at: '2026-08-10T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-jc-01', public_id: 'JEW-CERT0001', sku: 'JW-2101', product_name: 'Image Cert Ring', category: 'Rings', certificate_number: 'NGDJ-1001', certificate_lab: 'IGI', certificate_url: IMG_CERT },
    { ...base, id: 'uuid-jc-02', public_id: 'JEW-CERT0002', sku: 'JW-2102', product_name: 'PDF Cert Pendant', category: 'Pendants', certificate_number: 'NGDJ-1002', certificate_lab: 'GIA', certificate_url: PDF_CERT },
    { ...base, id: 'uuid-jc-03', public_id: 'JEW-CERT0003', sku: 'JW-2103', product_name: 'Linked Cert Ring', category: 'Rings', certificate_number: 'NGDJ-1003', certificate_lab: 'IGI', certificate_url: LINK_CERT },
    { ...base, id: 'uuid-jc-04', public_id: 'JEW-CERT0004', sku: 'JW-2104', product_name: 'Unsafe URL Ring', category: 'Rings', certificate_number: 'NGDJ-1004', certificate_lab: 'IGI', certificate_url: 'javascript:alert(1)' },
    { ...base, id: 'uuid-jc-05', public_id: 'JEW-CERT0005', sku: 'JW-2105', product_name: 'Number Only Ring', category: 'Rings', certificate_number: 'NGDJ-1005', certificate_lab: null, certificate_url: null },
    { ...base, id: 'uuid-jc-06', public_id: 'JEW-CERT0006', sku: 'JW-2106', product_name: 'Plain Gold Bangle', category: 'Bangles', diamond_weight: null, diamond_pieces: null, diamond_quality: null, diamond_shape: null, certificate_number: null, certificate_lab: null, certificate_url: null, gross_weight: null, size: null },
  ];
}

function makeMock() {
  const jewellery = seedJewellery();
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
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = jewellery.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((j) => j.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((j) => !j.archived_at);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((j) => j.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((j) => j.public_id !== pub.slice(4));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery_images' && method === 'GET') return json(200, []);
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      if (url.pathname.endsWith('.pdf')) {
        return route.fulfill({ status: 200, contentType: 'application/pdf', headers: CORS, body: Buffer.from('%PDF-1.4\n%%EOF\n') });
      }
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

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
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

async function openPiece(page, id) {
  await page.goto(SITE + '/jewellery-details.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#jd-product:not(.d-none)', { timeout: 10000 });
  await page.waitForFunction(() => document.getElementById('jd-cert-text').textContent.trim().length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('image certificate: lab + report shown, View Certificate opens the modal preview', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0001');
    const card = await page.evaluate(() => ({
      text: document.getElementById('jd-cert-text').textContent.trim(),
      fallbackHidden: document.getElementById('jd-cert-fallback').hidden,
      viewShown: !document.getElementById('jd-cert-view').hidden &&
        !document.getElementById('jd-cert-actions').hidden,
      openHidden: document.getElementById('jd-cert-open').hidden,
    }));
    expect(card.text === 'Stones graded E–F / VVS · IGI Report NGDJ-1001',
      'quality, lab and report on the card, got "' + card.text + '"');
    expect(card.fallbackHidden && card.viewShown && card.openHidden, 'View Certificate button offered');
    await page.click('#jd-cert-view');
    await page.waitForSelector('#jd-cert-modal.show', { timeout: 5000 });
    const modal = await page.evaluate(() => ({
      imgSrc: (document.querySelector('#jd-cert-modal-body img') || { getAttribute: () => null }).getAttribute('src'),
      imgAlt: (document.querySelector('#jd-cert-modal-body img') || { getAttribute: () => '' }).getAttribute('alt'),
      openHref: document.getElementById('jd-cert-modal-open').getAttribute('href'),
      openTarget: document.getElementById('jd-cert-modal-open').getAttribute('target'),
      openRel: document.getElementById('jd-cert-modal-open').getAttribute('rel'),
      openText: document.getElementById('jd-cert-modal-open').textContent.trim(),
    }));
    expect(modal.imgSrc && modal.imgSrc.endsWith('/aaaabbbbcccc0001.png') && /IGI.*certificate/i.test(modal.imgAlt),
      'the certificate image previews in the modal, got ' + modal.imgSrc);
    expect(modal.openHref === modal.imgSrc && modal.openTarget === '_blank' &&
      /noopener/.test(modal.openRel) && /noreferrer/.test(modal.openRel) && modal.openText === 'Open in new tab',
      'external fallback link is safe and honest');
    await page.click('#jd-cert-modal .btn-close');
    await page.waitForFunction(() => document.getElementById('jd-cert-modal-body').innerHTML === '');
    /* existing actions untouched */
    const actions = await page.evaluate(() => ({
      enquire: (document.getElementById('jd-enquire').getAttribute('href') || '').includes('contact.html'),
      quote: !!document.getElementById('jd-quote'), hold: !!document.getElementById('jd-hold'),
      fav: document.getElementById('jd-fav').hasAttribute('aria-pressed'),
    }));
    expect(actions.enquire && actions.quote && actions.hold && actions.fav,
      'enquire / quote / hold / favourite all still live');
  });

  await scenario('PDF certificate: modal iframe preview with an Open PDF fallback', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0002');
    const text = await page.evaluate(() => document.getElementById('jd-cert-text').textContent.trim());
    expect(text === 'Stones graded E–F / VVS · GIA Report NGDJ-1002', 'GIA line, got "' + text + '"');
    await page.click('#jd-cert-view');
    await page.waitForSelector('#jd-cert-modal.show', { timeout: 5000 });
    const modal = await page.evaluate(() => ({
      frameSrc: (document.querySelector('#jd-cert-modal-body iframe') || { getAttribute: () => null }).getAttribute('src'),
      frameTitle: (document.querySelector('#jd-cert-modal-body iframe') || { getAttribute: () => '' }).getAttribute('title'),
      openText: document.getElementById('jd-cert-modal-open').textContent.trim(),
      openHref: document.getElementById('jd-cert-modal-open').getAttribute('href'),
      note: document.querySelector('#jd-cert-modal .modal-footer p').textContent,
    }));
    expect(modal.frameSrc && modal.frameSrc.endsWith('/aaaabbbbcccc0002.pdf') && modal.frameTitle.length > 0,
      'PDF embeds in a titled iframe, got ' + modal.frameSrc);
    expect(modal.openText === 'Open PDF' && modal.openHref === modal.frameSrc, 'Open PDF fallback offered');
    expect(/open it in a new tab/i.test(modal.note), 'unsupported-viewer note present');
  });

  await scenario('external certificate page: a direct safe link, no modal', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0003');
    const state = await page.evaluate(() => ({
      viewHidden: document.getElementById('jd-cert-view').hidden,
      openShown: !document.getElementById('jd-cert-open').hidden,
      href: document.getElementById('jd-cert-open').getAttribute('href'),
      target: document.getElementById('jd-cert-open').getAttribute('target'),
      rel: document.getElementById('jd-cert-open').getAttribute('rel'),
      text: document.getElementById('jd-cert-open').textContent.trim(),
    }));
    expect(state.viewHidden && state.openShown, 'external pages skip the embed');
    expect(state.href === 'https://www.igi.org/verify.php?r=NGDJ-1003' &&
      state.target === '_blank' && /noopener/.test(state.rel) && /noreferrer/.test(state.rel) &&
      state.text === 'View Certificate', 'safe external certificate link, got ' + state.href);
  });

  await scenario('unsafe protocols are refused — the honest on-request line instead', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0004');
    const state = await page.evaluate(() => ({
      actionsHidden: document.getElementById('jd-cert-actions').hidden,
      text: document.getElementById('jd-cert-text').textContent.trim(),
      fallbackShown: !document.getElementById('jd-cert-fallback').hidden,
      fallbackText: document.getElementById('jd-cert-fallback').textContent.trim(),
      badHrefs: document.querySelectorAll('a[href^="javascript:"]').length,
      bodyHtml: document.getElementById('jd-cert').innerHTML,
    }));
    expect(state.actionsHidden, 'javascript: URL produces no certificate action');
    expect(state.text === 'Stones graded E–F / VVS · IGI Report NGDJ-1004', 'lab + report still shown honestly');
    expect(state.fallbackShown && state.fallbackText === 'Certificate copy available on request.',
      'the on-request line covers the missing copy');
    expect(state.badHrefs === 0 && !state.bodyHtml.includes('javascript:alert'),
      'the unsafe URL never enters the card markup');
  });

  await scenario('number-only pieces: exactly the number plus the on-request line, no dead button', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0005');
    const state = await page.evaluate(() => ({
      text: document.getElementById('jd-cert-text').textContent.trim(),
      fallbackShown: !document.getElementById('jd-cert-fallback').hidden,
      actionsHidden: document.getElementById('jd-cert-actions').hidden,
      disabledButtons: document.querySelectorAll('#jd-cert button[disabled]').length,
      inventedLinks: document.querySelectorAll('#jd-cert a[href*="igi.org"], #jd-cert a[href*="gia.edu"]').length,
    }));
    expect(state.text === 'Stones graded E–F / VVS · Report NGDJ-1005', 'plain report line, got "' + state.text + '"');
    expect(state.fallbackShown && state.actionsHidden && state.disabledButtons === 0,
      'on-request line instead of a disabled placeholder button');
    expect(state.inventedLinks === 0, 'no guessed lab verification URLs');
  });

  await scenario('all-metal pieces keep the hallmarked message — no button, no debris', {}, async (page) => {
    await openPiece(page, 'JEW-CERT0006');
    const state = await page.evaluate(() => ({
      text: document.getElementById('jd-cert-text').textContent.trim(),
      fallbackHidden: document.getElementById('jd-cert-fallback').hidden,
      actionsHidden: document.getElementById('jd-cert-actions').hidden,
      cardText: document.getElementById('jd-cert').textContent,
    }));
    expect(/An all-metal piece — hallmarked 18K White Gold, no diamond certificate applies\./.test(state.text),
      'the hallmarked fallback, got "' + state.text + '"');
    expect(state.fallbackHidden && state.actionsHidden, 'no on-request line, no dead button');
    expect(!/undefined|null|—\s*·/.test(state.cardText.replace(/\s+/g, ' ')),
      'no undefined/null debris in the card');
  });

  await scenario('mobile 390: tappable View Certificate and a modal that fits the screen', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await openPiece(page, 'JEW-CERT0001');
    const before = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(before, 'no page overflow with the certificate card');
    const buttonBox = await page.locator('#jd-cert-view').boundingBox();
    expect(buttonBox && buttonBox.height >= 36, 'View Certificate stays comfortably tappable, got ' +
      (buttonBox && buttonBox.height));
    await page.click('#jd-cert-view');
    await page.waitForSelector('#jd-cert-modal.show', { timeout: 5000 });
    const dialogBox = await page.locator('#jd-cert-modal .modal-dialog').boundingBox();
    expect(dialogBox && dialogBox.width <= 390 + 1, 'modal never overflows the viewport, got ' +
      (dialogBox && dialogBox.width));
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-certificate scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
