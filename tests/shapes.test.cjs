/* ============================================================
   Homepage Diamond section tests (PROMPT 4).
   Verifies the cut-collection section below the hero: heading,
   all eight shape cards, tilt behaviour, links, reveal animation
   and responsive layout.
   Run:  node tests/shapes.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SHAPES = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise'];

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1366, height: 900 },
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

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('section sits below the hero with heading + all 8 shapes', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const section = document.querySelector('#diamond-shapes');
      const hero = document.querySelector('.ngd-hero');
      return {
        exists: !!section,
        belowHero: !!section && !!hero &&
          section.getBoundingClientRect().top + window.scrollY >
          hero.getBoundingClientRect().top + window.scrollY,
        eyebrow: section.querySelector('.ngd-eyebrow').textContent.trim(),
        heading: section.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        names: [...section.querySelectorAll('.ngd-shape-name')].map((n) => n.textContent.trim()),
        svgs: section.querySelectorAll('.ngd-shape-media svg').length,
        tilt: section.querySelectorAll('.ngd-shape-card[data-ngd-tilt]').length,
      };
    });
    expect(state.exists && state.belowHero, 'section present below hero');
    expect(state.eyebrow.length > 0 && /shape/i.test(state.heading), 'premium heading present');
    expect(JSON.stringify(state.names) === JSON.stringify(SHAPES),
      'all 8 shapes in order, got ' + state.names.join(','));
    expect(state.svgs === 8, '8 shape illustrations');
    expect(state.tilt === 8, 'all cards have 3D tilt');
  });

  await scenario('card tilt reacts to pointer on desktop', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('.ngd-shape-card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
    await page.waitForTimeout(120);
    const transform = await card.evaluate((el) => el.style.transform);
    expect(/perspective/.test(transform) && /rotate/.test(transform),
      'pointer tilt applied, got: ' + (transform || '(none)'));
    await page.mouse.move(box.x - 80, box.y - 80);
    await page.waitForTimeout(120);
    const after = await card.evaluate((el) => el.style.transform);
    expect(after === '', 'tilt resets on pointer leave, got: ' + (after || '(cleared)'));
  });

  await scenario('shape card links to diamonds page with shape parameter', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const hrefs = await page.$$eval('#diamond-shapes .ngd-shape-card', (els) =>
      els.map((a) => a.getAttribute('href'))
    );
    expect(hrefs.length === 8 && hrefs.every((h) => /^diamonds\.html\?shape=[a-z]+$/.test(h)),
      'hrefs well-formed, got ' + hrefs.join(' '));
    await page.click('#diamond-shapes .ngd-shape-card[href="diamonds.html?shape=round"]');
    await page.waitForURL('**/diamonds.html?shape=round', { timeout: 8000 });
  });

  await scenario('"View all diamonds" CTA navigates', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('#diamond-shapes a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('reveal animation fires when scrolled into view', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    /* Scroll through the whole section — it is taller than one viewport */
    await page.evaluate(() => document.querySelector('#diamond-shapes').scrollIntoView());
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      document.querySelector('#diamond-shapes').scrollIntoView({ block: 'end' })
    );
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('#diamond-shapes .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 5000 });
  });

  await scenario('desktop layout: 4 cards per row', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await page.evaluate(() => {
      const tops = [...document.querySelectorAll('#diamond-shapes .ngd-shape-card')]
        .map((c) => Math.round(c.getBoundingClientRect().top));
      return [...new Set(tops)].length;
    });
    expect(rows === 2, `2 rows of 4 on desktop, got ${rows} distinct row tops`);
  });

  await scenario('mobile layout: 2 per row, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#diamond-shapes .ngd-shape-card')];
      const tops = [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)))];
      return {
        rowCount: tops.length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.rowCount === 4, `4 rows of 2 on mobile, got ${state.rowCount}`);
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW} c=${state.clientW}`);
    await page.evaluate(() => document.querySelector('#diamond-shapes').scrollIntoView());
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'shapes-mobile.png') });
  });

  await scenario('desktop screenshot of the section', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('#diamond-shapes').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'shapes-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} shape-section scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
