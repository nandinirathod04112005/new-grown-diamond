/* ============================================================
   Homepage Fine Jewellery section tests (LIVE).
   The six category cards are storefront navigation (each opens
   the live listing pre-filtered) and keep their design checks:
   heading, art/description/CTA, tilt + zoom hover, links, the
   3/2/1 responsive grid and the reveal animation. Above them, a
   featured row renders live from public.jewellery (active +
   non-archived + featured, primary photo from
   public.jewellery_images) and stays hidden when nothing is
   featured — including on any Supabase failure.
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

const SB_HOST = 'https://home-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;

const FEATURED_PIECES = [
  { id: 'j-uuid-1', public_id: 'JEW-SEED0001', sku: 'JW-4001', product_name: 'Aurora Solitaire Ring',
    category: 'Rings', subcategory: '', short_description: 'A solitaire that lets the stone speak.',
    diamond_weight: 1.5, availability: 'available', featured: true, created_at: '2026-08-12T10:00:00Z' },
  { id: 'j-uuid-2', public_id: 'JEW-SEED0002', sku: 'JW-4002', product_name: 'Halo Pendant',
    category: 'Pendants', subcategory: '', short_description: 'A halo of light for every day.',
    diamond_weight: 0.5, availability: 'made_to_order', featured: true, created_at: '2026-08-10T10:00:00Z' },
];
const PRIMARY_IMAGES = [
  { jewellery_id: 'j-uuid-1', image_path: 'jewellery/JEW-SEED0001/primary.webp' },
];

const results = [];
let browser;
let SITE;
let jewelleryCalls = [];

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts) {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status, obj) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
    }
    if (url.pathname === '/rest/v1/jewellery') {
      jewelleryCalls.push(req.url());
      if (opts.failJewellery) return json(500, { message: 'mock outage' });
      return json(200, opts.jewellery);
    }
    if (url.pathname === '/rest/v1/jewellery_images') {
      return json(200, opts.images);
    }
    if (url.pathname === '/rest/v1/diamonds') {
      return json(200, []); // the diamonds showcase has its own suite
    }
    return json(404, { message: 'mock: unhandled ' + url.pathname });
  };
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock({
      jewellery: opts.jewellery || [],
      images: opts.images || [],
      failJewellery: !!opts.failJewellery,
    }));
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
    const tops = [...document.querySelectorAll('#fine-jewellery-grid .ngd-jewel-card')]
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

  await scenario('section below Featured Diamonds: heading, subtitle, six category cards', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const section = document.querySelector('#fine-jewellery');
      const featured = document.querySelector('#featured-diamonds');
      const cards = [...section.querySelectorAll('#fine-jewellery-grid .ngd-jewel-card')];
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

  await scenario('featured block stays hidden when nothing is featured', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      hidden: document.getElementById('featured-jewellery').hidden,
      featuredCards: document.querySelectorAll('#featured-jewellery-grid .ngd-jewel-card').length,
      categoryCards: document.querySelectorAll('#fine-jewellery-grid .ngd-jewel-card').length,
    }));
    expect(state.hidden && state.featuredCards === 0, 'no featured pieces, no block');
    expect(state.categoryCards === 6, 'category navigation untouched');
  });

  await scenario('featured pieces render live above the categories with public-id links', {
    jewellery: FEATURED_PIECES, images: PRIMARY_IMAGES,
  }, async (page) => {
    jewelleryCalls = [];
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.getElementById('featured-jewellery').hidden);
    const state = await page.evaluate(() => {
      const wrap = document.getElementById('featured-jewellery');
      const cards = [...document.querySelectorAll('#featured-jewellery-grid .ngd-jewel-card')];
      const ring = cards.find((c) => /Aurora/.test(c.textContent));
      const pendant = cards.find((c) => /Halo/.test(c.textContent));
      return {
        eyebrow: wrap.querySelector('.ngd-eyebrow').textContent.trim(),
        count: cards.length,
        ringName: ring.querySelector('.ngd-jewel-name').textContent.trim(),
        ringCat: ring.querySelector('.ngd-jewel-cat').textContent.trim(),
        ringPhoto: ring.querySelector('img.ngd-media-photo') &&
          ring.querySelector('img.ngd-media-photo').getAttribute('src'),
        ringHref: ring.querySelector('a.ngd-btn').getAttribute('href'),
        pendantArt: !!pendant.querySelector('.ngd-jewel-figure svg') && !pendant.querySelector('img'),
        pendantHref: pendant.querySelector('a.ngd-btn').getAttribute('href'),
        aboveCategories: wrap.getBoundingClientRect().top + window.scrollY <
          document.getElementById('fine-jewellery-grid').getBoundingClientRect().top + window.scrollY,
        categoryCards: document.querySelectorAll('#fine-jewellery-grid .ngd-jewel-card').length,
      };
    });
    expect(/Featured/.test(state.eyebrow), 'featured eyebrow, got ' + state.eyebrow);
    expect(state.count === 2, 'both featured pieces render, got ' + state.count);
    expect(state.ringName === 'Aurora Solitaire Ring' && state.ringCat === 'Rings', 'live name + category');
    expect(/\/storage\/v1\/object\/public\/jewellery-images\/jewellery\/JEW-SEED0001\/primary\.webp$/.test(state.ringPhoto || ''),
      'primary photo from the jewellery-images bucket, got ' + state.ringPhoto);
    expect(state.ringHref === 'jewellery-details.html?id=JEW-SEED0001', 'ring links by public id, got ' + state.ringHref);
    expect(state.pendantArt, 'piece without a photo falls back to category art');
    expect(state.pendantHref === 'jewellery-details.html?id=JEW-SEED0002', 'pendant links by public id');
    expect(state.aboveCategories, 'featured row sits above the category navigation');
    expect(state.categoryCards === 6, 'category cards remain');
    expect(jewelleryCalls.length === 1 && jewelleryCalls[0].includes('featured=eq.true') &&
      jewelleryCalls[0].includes('active=eq.true') && jewelleryCalls[0].includes('archived_at=is.null'),
      'query asks only for featured, active, non-archived pieces: ' + jewelleryCalls[0]);
  });

  await scenario('jewellery failure leaves the section calm and hidden', { failJewellery: true }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      hidden: document.getElementById('featured-jewellery').hidden,
      categoryCards: document.querySelectorAll('#fine-jewellery-grid .ngd-jewel-card').length,
      raw: /mock outage|500/i.test(document.getElementById('fine-jewellery').textContent),
    }));
    expect(state.hidden, 'featured block hidden on failure');
    expect(state.categoryCards === 6 && !state.raw, 'categories untouched, no raw errors');
  });

  await scenario('card tilt applies and resets with the pointer', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const card = page.locator('#fine-jewellery-grid .ngd-jewel-card').first();
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
    const card = page.locator('#fine-jewellery-grid .ngd-jewel-card').first();
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
    }, null, { timeout: 9000 }); /* smooth-scrolling past the full-bleed hero is heavier under CI */
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
