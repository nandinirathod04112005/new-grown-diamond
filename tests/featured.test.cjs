/* ============================================================
   Homepage Featured Diamonds section tests (LIVE).
   The showcase renders from public.diamonds through the shared
   NGDDiamondCard renderer: featured + active + non-archived
   stones first (newest first), the latest active stones when
   nothing is featured, a tasteful empty state, and a calm
   error state that never breaks the rest of the homepage.
   Cards link by immutable DIA- public id, photos come from
   image_path in the diamond-images bucket with gem-art
   fallback. Also keeps the design checks: tilt, View All link,
   responsive grid at 1440/768/390.
   Run:  node tests/featured.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SB_HOST = 'https://home-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;

function stone(n, extra) {
  return Object.assign({
    public_id: 'DIA-SEED000' + n,
    stock_number: 'NGD-310' + n,
    shape: ['Round', 'Oval', 'Princess', 'Emerald', 'Cushion', 'Radiant'][(n - 1) % 6],
    carat: 1 + n * 0.25,
    color: 'DEFGHD'.charAt((n - 1) % 6),
    clarity: 'VS1',
    cut: 'Excellent',
    laboratory: 'IGI',
    availability: 'In Stock',
    image_path: null,
    featured: true,
    created_at: '2026-08-1' + n + 'T10:00:00Z',
  }, extra || {});
}
const FEATURED_SIX = [stone(6), stone(5), stone(4), stone(3), stone(2), stone(1)];

const results = [];
let browser;
let SITE;
let diamondCalls = [];

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
    if (url.pathname === '/rest/v1/diamonds') {
      diamondCalls.push(req.url());
      if (opts.fail) return json(500, { message: 'mock outage' });
      const wantsFeatured = url.searchParams.get('featured') === 'eq.true';
      return json(200, wantsFeatured ? opts.featured : opts.latest);
    }
    if (url.pathname === '/rest/v1/jewellery') {
      return json(200, opts.jewellery || []);
    }
    if (url.pathname === '/rest/v1/jewellery_images') {
      return json(200, []);
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
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock({
      featured: opts.featured || FEATURED_SIX,
      latest: opts.latest || [],
      jewellery: opts.jewellery || [],
      fail: !!opts.fail,
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

async function openHome(page, waitCards) {
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  if (waitCards === false) {
    await page.waitForFunction(() =>
      document.getElementById('featured-diamonds-grid').getAttribute('aria-busy') === 'false');
  } else {
    await page.waitForFunction(() =>
      document.querySelectorAll('#featured-diamonds-grid .ngd-diamond-card').length > 0);
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

  await scenario('live showcase: six featured stones, real specs, public-id links, no demo traces', {}, async (page) => {
    diamondCalls = [];
    await openHome(page);
    const state = await page.evaluate(() => {
      const grid = document.getElementById('featured-diamonds-grid');
      const first = grid.querySelector('.ngd-diamond-card');
      const specs = [...first.querySelectorAll('dt')].map((t) => t.textContent.trim());
      return {
        cards: grid.querySelectorAll('.ngd-diamond-card').length,
        busy: grid.getAttribute('aria-busy'),
        title: first.querySelector('.ngd-diamond-title').textContent.trim(),
        carat: first.querySelector('.ngd-diamond-carat').textContent.trim(),
        stockNo: first.querySelector('.ngd-stock-no').textContent.trim(),
        specs,
        links: [...grid.querySelectorAll('a.ngd-btn')].map((a) => a.getAttribute('href')),
        demoTraces: /demo-0|diamonds\.html\?id=/.test(grid.innerHTML),
        loadingGone: !grid.querySelector('[data-home-diamonds-state]'),
      };
    });
    expect(state.cards === 6, 'six featured cards, got ' + state.cards);
    expect(state.busy === 'false' && state.loadingGone, 'loading state cleared');
    expect(state.title === 'Radiant' && state.carat === '2.50 ct', 'newest stone leads with live specs, got ' + state.title + '/' + state.carat);
    expect(state.stockNo === 'NGD-3106', 'stock number rendered, got ' + state.stockNo);
    expect(['Shape', 'Carat', 'Colour', 'Clarity', 'Cut', 'Laboratory'].every((s) => state.specs.includes(s)),
      'full spec sheet, got ' + state.specs.join(','));
    expect(state.links.length === 6 &&
      state.links.every((h) => /^diamond-details\.html\?id=DIA-SEED000\d$/.test(h)),
      'every card links the details page by public id, got ' + state.links.join(','));
    expect(!state.demoTraces, 'no demo ids or dead diamonds.html?id= links remain');
    expect(diamondCalls.length >= 1 && diamondCalls[0].includes('featured=eq.true') &&
      diamondCalls[0].includes('active=eq.true') && diamondCalls[0].includes('archived_at=is.null'),
      'query asks only for featured, active, non-archived stones: ' + diamondCalls[0]);
  });

  await scenario('photo from the diamond-images bucket when image_path exists, gem art otherwise', {
    featured: [stone(1, { image_path: 'diamonds/DIA-SEED0001/photo.webp' }), stone(2)],
  }, async (page) => {
    await openHome(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#featured-diamonds-grid .ngd-diamond-card')];
      const withPhoto = cards.find((c) => c.querySelector('img.ngd-media-photo'));
      const withArt = cards.find((c) => !c.querySelector('img') && c.querySelector('.ngd-diamond-media svg'));
      return {
        photoSrc: withPhoto && withPhoto.querySelector('img').getAttribute('src'),
        artOk: !!withArt,
      };
    });
    expect(/\/storage\/v1\/object\/public\/diamond-images\/diamonds\/DIA-SEED0001\/photo\.webp$/.test(state.photoSrc || ''),
      'photo served from the public bucket, got ' + state.photoSrc);
    expect(state.artOk, 'stones without a photo fall back to gem art');
  });

  await scenario('nothing featured: the newest active stones fill the showcase', {
    featured: [], latest: [stone(3, { featured: false }), stone(2, { featured: false })],
  }, async (page) => {
    diamondCalls = [];
    await openHome(page);
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#featured-diamonds-grid .ngd-diamond-card').length,
    }));
    expect(state.cards === 2, 'fallback stones render, got ' + state.cards);
    expect(diamondCalls.length === 2 && !diamondCalls[1].includes('featured=eq.true') &&
      diamondCalls[1].includes('active=eq.true') && diamondCalls[1].includes('archived_at=is.null'),
      'fallback still asks only for active, non-archived stones: ' + diamondCalls[1]);
  });

  await scenario('empty catalogue: tasteful empty state with an inventory link', {
    featured: [], latest: [],
  }, async (page) => {
    await openHome(page, false);
    const state = await page.evaluate(() => {
      const grid = document.getElementById('featured-diamonds-grid');
      return {
        cards: grid.querySelectorAll('.ngd-diamond-card').length,
        copy: grid.textContent,
        link: grid.querySelector('a.ngd-link') && grid.querySelector('a.ngd-link').getAttribute('href'),
      };
    });
    expect(state.cards === 0, 'no cards fabricated');
    expect(/signature stones are being graded/i.test(state.copy), 'honest empty copy, got ' + state.copy.trim().slice(0, 80));
    expect(state.link === 'diamonds.html', 'empty state links the inventory');
  });

  await scenario('supabase failure: calm fallback copy, the rest of the homepage stays alive', {
    fail: true,
  }, async (page) => {
    await openHome(page, false);
    const state = await page.evaluate(() => ({
      copy: document.getElementById('featured-diamonds-grid').textContent,
      raw: /mock outage|500|error:/i.test(document.getElementById('featured-diamonds-grid').textContent),
      heroAlive: !!document.querySelector('.ngd-hero, #ngd-hero, header'),
      footerAlive: !!document.querySelector('footer'),
      shapesAlive: !!document.querySelector('#diamond-shapes'),
    }));
    expect(/could not load right now/i.test(state.copy), 'calm error copy, got ' + state.copy.trim().slice(0, 80));
    expect(!state.raw, 'no raw database error leaks');
    expect(state.heroAlive && state.footerAlive && state.shapesAlive, 'homepage sections unaffected');
  });

  await scenario('card tilt binds to the live cards', {}, async (page) => {
    await openHome(page);
    const card = page.locator('#featured-diamonds-grid .ngd-diamond-card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
    await page.waitForTimeout(120);
    const during = await card.evaluate((el) => el.style.transform);
    await page.mouse.move(box.x - 60, box.y - 60);
    await page.waitForTimeout(120);
    const after = await card.evaluate((el) => el.style.transform);
    expect(/rotateX|perspective/.test(during), 'tilt engages on hover, got ' + during);
    expect(after === '', 'tilt resets when the pointer leaves');
  });

  await scenario('View All Diamonds links to the inventory page', {}, async (page) => {
    await openHome(page);
    const href = await page.getAttribute('#featured-diamonds .text-center a.ngd-btn-gold', 'href');
    expect(href === 'diamonds.html', 'View All Diamonds href, got ' + href);
    await page.click('#featured-diamonds .text-center a.ngd-btn-gold');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('desktop 1440: three cards per row, no overflow', {}, async (page) => {
    await openHome(page);
    const rows = await cardsPerRowCount(page);
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(rows === 2, 'six cards in two rows of three, got ' + rows + ' rows');
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'featured-desktop.png') });
  });

  await scenario('tablet 768: two cards per row, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await openHome(page);
    const rows = await cardsPerRowCount(page);
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(rows === 3, 'six cards in three rows of two, got ' + rows);
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
  });

  await scenario('mobile 390: one card per row, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await openHome(page);
    const rows = await cardsPerRowCount(page);
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(rows === 6, 'six stacked cards, got ' + rows);
    expect(o.s <= o.c + 1, `no overflow s=${o.s}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'featured-mobile.png') });
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
