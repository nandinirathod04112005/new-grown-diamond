/* ============================================================
   Continuous homepage environment tests.
   One shared fixed canvas (#ngd-cinematic-background, a single
   render loop) paints scroll-evolving chapters behind the whole
   homepage: hero → bright crystal shapes → dark showroom →
   champagne jewellery studio → journey stages (growth plasma,
   cutting lasers, polishing brilliance, champagne finish) →
   sapphire close. Verified here: single mount + section handoff,
   homepage-only scope, deterministic chapter resolution via
   force(), continuous blending between chapters, silhouettes
   that relocate, parallax within a chapter, ambient idle motion,
   readability dimming, the champagne jewellery restyle, mobile
   simplification, and reduced-motion inertness (sections keep
   their own backgrounds).
   Run:  node tests/home-environment.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://home-env.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };

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
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript', body: TEST_CONFIG,
    }));
    await context.route(SB_HOST + '/**', (r) => {
      if (r.request().method() === 'OPTIONS') {
        return r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': '*/0' }, body: '[]' });
    });
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
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    window.NGDHomeEnv && (window.NGDHomeEnv.state.mounted || window.NGDHomeEnv.state.inert),
    null, { timeout: 15000 });
}

function anchorY(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY + rect.height / 2 - innerHeight / 2;
  }, sel);
}

