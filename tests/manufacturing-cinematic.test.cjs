/* ============================================================
   Manufacturing page cinematics — the homepage's From Carbon to
   Brilliance treatment applied to the full nine-stage process
   page. Verifies: the hero copy cascade, nine scroll-driven
   canvas scenes over the intact SVG artwork (including the four
   scenes unique to this page — planning, laser, certification
   and the finished-stone showcase, with the jewellery stage
   reusing the ring assembly), the 01–09 progress rail, reverse
   scrolling, reduced-motion and mobile behaviour, and that the
   page's pinned content (stage titles, quality cards, IGI/GIA
   copy, CTAs) is untouched underneath.
   Run:  node tests/manufacturing-cinematic.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://home-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };
const SLUGS = ['growth', 'rough', 'planning', 'laser', 'polishing',
  'inspection', 'certification', 'finished', 'jewellery'];
const NEW_SLUGS = ['planning', 'laser', 'certification', 'finished', 'jewellery'];
const TITLES = ['CVD Diamond Growth', 'Rough Diamond', 'Planning', 'Laser Cutting', 'Polishing',
  'Quality Inspection', 'Certification', 'Finished Diamond', 'Jewellery Creation'];

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
    await context.route(SB_HOST + '/**', (r) => r.request().method() === 'OPTIONS'
      ? r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' })
      : r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '[]' }));
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

async function open(page) {
  await page.goto(`${SITE}/manufacturing.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDCinematic && !!window.NGDDiamondJourney);
}

/* the site scrolls smoothly by CSS — tests use instant jumps */
async function scrollThroughProcess(page) {
  await page.evaluate(async () => {
    const story = document.getElementById('mfg-process');
    const top = story.getBoundingClientRect().top + window.scrollY;
    const end = top + story.offsetHeight;
    for (let y = top - 300; y <= end; y += window.innerHeight / 2) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: top + story.offsetHeight * 0.5, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 150));
  });
}

