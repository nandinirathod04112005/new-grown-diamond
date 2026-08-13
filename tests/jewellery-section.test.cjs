/* ============================================================
   Homepage Fine Jewellery section tests (STEP 6).
   Verifies the atelier section below Featured Diamonds: heading,
   six category cards with art/description/CTA, tilt + zoom hover
   effects, links, and the 3/2/1 responsive grid at 1440/768/390.
   Run:  node tests/jewellery-section.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const CATEGORIES = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];

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

async function rowsCount(page) {
  return page.evaluate(() => {
    const tops = [...document.querySelectorAll('#fine-jewellery .ngd-jewel-card')]
      .map((c) => Math.round(c.getBoundingClientRect().top));
    return [...new Set(tops)].length;
  });
}

async function overflow(page) {
  return page.evaluate(() => ({
    s: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
  }));
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('section below Featured Diamonds: heading, subtitle, six cards', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const section = document.querySelector('#fine-jewellery');
      const featured = document.querySelector('#featured-diamonds');
      const cards = [...section.querySelectorAll('.ngd-jewel-card')];
      return {
        belowFeatured:
          section.getBoundingClientRect().top + window.scrollY >
          featured.getBoundingClientRect().top + window.scrollY,
        heading: section.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        subtitle: section.querySelector('.ngd-lead').textContent.trim(),
        names: cards.map((c) => c.querySelector('.ngd-jewel-name').textContent.trim()),
        cards: cards.map((c) => ({
          cat: c.getAttribute('data-category'),
          svg: !!c.querySelector('.ngd-jewel-media svg'),
          desc: c.querySelector('.ngd-jewel-desc').textContent.trim(),
          btnText: c.querySelector('a.ngd-btn').textContent.trim(),
          btnHref: c.querySelector('a.ngd-btn').getAttribute('href'),
          tilt: c.hasAttribute('data-ngd-tilt'),
        })),
      };
    });
    expect(state.belowFeatured, 'section sits below Featured Diamonds');
    expect(state.heading === 'Fine Jewellery', 'heading is "Fine Jewellery", got ' + state.heading);
    expect(state.subtitle.length > 15 && state.subtitle.length < 160, 'short premium subtitle');
    expect(JSON.stringify(state.names) === JSON.stringify(CATEGORIES),
      'all 6 categories in order, got ' + state.names.join(','));
    for (const card of state.cards) {
      expect(card.svg, `[${card.cat}] has artwork`);
      expect(card.desc.length > 10 && card.desc.length < 120, `[${card.cat}] short description`);
      expect(card.btnText === 'View Details', `[${card.cat}] View Details button`);
      expect(card.btnHref === `jewellery.html?category=${card.cat}`, `[${card.cat}] details href`);
      expect(card.tilt, `[${card.cat}] 3D tilt enabled`);
    }
  });

  await scenario('card tilt applies and resets with the pointer', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('.ngd-jewel-card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.waitForTimeout(120);
    const during = await card.evaluate((el) => el.style.transform);
    expect(/perspective/.test(during) && /rotate/.test(during), 'tilt applied: ' + (during || 'none'));
    await page.mouse.move(box.x - 100, box.y - 100);
    await page.waitForTimeout(120);
    const after = await card.evaluate((el) => el.style.transform);
    expect(after === '', 'tilt reset after pointer leave');
  });

  await scenario('hover floats and zooms the piece smoothly', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('.ngd-jewel-card').first();
    await card.scrollIntoViewIfNeeded();
    const before = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-jewel-figure')).transform
    );
    await card.hover();
    await page.waitForTimeout(750);
    const after = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-jewel-figure')).transform
    );
    expect(before !== after && after !== 'none', `figure zooms on hover (${before} → ${after})`);
  });

  await scenario('View Details navigates with the category', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('.ngd-jewel-card a[href="jewellery.html?category=rings"]');
    await page.waitForURL('**/jewellery.html?category=rings', { timeout: 8000 });
  });

  await scenario('Explore All Jewellery links to the listing page', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('#fine-jewellery > .container > .text-center a.ngd-btn');
    await page.waitForURL('**/jewellery.html', { timeout: 8000 });
  });

  await scenario('desktop 1440: three cards per row, no overflow', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await rowsCount(page);
    expect(rows === 2, `2 rows of 3 at 1440, got ${rows} row tops`);
    const o = await overflow(page);
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
    await page.evaluate(() =>
      document.querySelector('#fine-jewellery').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-desktop.png') });
  });

  await scenario('tablet 768: two cards per row, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await rowsCount(page);
    expect(rows === 3, `3 rows of 2 at 768, got ${rows} row tops`);
    const o = await overflow(page);
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
  });

  await scenario('mobile 390: one card per row, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const rows = await rowsCount(page);
    expect(rows === 6, `6 stacked cards at 390, got ${rows} row tops`);
    const o = await overflow(page);
    expect(o.s <= o.c + 1, `no overflow s=${o.s} c=${o.c}`);
    await page.evaluate(() =>
      document.querySelector('#fine-jewellery').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-mobile.png') });
  });

  await scenario('reveal animation fires across the section', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('#fine-jewellery').scrollIntoView());
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      document.querySelector('#fine-jewellery').scrollIntoView({ block: 'end' }));
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('#fine-jewellery .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 5000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-section scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