function force(page, y) {
  return page.evaluate((yy) => window.NGDHomeEnv.force(yy), y);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('one shared background mounts and the sections hand over their backdrop', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      wraps: document.querySelectorAll('#ngd-cinematic-background').length,
      canvases: document.querySelectorAll('#ngd-cinematic-background canvas').length,
      aria: document.getElementById('ngd-cinematic-background').getAttribute('aria-hidden'),
      loops: window.NGDHomeEnv.state.loops,
      envOn: document.documentElement.classList.contains('ngd-env-on'),
      ambient: window.NGDCineBG.state.ambient,
      featuredBg: getComputedStyle(document.getElementById('featured-diamonds')).backgroundColor,
    }));
    expect(st.wraps === 1 && st.canvases === 1, 'exactly one environment canvas');
    expect(st.aria === 'true' && st.loops === 1, 'decorative, single render loop');
    expect(st.envOn, 'html.ngd-env-on stamped');
    expect(!st.ambient, 'generic ambient stands down on the homepage');
    expect(st.featuredBg === 'rgba(0, 0, 0, 0)', 'dark sections became transparent over the environment, got ' + st.featuredBg);
  });

  await scenario('the environment is homepage-only', {}, async (page) => {
    await page.goto(`${SITE}/diamonds.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NGDCineBG && window.NGDCineBG.state.ambient, null, { timeout: 10000 });
    const st = await page.evaluate(() => ({
      env: typeof window.NGDHomeEnv,
      shared: !!document.getElementById('ngd-cinematic-background'),
    }));
    expect(st.env === 'undefined' && !st.shared, 'other pages keep the lightweight ambient only');
  });

  await scenario('chapters resolve deterministically along the journey', {}, async (page) => {
    await open(page);
    expect((await force(page, 0)).id === 'hero', 'top = hero chapter');
    const stops = [
      ['#diamond-shapes', 'shapes'],
      ['#featured-diamonds', 'featured'],
      ['#fine-jewellery', 'jewellery'],
      ['.ngd-story-stage[data-slug="growth"]', 'growth'],
      ['.ngd-story-stage[data-slug="polishing"]', 'polishing'],
      ['#site-footer', 'close'],
    ];
    for (const [sel, id] of stops) {
      const y = await anchorY(page, sel);
      const params = await force(page, y);
      expect(params.id === id, sel + ' resolves to ' + id + ', got ' + params.id);
    }
  });

  await scenario('neighbouring chapters BLEND — no abrupt background switches', {}, async (page) => {
    await open(page);
    const yShapes = await anchorY(page, '#diamond-shapes');
    const yFeatured = await anchorY(page, '#featured-diamonds');
    const a = await force(page, yShapes);
    const b = await force(page, yFeatured);
    const mid = await force(page, (yShapes + yFeatured) / 2);
    const between = (v, lo, hi) => v > Math.min(lo, hi) + 5 && v < Math.max(lo, hi) - 5;
    expect(between(mid.top[0], a.top[0], b.top[0]),
      'midpoint base color sits between the chapters: ' + [a.top[0], mid.top[0], b.top[0]].map(Math.round).join(' → '));
    expect(between(mid.bright * 100, a.bright * 100, b.bright * 100) || Math.abs(a.bright - b.bright) < 0.02,
      'brightness blends through the transition');
  });

  await scenario('distant silhouettes relocate as the chapters change', {}, async (page) => {
    await open(page);
    const hero = await force(page, 0);
    const feat = await force(page, await anchorY(page, '#featured-diamonds'));
    const moved = hero.silh.filter((s, i) =>
      Math.abs(s.x - feat.silh[i].x) > 0.03 || Math.abs(s.y - feat.silh[i].y) > 0.03).length;
    expect(hero.silh.length === 5, 'five silhouettes on desktop');
    expect(moved >= 3, 'silhouettes take new positions between chapters, moved=' + moved);
  });

  await scenario('within a chapter the layers parallax with scroll', {}, async (page) => {
    await open(page);
    const yA = await anchorY(page, '#featured-diamonds');
    const row = (y) => page.evaluate((yy) => {
      window.NGDHomeEnv.force(yy);
      const canvas = document.querySelector('#ngd-cinematic-background canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, Math.floor(canvas.height * 0.4), canvas.width, 2).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 97) sum += data[i];
      return sum;
    }, y);
    const s1 = await row(yA);
    const s2 = await row(yA + 300);
    expect(s1 !== s2, 'the painted field shifts with scroll inside one chapter');
  });

  await scenario('ambient motion: the environment never freezes when idle', {}, async (page) => {
    await open(page);
    await page.waitForTimeout(300);
    const sample = () => page.evaluate(() => {
      const canvas = document.querySelector('#ngd-cinematic-background canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, Math.min(canvas.width, 400), 60).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 53) sum += data[i] + data[i + 1];
      return sum;
    });
    const a = await sample();
    await page.waitForTimeout(600);
    const b = await sample();
    expect(a !== b, 'idle frames still drift (a=' + a + ' b=' + b + ')');
  });

  await scenario('readability: technical chapters run dimmer than the bright crystal chapter', {}, async (page) => {
    await open(page);
    const shapes = await force(page, await anchorY(page, '#diamond-shapes'));
    const cutting = await force(page, await anchorY(page, '.ngd-story-stage[data-slug="cutting"]'));
    expect(cutting.bright < shapes.bright - 0.1,
      'cutting chapter dims for focus: ' + cutting.bright.toFixed(2) + ' < ' + shapes.bright.toFixed(2));
  });

  await scenario('the jewellery chapter is the champagne studio — dark vitrines, light copy', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const section = document.getElementById('fine-jewellery');
      const card = section.querySelector('.ngd-jewel-card');
      return {
        copy: getComputedStyle(section).color,
        cardBg: getComputedStyle(card).backgroundColor,
        warm: window.NGDHomeEnv.force(
          section.getBoundingClientRect().top + window.scrollY + section.offsetHeight / 2 - innerHeight / 2).warm,
      };
    });
    expect(/24[24], 24[02], 238/.test(st.copy), 'section copy is ivory, got ' + st.copy);
    expect(/rgba\(18, 14, 9/.test(st.cardBg), 'vitrine cards are dark glass, got ' + st.cardBg);
    expect(st.warm > 0.6, 'environment runs champagne-warm here, got ' + st.warm);
  });

  await scenario('mobile: the environment stays animated with simplified layers', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      profile: window.NGDHomeEnv.state.profile,
      silhouettes: window.NGDHomeEnv.state.layers.silhouettes,
      dustMax: window.NGDHomeEnv.state.layers.dustMax,
      mounted: window.NGDHomeEnv.state.mounted,
    }));
    expect(st.mounted && st.profile === 'mobile', 'mobile environment mounted');
    expect(st.silhouettes === 2 && st.dustMax <= 16,
      'simplified layers, got ' + st.silhouettes + '/' + st.dustMax);
  });

  await scenario('reduced motion: inert module, sections keep their own backgrounds', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      inert: window.NGDHomeEnv.state.inert === true,
      shared: !!document.getElementById('ngd-cinematic-background'),
      envOn: document.documentElement.classList.contains('ngd-env-on'),
      featuredBg: getComputedStyle(document.getElementById('featured-diamonds')).backgroundColor,
      jewelCopy: getComputedStyle(document.getElementById('fine-jewellery')).color,
    }));
    expect(st.inert && !st.shared && !st.envOn, 'no environment under reduced motion');
    expect(st.featuredBg !== 'rgba(0, 0, 0, 0)', 'dark sections keep their own gradients, got ' + st.featuredBg);
    expect(/24[24], 24[02], 238/.test(st.jewelCopy), 'champagne studio styling holds without the canvas');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} home-environment scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
