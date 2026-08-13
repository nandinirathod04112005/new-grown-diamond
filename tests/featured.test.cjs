/* ============================================================
   Homepage Featured Diamonds section tests (PROMPT 5).
   Verifies the showcase below #diamond-shapes: title/subtitle,
   six demo cards with full spec sheets, tilt + sheen hover
   effects, links, and the responsive grid at 1440/768/390.
   Run:  node tests/featured.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SPEC_LABELS = ['Shape', 'Carat', 'Colour', 'Clarity', 'Laboratory'];

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

async function cardsPerRowCount(page) {
  return page.evaluate(() => {
    const tops = [...document.querySelectorAll('#featured-diamonds .ngd-diamond-card')]
      .map((c) => Math.round(c.getBoundingClientRect().top));
    return [...new Set(tops)].length;
  });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('section below shapes: title, subtitle, six complete cards', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const section = document.querySelector('#featured-diamonds');
      const shapes = document.querySelector('#diamond-shapes');
      const cards = [...section.querySelectorAll('.ngd-diamond-card')];
      return {
        belowShapes:
          section.getBoundingClientRect().top + window.scrollY >
          shapes.getBoundingClientRect().top + window.scrollY,
        heading: section.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        subtitle: section.querySelector('.ngd-lead').textContent.trim(),
        cardCount: cards.length,
        cards: cards.map((c) => ({
          id: c.getAttribute('data-diamond-id'),
          svg: !!c.querySelector('.ngd-diamond-media svg'),
          title: c.querySelector('.ngd-diamond-title').textContent.trim(),
          labels: [...c.querySelectorAll('.ngd-diamond-specs dt')].map((d) => d.textContent.trim()),
          values: [...c.querySelectorAll('.ngd-diamond-specs dd')].map((d) => d.textContent.trim()),
          button: c.querySelector('a.ngd-btn'),
          buttonText: c.querySelector('a.ngd-btn').textContent.trim(),
          buttonHref: c.querySelector('a.ngd-btn').getAttribute('href'),
          tilt: c.hasAttribute('data-ngd-tilt'),
        })),
      };
    });
    expect(state.belowShapes, 'featured section sits below the shapes section');
    expect(/stones/i.test(state.heading), 'section title present, got ' + state.heading);
    expect(state.subtitle.length > 20 && state.subtitle.length < 200, 'short luxury subtitle');
    expect(state.cardCount === 6, '6 demo cards, got ' + state.cardCount);
    for (const card of state.cards) {
      expect(card.svg, `[${card.id}] has diamond artwork`);
      expect(
        JSON.stringify(card.labels) === JSON.stringify(SPEC_LABELS),
        `[${card.id}] specs are Shape/Carat/Colour/Clarity/Laboratory, got ` + card.labels.join(',')
      );
      expect(card.values.every((v) => v.length > 0), `[${card.id}] all spec values filled`);
      expect(card.buttonText === 'View Details', `[${card.id}] View Details button`);
      expect(/^diamonds\.html\?id=demo-\d+$/.test(card.buttonHref), `[${card.id}] details href`);
      expect(card.tilt, `[${card.id}] 3D tilt enabled`);
    }
  });

  await scenario('card tilt applies and resets with the pointer', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('.ngd-diamond-card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3);
    await page.waitForTimeout(120);
    const during = await card.evaluate((el) => el.style.transform);
    expect(/perspective/.test(during) && /rotate/.test(during), 'tilt applied: ' + (during || 'none'));
    await page.mouse.move(box.x - 100, box.y - 100);
    await page.waitForTimeout(120);
    const after = await card.evaluate((el) => el.style.transform);
    expect(after === '', 'tilt reset after pointer leave');
  });

  await scenario('hover sweeps the reflection sheen across the image', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('.ngd-diamond-card').first();
    await card.scrollIntoViewIfNeeded();
    const before = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-diamond-media'), '::after').transform
    );
    await card.hover();
    await page.waitForTimeout(850);
    const after = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-diamond-media'), '::after').transform
    );
    expect(before !== after, `sheen transform changes on hover (${before} → ${after})`);
  });

  await scenario('View Details navigates with the demo id', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('.ngd-diamond-card a[href="diamonds.html?id=demo-01"]');
    await page.waitForURL('**/diamonds.html?id=demo-01', { timeout: 8000 });
  });

  await scenario('View All Diamonds links to the inventory page', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('#featured-diamonds > .container > .text-center a.ngd-btn');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('desktop 1440: three cards per row, no overflow', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await cardsPerRowCount(page);
    expect(rows === 2, `2 rows of 3 at 1440, got ${rows} row tops`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'featured-desktop.png') });
  });

  await scenario('tablet 768: two cards per row, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await cardsPerRowCount(page);
    expect(rows === 3, `3 rows of 2 at 768, got ${rows} row tops`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
  });

  await scenario('mobile 390: one card per row, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await cardsPerRowCount(page);
    expect(rows === 6, `6 stacked cards at 390, got ${rows} row tops`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'featured-mobile.png') });
  });

  await scenario('reveal animation fires across the section', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('#featured-diamonds').scrollIntoView());
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds').scrollIntoView({ block: 'end' }));
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('#featured-diamonds .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 5000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} featured-section scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
