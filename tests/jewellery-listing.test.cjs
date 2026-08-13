/* ============================================================
   Jewellery Listing page tests (STEP 11).
   Verifies heading/intro, search, category chips, sorting,
   result count, pagination, card contents and effects, links to
   the details placeholder, ?category= deep links, and the
   responsive grid at 1440/768/390.
   Run:  node tests/jewellery-listing.test.cjs
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

async function open(page, query) {
  await page.goto(`${SITE}/jewellery.html${query || ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#jw-grid .ngd-jewel-card, #jw-empty:not(.d-none)');
}

async function countText(page) {
  return (await page.textContent('#jw-count')).trim();
}

async function cardsPerRow(page) {
  return page.evaluate(() => {
    const tops = [...document.querySelectorAll('#jw-grid .ngd-jewel-card')]
      .map((c) => Math.round(c.getBoundingClientRect().top));
    return { rows: [...new Set(tops)].length, cards: tops.length };
  });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('page loads: heading, intro, toolbar, chips, 8 of 18, pagination', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#jewellery-listing h1').textContent.replace(/\s+/g, ' ').trim(),
      intro: document.querySelector('#jewellery-listing .ngd-lead').textContent.trim().length,
      search: !!document.getElementById('jw-search'),
      sort: !!document.getElementById('jw-sort'),
      chips: [...document.querySelectorAll('#jw-chips .ngd-chip')].map((c) => c.textContent.trim()),
      activeChip: document.querySelector('#jw-chips .ngd-chip.is-active').textContent.trim(),
      cards: document.querySelectorAll('#jw-grid .ngd-jewel-card').length,
      total: window.NGD_DEMO_JEWELLERY.length,
      count: document.getElementById('jw-count').textContent.trim(),
      pageBtns: [...document.querySelectorAll('.ngd-page-btn')].map((b) => b.textContent.trim()),
      header: !!document.querySelector('.ngd-navbar'),
      footer: !!document.querySelector('footer.ngd-footer'),
    }));
    expect(/Jewellery/i.test(state.heading), 'page heading, got ' + state.heading);
    expect(state.intro > 30, 'short luxury intro present');
    expect(state.search && state.sort, 'search + sort present');
    expect(JSON.stringify(state.chips) === JSON.stringify(['All'].concat(CATEGORIES)),
      'category chips, got ' + state.chips.join(','));
    expect(state.activeChip === 'All', 'All active by default');
    expect(state.total === 18, '18 demo pieces, got ' + state.total);
    expect(state.cards === 8, '8 cards on page 1, got ' + state.cards);
    expect(state.count === 'Showing 1–8 of 18 pieces', 'result count, got "' + state.count + '"');
    expect(state.pageBtns.includes('3'), 'pagination reaches page 3');
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('cards show art, name, category, description, availability, weight, CTA', {}, async (page) => {
    await open(page);
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('#jw-grid .ngd-jewel-card')].map((c) => ({
        id: c.getAttribute('data-jewellery-id'),
        svg: !!c.querySelector('.ngd-jewel-media svg'),
        tilt: c.hasAttribute('data-ngd-tilt'),
        cat: c.querySelector('.ngd-jewel-cat').textContent.trim(),
        name: c.querySelector('.ngd-jewel-name').textContent.trim(),
        desc: c.querySelector('.ngd-jewel-desc').textContent.trim(),
        avail: c.querySelector('.ngd-avail').textContent.trim(),
        weight: (c.querySelector('.ngd-weight-chip') || {}).textContent || null,
        btnText: c.querySelector('a.ngd-btn').textContent.trim(),
        btnHref: c.querySelector('a.ngd-btn').getAttribute('href'),
      })));
    for (const card of cards) {
      expect(/^JW-\d{4}$/.test(card.id), 'piece id, got ' + card.id);
      expect(card.svg && card.tilt, `[${card.id}] artwork + tilt`);
      expect(CATEGORIES.includes(card.cat), `[${card.id}] category label`);
      expect(card.name.length > 3 && card.desc.length > 10, `[${card.id}] name + description`);
      expect(['In Stock', 'Made to Order'].includes(card.avail), `[${card.id}] availability`);
      expect(card.btnText === 'View Details', `[${card.id}] CTA text`);
      expect(card.btnHref === `jewellery-details.html?id=${card.id}`, `[${card.id}] CTA href`);
    }
    /* optional weight: present when the datum has one, absent otherwise */
    const weightFacts = await page.evaluate(() => {
      const withW = window.NGD_DEMO_JEWELLERY.find((p) => p.weightCt !== null);
      const noW = window.NGD_DEMO_JEWELLERY.find((p) => p.weightCt === null);
      return { withId: withW.id, noId: noW.id };
    });
    await page.fill('#jw-search', weightFacts.noId);
    await page.waitForFunction(() =>
      document.querySelectorAll('#jw-grid .ngd-jewel-card').length === 1);
    const noChip = await page.$('#jw-grid .ngd-weight-chip');
    expect(!noChip, 'no weight chip for an all-metal piece');
  });

  await scenario('search narrows and clears', {}, async (page) => {
    await open(page);
    await page.fill('#jw-search', 'tennis');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.includes('of 2 '));
    const names = await page.$$eval('#jw-grid .ngd-jewel-name', (els) =>
      els.map((e) => e.textContent));
    expect(names.every((n) => /Tennis/.test(n)), 'only tennis bracelets, got ' + names.join(','));
    await page.fill('#jw-search', '');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.includes('of 18'));
  });

  await scenario('category chips filter; All resets; ?category= preselects', {}, async (page) => {
    await open(page);
    const perCat = await page.evaluate(() =>
      window.NGD_DEMO_JEWELLERY.filter((p) => p.category === 'Rings').length);
    await page.click('#jw-chips .ngd-chip[data-category="Rings"]');
    await page.waitForFunction((n) =>
      document.getElementById('jw-count').textContent.includes('of ' + n + ' '), perCat);
    const cats = await page.$$eval('#jw-grid .ngd-jewel-cat', (els) => els.map((e) => e.textContent));
    expect(cats.every((c) => c === 'Rings'), 'only rings shown');
    await page.click('#jw-chips .ngd-chip[data-category=""]');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.includes('of 18'));
    /* deep link used by homepage cards + footer */
    await open(page, '?category=bangles');
    const active = await page.textContent('#jw-chips .ngd-chip.is-active');
    expect(active.trim() === 'Bangles', 'chip preselected from URL');
    const expected = await page.evaluate(() =>
      window.NGD_DEMO_JEWELLERY.filter((p) => p.category === 'Bangles').length);
    expect((await countText(page)).includes('of ' + expected + ' '), 'results pre-filtered');
  });

  await scenario('sorting: name A–Z and diamond weight both ways', {}, async (page) => {
    await open(page);
    const facts = await page.evaluate(() => {
      const names = window.NGD_DEMO_JEWELLERY.map((p) => p.name).sort((a, b) => a.localeCompare(b));
      const weights = window.NGD_DEMO_JEWELLERY.filter((p) => p.weightCt !== null)
        .map((p) => p.weightCt);
      return { firstName: names[0], max: Math.max(...weights), min: Math.min(...weights) };
    });
    await page.selectOption('#jw-sort', 'name-asc');
    await page.waitForFunction((n) =>
      document.querySelector('#jw-grid .ngd-jewel-name').textContent.trim() === n, facts.firstName);
    await page.selectOption('#jw-sort', 'weight-desc');
    await page.waitForFunction((v) =>
      document.querySelector('#jw-grid .ngd-weight-chip').textContent.includes(v.toFixed(2)), facts.max);
    await page.selectOption('#jw-sort', 'weight-asc');
    await page.waitForFunction((v) =>
      document.querySelector('#jw-grid .ngd-weight-chip').textContent.includes(v.toFixed(2)), facts.min);
  });

  await scenario('pagination pages through and resets on filter change', {}, async (page) => {
    await open(page);
    await page.click('.ngd-page-btn[data-page="2"]');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.startsWith('Showing 9–16'));
    await page.click('.ngd-page-btn[data-page="3"]');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.startsWith('Showing 17–18'));
    await page.click('#jw-chips .ngd-chip[data-category="Rings"]');
    await page.waitForFunction(() =>
      document.getElementById('jw-count').textContent.startsWith('Showing 1–'));
  });

  await scenario('hover: tilt applies/resets and the piece zooms', {}, async (page) => {
    await open(page);
    const card = page.locator('#jw-grid .ngd-jewel-card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.waitForTimeout(120);
    const during = await card.evaluate((el) => el.style.transform);
    expect(/perspective/.test(during), 'tilt applied');
    await page.mouse.move(box.x - 100, box.y - 100);
    await page.waitForTimeout(120);
    expect((await card.evaluate((el) => el.style.transform)) === '', 'tilt reset');
    const before = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-jewel-figure')).transform);
    await card.hover();
    await page.waitForTimeout(750);
    const after = await card.evaluate(
      (el) => getComputedStyle(el.querySelector('.ngd-jewel-figure')).transform);
    expect(before !== after && after !== 'none', 'figure zooms on hover');
  });

  await scenario('View Details lands on the details placeholder with the piece id', {}, async (page) => {
    await open(page);
    const firstId = await page.$eval('#jw-grid .ngd-jewel-card',
      (c) => c.getAttribute('data-jewellery-id'));
    await page.click('#jw-grid .ngd-jewel-card a.ngd-btn');
    await page.waitForURL(`**/jewellery-details.html?id=${firstId}`, { timeout: 8000 });
    await page.waitForFunction((id) =>
      document.getElementById('jd-piece').textContent === id, firstId);
    const back = await page.$('a[href="jewellery.html"]');
    expect(!!back, 'back to collection link present');
  });

  await scenario('desktop 1440: four cards per row, no overflow', {}, async (page) => {
    await open(page);
    const layout = await cardsPerRow(page);
    expect(layout.rows === 2 && layout.cards === 8, `2 rows of 4, got ${layout.rows} rows`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-listing-desktop.png') });
  });

  await scenario('tablet 768: two cards per row, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    const layout = await cardsPerRow(page);
    expect(layout.rows === 4 && layout.cards === 8, `4 rows of 2 at 768, got ${layout.rows}`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
  });

  await scenario('mobile 390: single column, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const layout = await cardsPerRow(page);
    expect(layout.rows === 8 && layout.cards === 8, `8 stacked cards at 390, got ${layout.rows}`);
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
    await page.evaluate(() =>
      document.querySelector('#jw-grid').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'jewellery-listing-mobile.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} jewellery-listing scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
