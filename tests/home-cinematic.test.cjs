/* ============================================================
   From Carbon to Brilliance — homepage cinematic tests.
   The animation layer over the EXISTING homepage: the hero
   opening sequence (copy cascade + WebGL fade-up) that never
   blocks the CTAs, the hero→story scroll handoff into
   NGDHero3D.setScroll, six scroll-driven canvas journey scenes
   layered over the manufacturing story (original SVGs intact
   underneath), the 01–06 progress rail, vendored GSAP
   ScrollTrigger, reverse/fast scroll + resize resilience,
   reduced-motion and no-WebGL fallbacks, the mobile profile,
   and proof that live products, CMS hooks and links all still
   work underneath the choreography.
   Run:  node tests/home-cinematic.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://home-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };
const SLUGS = ['growth', 'rough', 'cutting', 'polishing', 'inspection', 'finished'];

function seedDiamonds() {
  const base = {
    shape: 'Round', carat: 1.2, color: 'D', clarity: 'IF', cut: 'Ideal',
    laboratory: 'IGI', growth_method: 'CVD', availability: 'In Stock',
    image_path: null, featured: true, active: true, archived_at: null,
    price_visible: false, total_price: 5000, currency: 'USD',
  };
  return [
    { ...base, id: 'u1', public_id: 'DIA-CINE0001', stock_number: 'NGD-4001', created_at: '2026-08-10T10:00:00Z' },
    { ...base, id: 'u2', public_id: 'DIA-CINE0002', stock_number: 'NGD-4002', carat: 2.0, shape: 'Oval', created_at: '2026-08-09T10:00:00Z' },
    { ...base, id: 'u3', public_id: 'DIA-CINE0003', stock_number: 'NGD-4003', carat: 1.5, shape: 'Pear', created_at: '2026-08-08T10:00:00Z' },
  ];
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1366, height: 900 },
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript', body: TEST_CONFIG,
    }));
    await context.route(SB_HOST + '/**', (r) => {
      const req = r.request();
      if (req.method() === 'OPTIONS') {
        return r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
      }
      const url = new URL(req.url());
      if (url.pathname === '/rest/v1/diamonds' && req.method() === 'GET') {
        return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(seedDiamonds()) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '[]' });
    });
    const page = await context.newPage();
    if (opts.disableWebgl) {
      await page.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          if (String(type).indexOf('webgl') !== -1) return null;
          return orig.call(this, type, ...rest);
        };
      });
    }
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

async function open(page) {
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDCinematic && !!window.NGDDiamondJourney);
}

/* the site uses CSS smooth scrolling — tests scroll instantly so each
   step lands before the next assertion, then settle mid-story */
async function scrollThroughStory(page) {
  await page.evaluate(async () => {
    const story = document.getElementById('manufacturing-story');
    const top = story.getBoundingClientRect().top + window.scrollY;
    const end = top + story.offsetHeight;
    for (let y = top - 300; y <= end; y += window.innerHeight / 2) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: top + story.offsetHeight * 0.55, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 150));
  });
}

