/* ============================================================
   Homepage 3D hero tests (PROMPT 3).
   Verifies the Three.js diamond hero (WebGL mode), the static
   SVG fallback paths, reduced-motion behaviour, mobile profile
   and the hero content/CTAs.
   Run:  node tests/hero.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

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
      contentType: 'application/javascript',
      body: "window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'https://home-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};",
    }));
    await context.route('https://home-test.supabase.co/**', (r) => r.request().method() === 'OPTIONS'
      ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' })
      : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
    if (opts.blockThree) {
      await context.route('https://cdn.jsdelivr.net/npm/three@**', (r) => r.abort());
    }
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

    const relevant = opts.allowLoadErrors
      ? pageErrors.filter((e) => !/fetch|import|load/i.test(e))
      : pageErrors;
    expect(relevant.length === 0, 'no uncaught page errors, got: ' + relevant.join(' | '));
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

async function waitHeroMode(page, mode) {
  await page.waitForFunction(
    (m) => window.__NGD_HERO_MODE === m,
    mode,
    { timeout: 15000 }
  );
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero content: headline, supporting text, both CTAs', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    const content = await page.evaluate(() => ({
      headline: document.querySelector('.ngd-hero h1').textContent.replace(/\s+/g, ' ').trim(),
      lead: document.querySelector('.ngd-hero .ngd-lead').textContent.trim(),
      diamondsHref: (document.querySelector('.ngd-hero a.ngd-btn-gold') || {}).getAttribute?.('href') ||
        document.querySelector('.ngd-hero a[href="diamonds.html"]').getAttribute('href'),
      jewelleryHref: document.querySelector('.ngd-hero a[href="jewellery.html"]').getAttribute('href'),
      buttons: [...document.querySelectorAll('.ngd-hero a.ngd-btn')].map((a) => a.textContent.trim()),
    }));
    expect(/Diamonds grown by science/.test(content.headline), 'strong headline present');
    expect(content.lead.length > 20 && content.lead.length < 160, 'short supporting text');
    expect(content.buttons.includes('Explore Diamonds'), 'Explore Diamonds button');
    expect(content.buttons.includes('Explore Jewellery'), 'Explore Jewellery button');
  });

  await scenario('WebGL mode: canvas renders, fallback hidden, desktop profile', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await waitHeroMode(page, 'webgl');
    const state = await page.evaluate(() => ({
      is3d: document.querySelector('[data-ngd-hero3d]').classList.contains('is-3d'),
      canvas: !!document.querySelector('[data-ngd-hero3d] canvas'),
      fallbackHidden:
        getComputedStyle(document.querySelector('.ngd-hero-fallback')).display === 'none',
      animated: window.__NGD_HERO_ANIMATED,
      profile: window.__NGD_HERO_PROFILE,
      parallax: window.__NGD_HERO_PARALLAX,
      canvasSize: (() => {
        const c = document.querySelector('[data-ngd-hero3d] canvas');
        return c ? { w: c.clientWidth, h: c.clientHeight } : null;
      })(),
    }));
    expect(state.is3d && state.canvas, '3D canvas mounted');
    expect(state.fallbackHidden, 'SVG fallback hidden in WebGL mode');
    expect(state.animated === true, 'animation loop running');
    expect(state.profile === 'desktop', 'desktop profile');
    expect(state.parallax === true, 'parallax enabled on desktop');
    expect(state.canvasSize.w > 200 && state.canvasSize.h > 200, 'canvas has real size');
    /* parallax smoke: sweep the pointer across the hero */
    await page.mouse.move(300, 300);
    await page.mouse.move(900, 500, { steps: 10 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'hero-desktop.png') });
  });

  await scenario('reduced motion: WebGL still frame, no animation loop', { reducedMotion: 'reduce' }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await waitHeroMode(page, 'webgl');
    const state = await page.evaluate(() => ({
      animated: window.__NGD_HERO_ANIMATED,
      canvas: !!document.querySelector('[data-ngd-hero3d] canvas'),
    }));
    expect(state.canvas, 'canvas mounted');
    expect(state.animated === false, 'no animation loop under reduced motion');
  });

  await scenario('mobile profile: reduced effects, no parallax, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await waitHeroMode(page, 'webgl');
    const state = await page.evaluate(() => ({
      profile: window.__NGD_HERO_PROFILE,
      parallax: window.__NGD_HERO_PARALLAX,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(state.profile === 'mobile', 'mobile profile');
    expect(state.parallax === false, 'no parallax on mobile');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW} c=${state.clientW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'hero-mobile.png') });
  });

  await scenario('WebGL unavailable → static SVG fallback', { disableWebgl: true }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__NGD_HERO_MODE === 'static', null, { timeout: 15000 });
    const state = await page.evaluate(() => ({
      canvas: !!document.querySelector('[data-ngd-hero3d] canvas'),
      fallbackVisible:
        getComputedStyle(document.querySelector('.ngd-hero-fallback')).display !== 'none',
    }));
    expect(!state.canvas, 'no canvas mounted');
    expect(state.fallbackVisible, 'SVG fallback visible');
  });

  await scenario('three.js CDN blocked → static SVG fallback, page still works', { blockThree: true, allowLoadErrors: true }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => ({
      mode: window.__NGD_HERO_MODE,
      canvas: !!document.querySelector('[data-ngd-hero3d] canvas'),
      fallbackVisible:
        getComputedStyle(document.querySelector('.ngd-hero-fallback')).display !== 'none',
      headline: !!document.querySelector('.ngd-hero h1'),
    }));
    expect(state.mode === undefined, 'hero module never ran');
    expect(!state.canvas && state.fallbackVisible, 'SVG fallback shown');
    expect(state.headline, 'hero content unaffected');
  });

  await scenario('Explore Diamonds navigates to diamonds.html', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('.ngd-hero a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('Explore Jewellery navigates to jewellery.html', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('.ngd-hero a[href="jewellery.html"]');
    await page.waitForURL('**/jewellery.html', { timeout: 8000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} hero scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
