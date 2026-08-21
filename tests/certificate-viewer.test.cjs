/* ============================================================
   Diamond Certificate Viewer tests (LIVE).
   Drives the upgraded certificate card on diamond-details.html:
   lab + report render from the live row, a validated http(s)
   certificate_url unlocks View Certificate (image → modal <img>,
   PDF → modal iframe with an Open PDF fallback, other pages →
   a direct safe external link), unsafe protocols are refused,
   number-only stones show exactly the number (no invented lab
   verification URLs), missing data falls back to "Certificate
   details available on request" with no undefined/null/dash
   debris, the modal stays usable at 390px, the WhatsApp message
   keeps lab + report but never the certificate URL, and every
   existing action (quote/hold/inspection/favourite/compare/
   WhatsApp) keeps working.
   Run:  node tests/certificate-viewer.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://cert-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAABAAAAAQCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const IMG_CERT = SB_HOST + '/storage/v1/object/public/site-media/content/cert-seed0001.png';
const PDF_CERT = SB_HOST + '/storage/v1/object/public/site-media/content/cert-seed0002.pdf';
const LINK_CERT = 'https://www.igi.org/reports/verify-your-report?r=LG77110005';

function seedDiamonds() {
  const base = {
    shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
    certificate_url: null,
    measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
    ratio: 1, growth_method: 'CVD', availability: 'In Stock', image_path: null,
    featured: false, active: true, archived_at: null,
    total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: false,
    created_at: '2026-08-10T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001', certificate_url: IMG_CERT },
    { ...base, id: 'uuid-d2', public_id: 'DIA-SEED0002', stock_number: 'NGD-1002', certificate_url: PDF_CERT, report_number: 'LG77110002', certificate_number: 'LG77110002' },
    { ...base, id: 'uuid-d5', public_id: 'DIA-SEED0005', stock_number: 'NGD-1005', certificate_url: LINK_CERT, report_number: 'LG77110005', certificate_number: 'LG77110005' },
    { ...base, id: 'uuid-d6', public_id: 'DIA-SEED0006', stock_number: 'NGD-1006', certificate_url: 'javascript:alert(1)' },
    { ...base, id: 'uuid-d7', public_id: 'DIA-SEED0007', stock_number: 'NGD-1007' },
    { ...base, id: 'uuid-d8', public_id: 'DIA-SEED0008', stock_number: 'NGD-1008', laboratory: null, report_number: null, certificate_number: null },
  ];
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function makeMock() {
  const diamonds = seedDiamonds();
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
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      return json(200, rows);
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

async function openStone(page, id) {
  await page.goto(SITE + '/diamond-details.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.getElementById('dd-product').classList.contains('d-none') &&
    document.getElementById('dd-cert-no') !== null &&
    !document.getElementById('dd-loading').offsetParent);
  await page.waitForFunction(() => document.getElementById('dd-stock').textContent.trim().length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('image certificate: lab + report shown, View Certificate opens the modal preview', {}, async (page) => {
    await openStone(page, 'DIA-SEED0001');
    const card = await page.evaluate(() => ({
      lab: document.getElementById('dd-cert-lab').textContent,
      sep: document.getElementById('dd-cert-sep').textContent,
      no: document.getElementById('dd-cert-no').textContent,
      fallbackHidden: document.getElementById('dd-cert-fallback').hidden,
      viewShown: !document.getElementById('dd-cert-view').hidden &&
        !document.getElementById('dd-cert-actions').hidden,
      openHidden: document.getElementById('dd-cert-open').hidden,
      badge: document.getElementById('dd-lab-badge').textContent,
    }));
    expect(card.lab === 'IGI Laboratory' && card.sep === ' · Report ' && card.no === 'LG77110001',
      'grading lab and report number shown, got "' + card.lab + card.sep + card.no + '"');
    expect(card.fallbackHidden && card.viewShown && card.openHidden, 'View Certificate button offered');
    expect(card.badge === 'IGI Certified', 'stage badge intact');
    await page.click('#dd-cert-view');
    await page.waitForSelector('#dd-cert-modal.show', { timeout: 5000 });
    const modal = await page.evaluate(() => ({
      imgSrc: (document.querySelector('#dd-cert-modal-body img') || { getAttribute: () => null }).getAttribute('src'),
      imgAlt: (document.querySelector('#dd-cert-modal-body img') || { getAttribute: () => '' }).getAttribute('alt'),
      openHref: document.getElementById('dd-cert-modal-open').getAttribute('href'),
      openTarget: document.getElementById('dd-cert-modal-open').getAttribute('target'),
      openRel: document.getElementById('dd-cert-modal-open').getAttribute('rel'),
      openText: document.getElementById('dd-cert-modal-open').textContent.trim(),
    }));
    expect(modal.imgSrc && modal.imgSrc.endsWith('/cert-seed0001.png') && /certificate/i.test(modal.imgAlt),
      'the certificate image previews in the modal, got ' + modal.imgSrc);
    expect(modal.openHref === modal.imgSrc && modal.openTarget === '_blank' &&
      /noopener/.test(modal.openRel) && /noreferrer/.test(modal.openRel) && modal.openText === 'Open in new tab',
      'external fallback link is safe and honest');
    await page.click('#dd-cert-modal .btn-close');
    await page.waitForFunction(() => document.getElementById('dd-cert-modal-body').innerHTML === '');
    /* existing actions untouched */
    const actions = await page.evaluate(() => ({
      quote: !!document.getElementById('dd-quote'), hold: !!document.getElementById('dd-hold'),
      inspect: !!document.getElementById('dd-inspect'),
      fav: document.getElementById('dd-fav').hasAttribute('aria-pressed'),
      compare: !document.getElementById('dd-compare').hidden,
      whatsapp: !document.getElementById('dd-whatsapp').hidden,
    }));
    expect(actions.quote && actions.hold && actions.inspect && actions.fav && actions.compare && actions.whatsapp,
      'quote / hold / inspection / favourite / compare / WhatsApp all still live');
  });

  await scenario('PDF certificate: modal iframe preview with an Open PDF fallback', {}, async (page) => {
    await openStone(page, 'DIA-SEED0002');
    await page.click('#dd-cert-view');
    await page.waitForSelector('#dd-cert-modal.show', { timeout: 5000 });
    const modal = await page.evaluate(() => ({
      frameSrc: (document.querySelector('#dd-cert-modal-body iframe') || { getAttribute: () => null }).getAttribute('src'),
      frameTitle: (document.querySelector('#dd-cert-modal-body iframe') || { getAttribute: () => '' }).getAttribute('title'),
      openText: document.getElementById('dd-cert-modal-open').textContent.trim(),
      openHref: document.getElementById('dd-cert-modal-open').getAttribute('href'),
      note: document.querySelector('#dd-cert-modal .modal-footer p').textContent,
    }));
    expect(modal.frameSrc && modal.frameSrc.endsWith('/cert-seed0002.pdf') && modal.frameTitle.length > 0,
      'PDF embeds in a titled iframe, got ' + modal.frameSrc);
    expect(modal.openText === 'Open PDF' && modal.openHref === modal.frameSrc, 'Open PDF fallback offered');
    expect(/open it in a new tab/i.test(modal.note), 'unsupported-viewer note present');
  });

  await scenario('external certificate page: a direct safe link, no modal', {}, async (page) => {
    await openStone(page, 'DIA-SEED0005');
    const state = await page.evaluate(() => ({
      viewHidden: document.getElementById('dd-cert-view').hidden,
      openShown: !document.getElementById('dd-cert-open').hidden,
      href: document.getElementById('dd-cert-open').getAttribute('href'),
      target: document.getElementById('dd-cert-open').getAttribute('target'),
      rel: document.getElementById('dd-cert-open').getAttribute('rel'),
      text: document.getElementById('dd-cert-open').textContent.trim(),
    }));
    expect(state.viewHidden && state.openShown, 'external pages skip the embed');
    expect(state.href === 'https://www.igi.org/reports/verify-your-report?r=LG77110005' &&
      state.target === '_blank' && /noopener/.test(state.rel) && /noreferrer/.test(state.rel) &&
      state.text === 'View Certificate', 'safe external certificate link, got ' + state.href);
  });

  await scenario('unsafe protocols are refused — treated as no certificate URL', {}, async (page) => {
    await openStone(page, 'DIA-SEED0006');
    const state = await page.evaluate(() => ({
      actionsHidden: document.getElementById('dd-cert-actions').hidden,
      lab: document.getElementById('dd-cert-lab').textContent,
      no: document.getElementById('dd-cert-no').textContent,
      badHrefs: document.querySelectorAll('a[href^="javascript:"]').length,
    }));
    expect(state.actionsHidden, 'javascript: URL produces no certificate action');
    expect(state.lab === 'IGI Laboratory' && state.no === 'LG77110001', 'lab + report still shown honestly');
    expect(state.badHrefs === 0, 'no javascript: href anywhere on the page');
  });

  await scenario('number-only stones show exactly the number — no invented verification URLs', {}, async (page) => {
    await openStone(page, 'DIA-SEED0007');
    const state = await page.evaluate(() => ({
      lab: document.getElementById('dd-cert-lab').textContent,
      no: document.getElementById('dd-cert-no').textContent,
      actionsHidden: document.getElementById('dd-cert-actions').hidden,
      fallbackHidden: document.getElementById('dd-cert-fallback').hidden,
      inventedLinks: document.querySelectorAll('#dd-cert a[href*="igi.org"], #dd-cert a[href*="gia.edu"]').length,
    }));
    expect(state.lab === 'IGI Laboratory' && state.no === 'LG77110001', 'lab + report rendered');
    expect(state.actionsHidden && state.fallbackHidden, 'no view action, no fallback text');
    expect(state.inventedLinks === 0, 'no guessed lab verification URLs');
  });

  await scenario('no certificate data at all: the tasteful request fallback, no debris', {}, async (page) => {
    await openStone(page, 'DIA-SEED0008');
    const state = await page.evaluate(() => ({
      fallbackShown: !document.getElementById('dd-cert-fallback').hidden,
      fallbackText: document.getElementById('dd-cert-fallback').textContent.trim(),
      infoHidden: document.getElementById('dd-cert-info').hidden,
      actionsHidden: document.getElementById('dd-cert-actions').hidden,
      cardText: document.getElementById('dd-cert').textContent,
      badgeHidden: document.getElementById('dd-lab-badge').hidden,
    }));
    expect(state.fallbackShown && state.fallbackText === 'Certificate details available on request.',
      'the honest fallback line, got ' + state.fallbackText);
    expect(state.infoHidden && state.actionsHidden, 'no empty info line, no dead button');
    expect(!/undefined|null|—/.test(state.cardText.replace(/\s+/g, ' ')),
      'no undefined/null/dash debris in the card');
    expect(state.badgeHidden, 'the stage lab badge hides without a lab');
  });

  await scenario('mobile 390: tappable card actions and a modal that fits the screen', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await openStone(page, 'DIA-SEED0001');
    const before = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(before, 'no page overflow with the certificate card');
    const buttonBox = await page.locator('#dd-cert-view').boundingBox();
    expect(buttonBox && buttonBox.height >= 36, 'View Certificate stays comfortably tappable, got ' +
      (buttonBox && buttonBox.height));
    await page.click('#dd-cert-view');
    await page.waitForSelector('#dd-cert-modal.show', { timeout: 5000 });
    const dialogBox = await page.locator('#dd-cert-modal .modal-dialog').boundingBox();
    expect(dialogBox && dialogBox.width <= 390 + 1, 'modal never overflows the viewport, got ' +
      (dialogBox && dialogBox.width));
  });

  await scenario('the WhatsApp message keeps lab + report but never the certificate URL', {}, async (page) => {
    await openStone(page, 'DIA-SEED0001');
    await page.waitForFunction(() => !document.getElementById('dd-whatsapp').hidden);
    const message = await page.evaluate(() =>
      decodeURIComponent(document.getElementById('dd-whatsapp').getAttribute('href').split('?text=')[1]));
    expect(message.includes('Certificate: IGI LG77110001'), 'lab + report in the enquiry message');
    expect(!message.includes('cert-seed0001') && !message.includes('storage/v1'),
      'certificate storage paths never enter the message');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} certificate-viewer scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