function canvasInk(page, slug, p) {
  return page.evaluate(([s, prog]) => {
    window.NGDDiamondJourney.force(s, prog);
    const stage = document.querySelector('#mfg-process .ngd-story-stage[data-slug="' + s + '"]');
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

  await scenario('hero: the cinematic copy cascade plays and settles fully visible', {}, async (page) => {
    await open(page);
    const staged = await page.evaluate(() => ({
      cine: document.querySelector('.ngd-hero').classList.contains('ngd-cine'),
      items: document.querySelectorAll('.ngd-hero .ngd-cine-item').length,
    }));
    expect(staged.cine && staged.items >= 4, 'hero copy staged for the cascade, got ' + staged.items);
    await page.waitForFunction(() =>
      document.querySelector('.ngd-hero').classList.contains('ngd-cine-ready'), null, { timeout: 5000 });
    const h1 = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector('.ngd-hero h1')).opacity));
    expect(h1 > 0.9, 'headline fully revealed, got ' + h1);
    await page.click('.ngd-hero a[href="#mfg-process"]', { force: true });
  });

  await scenario('all nine stages mount scroll-driven scenes over their intact SVG art', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((slugs) => ({
      mounted: window.NGDDiamondJourney.state.mounted,
      canvases: document.querySelectorAll('#mfg-process .ngd-stage-canvas').length,
      svgs: document.querySelectorAll('#mfg-process .ngd-story-media > svg').length,
      cinematic: document.getElementById('mfg-process').classList.contains('is-cinematic'),
      slugsOk: slugs.every((s) =>
        !!document.querySelector('#mfg-process .ngd-story-stage[data-slug="' + s + '"] .ngd-stage-canvas')),
      gsap: window.NGDCinematic.state.gsap,
    }), SLUGS);
    expect(state.mounted === 9 && state.canvases === 9, 'nine scenes mounted, got ' + state.mounted);
    expect(state.svgs === 9, 'the original SVG artwork stays underneath');
    expect(state.cinematic && state.slugsOk && state.gsap, 'every stage runs under ScrollTrigger');
  });

  await scenario('the page-specific scenes paint and grow — planning, laser, certification, showcase, jewellery', {}, async (page) => {
    await open(page);
    for (const slug of NEW_SLUGS) {
      const early = await canvasInk(page, slug, 0.05);
      const late = await canvasInk(page, slug, 0.85);
      expect(late > 0, slug + ' scene paints at p=0.85');
      expect(late > early, slug + ' scene grows with progress (early ' + early + ' → late ' + late + ')');
    }
    /* the finished stage here is the stone showcase, NOT the ring —
       and the jewellery stage carries the ring assembly */
    const showcaseInk = await canvasInk(page, 'finished', 0.95);
    const ringInk = await canvasInk(page, 'jewellery', 0.95);
    expect(showcaseInk > 0 && ringInk > 0 && showcaseInk !== ringInk,
      'finished (showcase) and jewellery (ring assembly) are distinct scenes');
  });

  await scenario('scroll drives the scenes and reversing the scroll reverses them', {}, async (page) => {
    await open(page);
    await scrollThroughProcess(page);
    const mid = await page.evaluate(() => ({ ...window.NGDDiamondJourney.state.progress }));
    expect(mid.growth > 0.6, 'growth progressed with scroll, got ' + mid.growth);
    expect(mid.polishing > 0, 'the mid-journey stage is underway at the settle point, got ' + mid.polishing);
    await page.evaluate(() => {
      const story = document.getElementById('mfg-process');
      window.scrollTo({ top: story.getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' });
    });
    await page.waitForFunction((prev) =>
      window.NGDDiamondJourney.state.progress.polishing < prev, mid.polishing, { timeout: 5000 });
  });

  await scenario('progress rail: nine dots track the active stage and jump on click', {}, async (page) => {
    await open(page);
    const rail = await page.evaluate(() => ({
      rails: document.querySelectorAll('#home-journey-progress').length,
      dots: document.querySelectorAll('#home-journey-progress .ngd-journey-dot').length,
      stages: [...document.querySelectorAll('#home-journey-progress .ngd-journey-dot')]
        .map((d) => d.getAttribute('data-journey-stage')),
    }));
    expect(rail.rails === 1 && rail.dots === 9, 'one rail, nine dots, got ' + rail.dots);
    expect(rail.stages.join(',') === '01,02,03,04,05,06,07,08,09', 'dots in stage order');
    await scrollThroughProcess(page);
    const active = await page.evaluate(() => ({
      shown: document.getElementById('home-journey-progress').classList.contains('is-shown'),
      current: document.querySelectorAll('#home-journey-progress [aria-current="step"]').length,
    }));
    expect(active.shown && active.current === 1, 'rail visible with exactly one active stage');
    await page.click('#home-journey-progress [data-journey-stage="07"]');
    await page.waitForFunction(() => window.NGDCinematic.state.activeStage === '07', null, { timeout: 6000 });
  });

  await scenario('fast scroll and resize never duplicate or break the scenes', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(300);
    const ink = await canvasInk(page, 'certification', 0.8);
    expect(ink > 0, 'scenes still paint after fast scroll + resize');
    const counts = await page.evaluate(() => ({
      canvases: document.querySelectorAll('.ngd-stage-canvas').length,
      rails: document.querySelectorAll('#home-journey-progress').length,
    }));
    expect(counts.canvases === 9 && counts.rails === 1, 'nothing re-mounted or duplicated');
  });

  await scenario('reduced motion: no scenes or cascade — the SVG journey is simply visible', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const state = await page.evaluate((titles) => ({
      canvases: document.querySelectorAll('.ngd-stage-canvas').length,
      svgVisible: parseFloat(getComputedStyle(
        document.querySelector('#mfg-process .ngd-story-stage[data-slug="laser"] .ngd-story-media svg')).opacity),
      h1Opacity: parseFloat(getComputedStyle(document.querySelector('.ngd-hero h1')).opacity),
      titlesOk: [...document.querySelectorAll('#mfg-process .ngd-story-title')]
        .map((t) => t.textContent.trim()).join('|') === titles.join('|'),
    }), TITLES);
    expect(state.canvases === 0, 'no canvas scenes under reduced motion');
    expect(state.svgVisible === 1 && state.h1Opacity === 1, 'artwork and copy fully visible');
    expect(state.titlesOk, 'all nine stage titles intact');
  });

  await scenario('mobile 390: lighter profile, compact nine-dot rail, no overflow', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      profile: window.NGDDiamondJourney.state.profile,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      mounted: window.NGDDiamondJourney.state.mounted,
      railWidth: document.getElementById('home-journey-progress').getBoundingClientRect().width,
      labelHidden: getComputedStyle(
        document.querySelector('#home-journey-progress .ngd-journey-dot span')).display === 'none',
    }));
    expect(state.profile === 'mobile' && state.mounted === 9, 'mobile profile with all scenes');
    expect(state.overflow, 'no horizontal overflow');
    expect(state.labelHidden && state.railWidth <= 390, 'compact numbered rail fits the screen, got ' + state.railWidth);
  });

  await scenario('underneath: the pinned page content is untouched', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((titles) => ({
      titles: [...document.querySelectorAll('#mfg-process .ngd-story-title')].map((t) => t.textContent.trim()),
      qualityCards: document.querySelectorAll('#mfg-quality .ngd-card').length,
      labs: document.body.textContent.includes('IGI') && document.body.textContent.includes('GIA'),
      followCta: !!document.querySelector('.ngd-hero a[href="#mfg-process"]'),
      parallax: document.querySelectorAll('#mfg-process [data-ngd-parallax]').length,
    }), TITLES);
    expect(JSON.stringify(state.titles) === JSON.stringify(TITLES), 'all nine titles unchanged');
    expect(state.qualityCards === 4 && state.labs, 'quality cards + IGI/GIA copy intact');
    expect(state.followCta && state.parallax === 9, 'hero CTA and parallax hooks untouched');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} manufacturing-cinematic scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
