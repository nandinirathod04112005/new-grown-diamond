/* ============================================================
   Jewellery Details page tests (STEP 12).
   Verifies ?id= resolution, the four-view gallery (incl. the
   prepared 360° slot), zoom + tilt, all fifteen product fields,
   CTAs, certificate/quality section, descriptions, grouped spec
   table, similar pieces and responsive behaviour at 1440/768/390.
   Run:  node tests/jewellery-details.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SPEC_LABELS = ['Product Name', 'SKU', 'Category', 'Subcategory', 'Metal', 'Metal Karat',
  'Metal Colour', 'Diamond Weight', 'Diamond Pieces', 'Diamond Quality', 'Diamond Shape',
  'Certificate Number', 'Gross Weight', 'Size', 'Availability'];

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

async function open(page, query) {
  await page.goto(`${SITE}/jewellery-details.html${query || ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#jd-name, #jd-notfound:not(.d-none)');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('?id=JW-1002 renders that piece with all 15 product fields', {}, async (page) => {
    await open(page, '?id=JW-1002');
    const state = await page.evaluate(() => {
      const piece = window.NGD_DEMO_JEWELLERY.find((p) => p.id === 'JW-1002');
      return {
        piece,
        sku: document.getElementById('jd-sku').textContent.trim(),
        name: document.getElementById('jd-name').textContent.trim(),
        docTitle: document.title,
        short: document.getElementById('jd-short').textContent.trim(),
        labels: [...document.querySelectorAll('#jd-specs dt')].map((d) => d.textContent.trim()),
        values: [...document.querySelectorAll('#jd-specs dd')].map((d) => d.textContent.trim()),
        header: !!document.querySelector('.ngd-navbar'),
        footer: !!document.querySelector('footer.ngd-footer'),
      };
    });
    expect(state.sku === 'JW-1002', 'SKU eyebrow, got ' + state.sku);
    expect(state.name === 'Éclat Halo Ring', 'product name, got ' + state.name);
    expect(state.docTitle.includes('JW-1002'), 'document title updated');
    expect(state.short === state.piece.description, 'short description shown');
    expect(JSON.stringify(state.labels) === JSON.stringify(SPEC_LABELS),
      'all 15 fields in order, got ' + state.labels.length + ': ' + state.labels.join(','));
    expect(state.values.every((v) => v.length > 0), 'all field values filled');
    expect(state.values.includes(state.piece.certificateNo), 'certificate number rendered');
    expect(state.values.includes('Cushion'), 'diamond shape rendered');
    expect(state.values.includes(state.piece.grossWeight.toFixed(2) + ' g'), 'gross weight rendered');
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('no id falls back to the first piece; unknown id shows not-found', {}, async (page) => {
    await open(page);
    expect((await page.textContent('#jd-sku')).trim() === 'JW-1001', 'defaults to first piece');
    await open(page, '?id=JW-9999');
    const state = await page.evaluate(() => ({
      notFound: !document.getElementById('jd-notfound').classList.contains('d-none'),
      productHidden: document.getElementById('jd-product').classList.contains('d-none'),
      backLink: !!document.querySelector('#jd-notfound a[href="jewellery.html"]'),
    }));
    expect(state.notFound && state.productHidden, 'not-found state shown, product hidden');
    expect(state.backLink, 'back to collection CTA present');
  });

  await scenario('gallery: four thumbnails incl. the prepared 360° slot', {}, async (page) => {
    await open(page, '?id=JW-1001');
    const thumbs = await page.$$eval('#jd-thumbs .ngd-thumb', (els) =>
      els.map((e) => e.getAttribute('data-view')));
    expect(JSON.stringify(thumbs) === JSON.stringify(['front', 'detail', 'profile', 'spin']),
      'four views, got ' + thumbs.join(','));
    expect(await page.getAttribute('#jd-stage', 'data-view') === 'front', 'front view initially');
    await page.click('.ngd-thumb[data-view="detail"]');
    await page.waitForFunction(() =>
      document.getElementById('jd-stage').getAttribute('data-view') === 'detail');
    const cropped = await page.$eval('#jd-stage-inner svg g[transform]',
      (g) => g.getAttribute('transform'));
    expect(/scale/.test(cropped), 'detail view crops via transform');
    await page.click('.ngd-thumb[data-view="profile"]');
    await page.waitForFunction(() =>
      document.getElementById('jd-stage').getAttribute('data-view') === 'profile');
    /* the prepared 360° slot: placeholder panel, zoom disabled, no fake spin */
    await page.click('.ngd-thumb[data-view="spin"]');
    await page.waitForFunction(() =>
      document.getElementById('jd-stage').getAttribute('data-view') === 'spin');
    const spin = await page.evaluate(() => ({
      panel: !!document.querySelector('#jd-stage .ngd-jd-360'),
      soon: document.querySelector('#jd-stage .ngd-jd-360 .ngd-badge').textContent.trim(),
      static: document.getElementById('jd-stage').classList.contains('is-static'),
      tag: document.querySelector('.ngd-thumb[data-view="spin"] .ngd-thumb-tag').textContent.trim(),
    }));
    expect(spin.panel, '360° placeholder panel shown');
    expect(spin.soon === 'Coming soon', '360° marked coming soon');
    expect(spin.static, 'stage static on the 360° slot');
    expect(spin.tag === 'Soon', '360° thumb tagged');
    await page.click('#jd-stage');
    const zoomed = await page.$eval('#jd-stage', (s) => s.classList.contains('is-zoomed'));
    expect(!zoomed, 'zoom disabled on the 360° slot');
  });

  await scenario('zoom + tilt: click zooms, pointer steers, Escape exits, tilt wraps the stage', {}, async (page) => {
    await open(page, '?id=JW-1001');
    const stage = page.locator('#jd-stage');
    await stage.scrollIntoViewIfNeeded();
    await stage.click();
    await page.waitForSelector('#jd-stage.is-zoomed');
    const scale = await page.$eval('#jd-stage-inner', (el) => getComputedStyle(el).transform);
    expect(scale !== 'none', 'inner scaled when zoomed');
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3);
    await page.waitForFunction(() =>
      document.getElementById('jd-stage-inner').style.transformOrigin !== '');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() =>
      !document.getElementById('jd-stage').classList.contains('is-zoomed'));
    /* subtle 3D tilt on the gallery wrapper */
    const wrap = page.locator('#jewellery-detail [data-ngd-tilt]').first();
    const wbox = await wrap.boundingBox();
    await page.mouse.move(wbox.x + wbox.width * 0.8, wbox.y + wbox.height * 0.2);
    await page.waitForTimeout(120);
    const tilt = await wrap.evaluate((el) => el.style.transform);
    expect(/perspective/.test(tilt), 'tilt applied to the gallery, got ' + (tilt || 'none'));
  });

  await scenario('CTAs: quote + enquire link with the piece ref; favourite toggles + syncs', {}, async (page) => {
    await open(page, '?id=JW-1005');
    const hrefs = await page.evaluate(() => ({
      quote: document.getElementById('jd-quote').getAttribute('href'),
      enquire: document.getElementById('jd-enquire').getAttribute('href'),
      sticky: document.getElementById('jd-sticky-quote').getAttribute('href'),
    }));
    expect(hrefs.quote === 'contact.html?piece=JW-1005&type=quote', 'quote href, got ' + hrefs.quote);
    expect(hrefs.enquire === 'contact.html?piece=JW-1005&type=enquiry', 'enquire href');
    expect(hrefs.sticky === hrefs.quote, 'sticky quote matches');
    await page.click('#jd-fav');
    const fav = await page.evaluate(() => ({
      pressed: document.getElementById('jd-fav').getAttribute('aria-pressed'),
      label: document.getElementById('jd-fav-label').textContent.trim(),
      stickySync: document.getElementById('jd-sticky-fav').getAttribute('aria-pressed'),
    }));
    expect(fav.pressed === 'true' && fav.label === 'In Favourites', 'favourite toggled on');
    expect(fav.stickySync === 'true', 'sticky favourite stays in sync');
  });

  await scenario('certificate section: quality + report for set pieces, hallmark note for all-metal', {}, async (page) => {
    await open(page, '?id=JW-1001');
    let cert = await page.evaluate(() => ({
      text: document.getElementById('jd-cert-text').textContent,
      report: window.NGD_DEMO_JEWELLERY.find((p) => p.id === 'JW-1001').certificateNo,
      btnDisabled: document.getElementById('jd-cert-btn').disabled,
      btnHidden: document.getElementById('jd-cert-btn').classList.contains('d-none'),
    }));
    expect(cert.text.includes(cert.report), 'certificate number shown');
    expect(cert.btnDisabled && !cert.btnHidden, 'View Certificate is a disabled placeholder');
    /* the all-metal bangle has no diamond certificate */
    await open(page, '?id=JW-1017');
    cert = await page.evaluate(() => ({
      text: document.getElementById('jd-cert-text').textContent,
      btnHidden: document.getElementById('jd-cert-btn').classList.contains('d-none'),
      dashes: [...document.querySelectorAll('#jd-specs dd')].filter((d) => d.textContent.trim() === '—').length,
    }));
    expect(/hallmarked/.test(cert.text), 'all-metal hallmark note shown');
    expect(cert.btnHidden, 'certificate button hidden for all-metal piece');
    expect(cert.dashes >= 4, 'diamond fields dashed for all-metal piece, got ' + cert.dashes);
  });

  await scenario('descriptions + grouped spec table are present and readable', {}, async (page) => {
    await open(page, '?id=JW-1010');
    const state = await page.evaluate(() => {
      const sample = document.querySelector('#jd-spec-table .ngd-spec-row dd');
      return {
        full: document.getElementById('jd-fulldesc').textContent.trim(),
        titles: [...document.querySelectorAll('.ngd-spec-group-title')].map((t) => t.textContent.trim()),
        rows: document.querySelectorAll('#jd-spec-table .ngd-spec-row').length,
        fontSize: parseFloat(getComputedStyle(sample).fontSize),
      };
    });
    expect(state.full.length > 120 && state.full.includes('Rivière'), 'full product description');
    expect(JSON.stringify(state.titles) === JSON.stringify(['The Piece', 'The Metal', 'The Diamonds']),
      'spec groups, got ' + state.titles.join(','));
    expect(state.rows === 14, '14 grouped rows, got ' + state.rows);
    expect(state.fontSize >= 13, 'spec text readable');
  });

  await scenario('similar pieces: three cards, same category first, links navigate', {}, async (page) => {
    await open(page, '?id=JW-1001');
    const sims = await page.$$eval('#jd-similar .ngd-jewel-card', (els) =>
      els.map((e) => ({
        id: e.getAttribute('data-jewellery-id'),
        cat: e.getAttribute('data-category'),
      })));
    expect(sims.length === 3, '3 similar cards, got ' + sims.length);
    expect(!sims.some((s) => s.id === 'JW-1001'), 'current piece excluded');
    expect(sims[0].cat === 'rings' && sims[1].cat === 'rings', 'same category first');
    await page.click('#jd-similar .ngd-jewel-card a.ngd-btn');
    await page.waitForURL(`**/jewellery-details.html?id=${sims[0].id}`, { timeout: 8000 });
    await page.waitForFunction((id) =>
      document.getElementById('jd-sku').textContent.trim() === id, sims[0].id);
  });

  await scenario('back link returns to the jewellery listing', {}, async (page) => {
    await open(page, '?id=JW-1001');
    await page.click('nav[aria-label="Breadcrumb"] a[href="jewellery.html"]');
    await page.waitForURL('**/jewellery.html', { timeout: 8000 });
  });

  await scenario('mobile 390: gallery first, sticky CTAs, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page, '?id=JW-1001');
    const state = await page.evaluate(() => {
      const stage = document.getElementById('jd-stage').getBoundingClientRect();
      const name = document.getElementById('jd-name').getBoundingClientRect();
      const sticky = document.getElementById('jd-sticky');
      return {
        galleryFirst: stage.top + window.scrollY < name.top + window.scrollY,
        stickyFixed: getComputedStyle(sticky).position === 'fixed',
        bodyPadding: parseFloat(getComputedStyle(document.body).paddingBottom),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.galleryFirst, 'product gallery above the information');
    expect(state.stickyFixed, 'sticky CTA bar fixed to the bottom');
    expect(state.bodyPadding >= 60, 'body padded so content clears the bar');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-details-mobile.png') });
  });

  await scenario('tablet 768 stacked; desktop 1440 two columns, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page, '?id=JW-1001');
    let o = await page.evaluate(() => ({
      stacked: document.getElementById('jd-stage').getBoundingClientRect().bottom <=
        document.getElementById('jd-name').getBoundingClientRect().top + 1,
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.stacked, 'balanced stacked layout at 768');
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    o = await page.evaluate(() => {
      const stage = document.getElementById('jd-stage').getBoundingClientRect();
      const name = document.getElementById('jd-name').getBoundingClientRect();
      return {
        twoCol: name.left > stage.right,
        stickyHidden: !document.getElementById('jd-sticky').offsetParent,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.twoCol, 'two-column layout on desktop');
    expect(o.stickyHidden, 'sticky bar hidden on desktop');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(500);
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
