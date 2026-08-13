/* ============================================================
   Diamond Details page tests (STEP 10).
   Verifies the ?id= resolution, gallery + thumbnails, zoom
   interaction, all seventeen specification fields, CTAs,
   certificate card, full spec table, similar stones, inventory
   integration and responsive behaviour at 1440/768/390.
   Run:  node tests/details.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SPEC_LABELS = ['Stock Number', 'Shape', 'Carat', 'Colour', 'Clarity', 'Cut', 'Polish',
  'Symmetry', 'Fluorescence', 'Laboratory', 'Report Number', 'Measurements',
  'Depth %', 'Table %', 'Ratio', 'Growth Method', 'Availability'];

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
  await page.goto(`${SITE}/diamond-details.html${query || ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#dd-title, #dd-notfound:not(.d-none)');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('?id=NGD-1005 renders that stone with all 17 spec fields', {}, async (page) => {
    await open(page, '?id=NGD-1005');
    const state = await page.evaluate(() => {
      const stone = window.NGD_DEMO_DIAMONDS.find((d) => d.id === 'NGD-1005');
      return {
        stone,
        stock: document.getElementById('dd-stock').textContent.trim(),
        title: document.getElementById('dd-title').textContent.replace(/\s+/g, ' ').trim(),
        docTitle: document.title,
        labels: [...document.querySelectorAll('#dd-specs dt')].map((d) => d.textContent.trim()),
        values: [...document.querySelectorAll('#dd-specs dd')].map((d) => d.textContent.trim()),
        badge: document.getElementById('dd-lab-badge').textContent.trim(),
        header: !!document.querySelector('.ngd-navbar'),
        footer: !!document.querySelector('footer.ngd-footer'),
      };
    });
    expect(state.stock === 'NGD-1005', 'stock eyebrow, got ' + state.stock);
    expect(/Cushion/.test(state.title) && /2\.15/.test(state.title), 'title shape+carat, got ' + state.title);
    expect(state.docTitle.includes('NGD-1005'), 'document title updated');
    expect(JSON.stringify(state.labels) === JSON.stringify(SPEC_LABELS),
      'all 17 spec labels in order, got ' + state.labels.length + ': ' + state.labels.join(','));
    expect(state.values.every((v) => v.length > 0), 'all spec values filled');
    expect(state.values.includes(state.stone.report), 'report number rendered');
    expect(state.values.includes(state.stone.measurements), 'measurements rendered');
    expect(state.badge === 'GIA Certified', 'lab badge on the stage, got ' + state.badge);
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('no id falls back to the first stone; unknown id shows not-found', {}, async (page) => {
    await open(page);
    expect((await page.textContent('#dd-stock')).trim() === 'NGD-1001', 'defaults to first stone');
    await open(page, '?id=NGD-9999');
    const state = await page.evaluate(() => ({
      notFound: !document.getElementById('dd-notfound').classList.contains('d-none'),
      productHidden: document.getElementById('dd-product').classList.contains('d-none'),
      backLink: !!document.querySelector('#dd-notfound a[href="diamonds.html"]'),
    }));
    expect(state.notFound && state.productHidden, 'not-found state shown, product hidden');
    expect(state.backLink, 'back to inventory CTA present');
  });

  await scenario('gallery: three thumbnails swap the main view', {}, async (page) => {
    await open(page, '?id=NGD-1001');
    const thumbs = await page.$$eval('#dd-thumbs .ngd-thumb', (els) =>
      els.map((e) => e.getAttribute('data-view')));
    expect(JSON.stringify(thumbs) === JSON.stringify(['top', 'profile', 'certificate']),
      'three views, got ' + thumbs.join(','));
    expect(await page.getAttribute('#dd-stage', 'data-view') === 'top', 'top view initially');
    await page.click('.ngd-thumb[data-view="profile"]');
    await page.waitForFunction(() =>
      document.getElementById('dd-stage').getAttribute('data-view') === 'profile');
    const activeProfile = await page.$eval('.ngd-thumb[data-view="profile"]',
      (b) => b.classList.contains('is-active'));
    expect(activeProfile, 'profile thumb active');
    await page.click('.ngd-thumb[data-view="certificate"]');
    await page.waitForFunction(() =>
      document.getElementById('dd-stage').getAttribute('data-view') === 'certificate');
    const certText = await page.$eval('#dd-stage-inner svg', (s) => s.textContent);
    expect(/LABORATORY GROWN/.test(certText), 'certificate view rendered');
  });

  await scenario('zoom: click zooms, pointer steers origin, Escape exits', {}, async (page) => {
    await open(page, '?id=NGD-1001');
    const stage = page.locator('#dd-stage');
    await stage.scrollIntoViewIfNeeded();
    await stage.click();
    await page.waitForSelector('#dd-stage.is-zoomed');
    const scale = await page.$eval('#dd-stage-inner', (el) => getComputedStyle(el).transform);
    expect(scale !== 'none', 'inner scaled when zoomed');
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
    await page.waitForFunction(() =>
      document.getElementById('dd-stage-inner').style.transformOrigin !== '');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() =>
      !document.getElementById('dd-stage').classList.contains('is-zoomed'));
  });

  await scenario('CTAs: quote/inspection link with stone ref; favourite toggles', {}, async (page) => {
    await open(page, '?id=NGD-1002');
    const hrefs = await page.evaluate(() => ({
      quote: document.getElementById('dd-quote').getAttribute('href'),
      inspect: document.getElementById('dd-inspect').getAttribute('href'),
    }));
    expect(hrefs.quote === 'contact.html?stone=NGD-1002&type=quote', 'quote href, got ' + hrefs.quote);
    expect(hrefs.inspect === 'contact.html?stone=NGD-1002&type=inspection', 'inspection href');
    await page.click('#dd-fav');
    let fav = await page.evaluate(() => ({
      pressed: document.getElementById('dd-fav').getAttribute('aria-pressed'),
      label: document.getElementById('dd-fav-label').textContent.trim(),
      icon: document.querySelector('#dd-fav .ngd-fav-icon').textContent,
      stickySync: document.getElementById('dd-sticky-fav').getAttribute('aria-pressed'),
    }));
    expect(fav.pressed === 'true' && fav.label === 'In Favourites' && fav.icon === '♥',
      'favourite toggled on');
    expect(fav.stickySync === 'true', 'sticky bar favourite stays in sync');
    await page.click('#dd-fav');
    fav = await page.evaluate(() => document.getElementById('dd-fav').getAttribute('aria-pressed'));
    expect(fav === 'false', 'favourite toggles back off');
  });

  await scenario('certificate card: lab, report number, placeholder button', {}, async (page) => {
    await open(page, '?id=NGD-1004');
    const state = await page.evaluate(() => {
      const stone = window.NGD_DEMO_DIAMONDS.find((d) => d.id === 'NGD-1004');
      return {
        lab: document.getElementById('dd-cert-lab').textContent.trim(),
        no: document.getElementById('dd-cert-no').textContent.trim(),
        report: stone.report,
        btnDisabled: document.querySelector('#dd-cert button').disabled,
      };
    });
    expect(state.lab === 'GIA Laboratory', 'certificate lab, got ' + state.lab);
    expect(state.no === state.report, 'certificate number matches the stone');
    expect(state.btnDisabled, 'View Certificate is a disabled placeholder');
  });

  await scenario('full specification card: three readable groups', {}, async (page) => {
    await open(page, '?id=NGD-1001');
    const state = await page.evaluate(() => {
      const titles = [...document.querySelectorAll('.ngd-spec-group-title')].map((t) => t.textContent.trim());
      const rows = document.querySelectorAll('#dd-spec-table .ngd-spec-row').length;
      const sample = document.querySelector('#dd-spec-table .ngd-spec-row dd');
      return {
        titles,
        rows,
        fontSize: parseFloat(getComputedStyle(sample).fontSize),
      };
    });
    expect(JSON.stringify(state.titles) === JSON.stringify(['Grading', 'Proportions', 'Origin & Status']),
      'group titles, got ' + state.titles.join(','));
    expect(state.rows === 16, '16 grouped rows, got ' + state.rows);
    expect(state.fontSize >= 13, 'spec text readable, got ' + state.fontSize + 'px');
  });

  await scenario('similar stones: three cards, none is the current stone, links work', {}, async (page) => {
    await open(page, '?id=NGD-1001');
    const sims = await page.$$eval('#dd-similar .ngd-diamond-card', (els) =>
      els.map((e) => e.getAttribute('data-diamond-id')));
    expect(sims.length === 3, '3 similar cards, got ' + sims.length);
    expect(!sims.includes('NGD-1001'), 'current stone excluded');
    await page.click('#dd-similar .ngd-diamond-card a.ngd-btn');
    await page.waitForURL(`**/diamond-details.html?id=${sims[0]}`, { timeout: 8000 });
    await page.waitForFunction((id) =>
      document.getElementById('dd-stock').textContent.trim() === id, sims[0]);
  });

  await scenario('back link returns to the inventory', {}, async (page) => {
    await open(page, '?id=NGD-1001');
    /* scope to the breadcrumb — the hidden mobile menu also links to diamonds.html */
    await page.click('nav[aria-label="Breadcrumb"] a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('inventory card click lands here with the right stone', {}, async (page) => {
    await page.goto(`${SITE}/diamonds.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#inv-grid .ngd-diamond-card');
    const firstId = await page.$eval('#inv-grid .ngd-diamond-card',
      (c) => c.getAttribute('data-diamond-id'));
    await page.click('#inv-grid .ngd-diamond-card a.ngd-btn');
    await page.waitForURL(`**/diamond-details.html?id=${firstId}`);
    await page.waitForFunction((id) =>
      document.getElementById('dd-stock').textContent.trim() === id, firstId);
  });

  await scenario('mobile 390: image first, sticky CTA bar, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page, '?id=NGD-1001');
    const state = await page.evaluate(() => {
      const stage = document.getElementById('dd-stage').getBoundingClientRect();
      const title = document.getElementById('dd-title').getBoundingClientRect();
      const sticky = document.getElementById('dd-sticky');
      const stickyStyle = getComputedStyle(sticky);
      return {
        imageFirst: stage.top + window.scrollY < title.top + window.scrollY,
        stickyVisible: !!sticky.offsetParent || stickyStyle.position === 'fixed',
        stickyFixed: stickyStyle.position === 'fixed',
        bodyPadding: parseFloat(getComputedStyle(document.body).paddingBottom),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.imageFirst, 'diamond visual above the details');
    expect(state.stickyFixed, 'sticky CTA bar fixed to the bottom');
    expect(state.bodyPadding >= 60, 'body padded so content clears the bar');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'details-mobile.png') });
  });

  await scenario('tablet 768: stacked layout, no overflow; desktop: two columns', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page, '?id=NGD-1001');
    let o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
      stacked: document.getElementById('dd-stage').getBoundingClientRect().bottom <=
        document.getElementById('dd-title').getBoundingClientRect().top + 1,
    }));
    expect(o.stacked, 'balanced stacked layout at 768');
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    o = await page.evaluate(() => {
      const stage = document.getElementById('dd-stage').getBoundingClientRect();
      const title = document.getElementById('dd-title').getBoundingClientRect();
      return {
        twoCol: title.left > stage.right,
        stickyHidden: !document.getElementById('dd-sticky').offsetParent,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.twoCol, 'two-column product layout on desktop');
    expect(o.stickyHidden, 'sticky bar hidden on desktop');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'details-desktop.png') });
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