/** Sum of alpha channel — proof the scene actually painted something. */
function canvasInk(page, slug, p) {
  return page.evaluate(([s, prog]) => {
    window.NGDDiamondJourney.force(s, prog);
    const stage = document.querySelector('.ngd-story-stage[data-slug="' + s + '"]');
    const canvas = stage.querySelector('.ngd-stage-canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 40) ink += data[i];
    return ink;
  }, [slug, p]);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('opening sequence: the hero copy cascades in and the 3D intro completes', {}, async (page) => {
    await open(page);
    const staged = await page.evaluate(() => ({
      cine: document.querySelector('.ngd-hero').classList.contains('ngd-cine'),
      items: document.querySelectorAll('.ngd-hero .ngd-cine-item').length,
    }));
    expect(staged.cine && staged.items >= 5, 'hero copy is staged for the cascade, got ' + staged.items);
    await page.waitForFunction(() =>
      document.querySelector('.ngd-hero').classList.contains('ngd-cine-ready'), null, { timeout: 5000 });
    await page.waitForFunction(() => window.NGDCinematic.state.heroIntro === 'played');
    await page.waitForFunction(() => window.__NGD_HERO_MODE === 'webgl', null, { timeout: 15000 });
    /* the opening sequence is now a ~8s cinematic (spec: 10s feel), and CI
       software rendering can pace it slower — wait generously */
    await page.waitForFunction(() => window.__NGD_HERO_INTRO === 'done', null, { timeout: 20000 });
    const visible = await page.evaluate(() => {
      const h1 = document.querySelector('.ngd-hero h1');
      return parseFloat(getComputedStyle(h1).opacity);
    });
    expect(visible > 0.9, 'headline fully revealed after the sequence, got ' + visible);
  });

  await scenario('usability first: the hero CTA works immediately, before the intro finishes', {}, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.click('.ngd-hero a[href="diamonds.html"]', { force: true });
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('scroll handoff: the SAME hero diamond receives scroll progress into the story', {}, async (page) => {
    await open(page);
    await page.waitForFunction(() => window.__NGD_HERO_MODE === 'webgl', null, { timeout: 25000 });
    const before = await page.evaluate(() => window.NGDCinematic.state.heroScroll);
    /* the hero handoff is anchored 'top top': at the top of the page the
       diamond must be untouched no matter when ScrollTrigger updates */
    expect(before < 0.05, 'diamond untouched at the top of the page, got ' + before);
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: 'instant' }));
    /* three canvases share the frame budget under software rendering,
       so give the scrub a CI-realistic window to catch up */
    await page.waitForFunction(() => window.NGDCinematic.state.heroScroll > 0.4, null, { timeout: 12000 });
    const after = await page.evaluate(() => ({
      p: window.NGDCinematic.state.heroScroll,
      api: typeof window.NGDHero3D.setScroll === 'function',
      gsap: window.NGDCinematic.state.gsap,
    }));
    expect(after.p > before, 'hero scroll progress advanced, got ' + after.p);
    expect(after.api, 'the hero exposes the scroll handoff API');
    expect(after.gsap === true, 'vendored GSAP ScrollTrigger is driving the scrub');
  });

  await scenario('journey scenes: all six stages mount canvases over their intact SVG art', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((slugs) => ({
      mounted: window.NGDDiamondJourney.state.mounted,
      canvases: document.querySelectorAll('#manufacturing-story .ngd-stage-canvas').length,
      svgs: document.querySelectorAll('#manufacturing-story .ngd-story-media > svg').length,
      cinematic: document.getElementById('manufacturing-story').classList.contains('is-cinematic'),
      slugsOk: slugs.every((s) =>
        !!document.querySelector('.ngd-story-stage[data-slug="' + s + '"] .ngd-stage-canvas')),
    }), SLUGS);
    expect(state.mounted === 6 && state.canvases === 6, 'six scenes mounted, got ' + state.mounted);
    expect(state.svgs === 6, 'the original SVG artwork stays underneath');
    expect(state.cinematic && state.slugsOk, 'every stage carries its scene');
  });

  await scenario('every scene draws — and draws MORE as its stage progresses', {}, async (page) => {
    await open(page);
    for (const slug of SLUGS) {
      const early = await canvasInk(page, slug, 0.05);
      const late = await canvasInk(page, slug, 0.85);
      expect(late > 0, slug + ' scene paints at p=0.85');
      expect(late > early, slug + ' scene grows with progress (early ' + early + ' → late ' + late + ')');
    }
  });

  await scenario('scroll drives the scenes; reversing the scroll reverses them', {}, async (page) => {
    await open(page);
    await scrollThroughStory(page);
    const forward = await page.evaluate(() => ({ ...window.NGDDiamondJourney.state.progress }));
    expect(forward.growth > 0.6, 'growth scene progressed with scroll, got ' + forward.growth);
    await page.evaluate(() => {
      const story = document.getElementById('manufacturing-story');
      window.scrollTo({ top: story.getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' });
    });
    await page.waitForFunction((prev) =>
      window.NGDDiamondJourney.state.progress.finished < prev, forward.finished, { timeout: 5000 });
  });

  await scenario('progress rail: 01–06 dots follow the active stage and jump on click', {}, async (page) => {
    await open(page);
    const rail = await page.evaluate(() => ({
      count: document.querySelectorAll('#home-journey-progress .ngd-journey-dot').length,
      single: document.querySelectorAll('#home-journey-progress').length,
    }));
    expect(rail.count === 6 && rail.single === 1, 'one rail with six stage dots, got ' + rail.count);
    await scrollThroughStory(page);
    const active = await page.evaluate(() => ({
      shown: document.getElementById('home-journey-progress').classList.contains('is-shown'),
      current: document.querySelectorAll('#home-journey-progress [aria-current="step"]').length,
      activeStage: window.NGDCinematic.state.activeStage,
    }));
    expect(active.shown, 'the rail shows while the journey is on screen');
    expect(active.current === 1 && active.activeStage !== null, 'exactly one active stage');
    await page.click('#home-journey-progress [data-journey-stage="03"]');
    await page.waitForFunction(() => window.NGDCinematic.state.activeStage === '03', null, { timeout: 6000 });
  });

  await scenario('fast scroll, reverse and resize never break the scene', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(300);
    const ink = await canvasInk(page, 'polishing', 0.7);
    expect(ink > 0, 'scenes still paint after fast scroll + resize, got ' + ink);
    const counts = await page.evaluate(() => ({
      canvases: document.querySelectorAll('.ngd-stage-canvas').length,
      rails: document.querySelectorAll('#home-journey-progress').length,
    }));
    expect(counts.canvases === 6 && counts.rails === 1, 'nothing re-mounted or duplicated');
  });

  await scenario('reduced motion: no scenes, no sequence — everything visible and still', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      reduced: window.NGDCinematic.state.reduced && window.NGDDiamondJourney.state.reduced,
      canvases: document.querySelectorAll('.ngd-stage-canvas').length,
      svgVisible: parseFloat(getComputedStyle(
        document.querySelector('.ngd-story-stage[data-slug="growth"] .ngd-story-media svg')).opacity),
      h1Opacity: parseFloat(getComputedStyle(document.querySelector('.ngd-hero h1')).opacity),
      heroAnimated: window.__NGD_HERO_ANIMATED,
      cta: !!document.querySelector('.ngd-story-stage[data-slug="finished"] a[href="jewellery.html"]'),
    }));
    expect(state.reduced && state.canvases === 0, 'no canvas scenes under reduced motion');
    expect(state.svgVisible === 1, 'the SVG artwork IS the scene, fully visible');
    expect(state.h1Opacity === 1, 'hero copy immediately visible — no cascade');
    expect(state.heroAnimated === false, 'the WebGL hero holds a still frame');
    expect(state.cta, 'the Explore Jewellery path is content, not motion');
  });

  await scenario('no WebGL: static hero fallback while the 2D journey still performs', { disableWebgl: true }, async (page) => {
    await open(page);
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      mode: window.__NGD_HERO_MODE,
      fallbackVisible: !!document.querySelector('.ngd-hero-fallback') &&
        !document.querySelector('[data-ngd-hero3d]').classList.contains('is-3d'),
      mounted: window.NGDDiamondJourney.state.mounted,
    }));
    expect(state.mode === 'static' && state.fallbackVisible, 'hero keeps its quality SVG fallback');
    expect(state.mounted === 6, 'the 2D canvas journey is independent of WebGL');
    const ink = await canvasInk(page, 'growth', 0.8);
    expect(ink > 0, 'journey scenes still paint');
  });

  await scenario('mobile 390: lighter profile, compact rail, no overflow', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      profile: window.NGDDiamondJourney.state.profile,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      mounted: window.NGDDiamondJourney.state.mounted,
      labelHidden: getComputedStyle(
        document.querySelector('#home-journey-progress .ngd-journey-dot span')).display === 'none',
    }));
    expect(state.profile === 'mobile', 'mobile profile detected');
    expect(state.overflow, 'no horizontal overflow');
    expect(state.mounted === 6 && state.labelHidden, 'scenes run with the compact numbered rail');
  });

  await scenario('underneath it all: live products, CMS hooks and links still work', {}, async (page) => {
    await open(page);
    await page.waitForFunction(() =>
      document.querySelectorAll('#featured-diamonds .ngd-diamond-card').length > 0, null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#featured-diamonds .ngd-diamond-card').length,
      detailLink: !!document.querySelector('#featured-diamonds a[href^="diamond-details.html?id="]'),
      cmsHooks: document.querySelectorAll('[data-cms]').length,
      recent: !!document.getElementById('recently-viewed'),
      finder: !!document.getElementById('home-mini-finder'),
      storyCta: !!document.querySelector('#manufacturing-story a[href="manufacturing.html"]'),
      jewelleryCta: !!document.querySelector('.ngd-story-stage[data-slug="finished"] a[href="jewellery.html"]'),
    }));
    expect(state.cards === 3 && state.detailLink, 'live Supabase diamonds render with real detail links');
    expect(state.cmsHooks >= 10, 'CMS hooks intact, got ' + state.cmsHooks);
    expect(state.recent && state.finder, 'Recently Viewed + mini finder untouched');
    expect(state.storyCta && state.jewelleryCta, 'manufacturing + jewellery paths both live');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} home-cinematic scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
