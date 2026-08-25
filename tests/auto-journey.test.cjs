/* ============================================================
   Auto Journey (hybrid navigation) tests.
   The scroll-chauffeur that plays the cinematic chapters like a
   film while the visitor always wins: defaults per profile
   (desktop scenes-on, mobile off, reduced inert), the tour
   actually driving the scroll-scrubbed scenes, instant
   suspension on wheel/pointer/menus with no positional jump,
   idle resume, the Auto Explore toggle with session memory,
   page-to-page continuation ONLY in explicit user-on mode —
   indicator, cancellation, and departure through the SAME
   cinematic transition engine as clicks.
   Run:  node tests/auto-journey.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://auto-j.supabase.co';
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
    if (opts.pref) {
      await context.addInitScript((value) => {
        try { sessionStorage.setItem('ngd-auto-explore', value); } catch (e) { /* ok */ }
      }, opts.pref);
    }
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

async function open(page, file) {
  await page.goto(`${SITE}/${file || 'index.html'}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDAutoJourney);
}

/** shrink all timings and launch the tour deterministically */
async function fastTour(page, extra) {
  await page.evaluate((over) => {
    window.NGDAutoJourney.tune(Object.assign({
      startIdle: 200, dwell: 220, glideMin: 180, glideMax: 500,
      softIdle: 300, hardIdle: 400, navCountdown: 600,
    }, over || {}));
    if (window.NGDHero3D && window.NGDHero3D.seek) window.NGDHero3D.seek(9);
    window.NGDAutoJourney.start();
  }, extra || {});
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('desktop default: Auto Explore on for scenes, toggle rendered and pressed', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      mode: window.NGDAutoJourney.state.mode(),
      profile: window.NGDAutoJourney.state.profile,
      toggle: !!document.querySelector('.ngd-auto-toggle'),
      pressed: document.querySelector('.ngd-auto-toggle').getAttribute('aria-pressed'),
      label: document.querySelector('.ngd-auto-toggle').textContent.trim(),
      stored: sessionStorage.getItem('ngd-auto-explore'),
    }));
    expect(st.mode === 'on' && st.profile === 'desktop', 'scenes-on by default on desktop');
    expect(st.toggle && st.pressed === 'true', 'toggle present and pressed');
    expect(/auto explore/i.test(st.label), 'toggle label');
    expect(st.stored === null, 'the default is not persisted — only choices are');
  });

  await scenario('reduced motion: the module is inert and injects nothing', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      inert: !!(window.NGDAutoJourney.state && window.NGDAutoJourney.state.inert),
      toggle: !!document.querySelector('.ngd-auto-toggle'),
    }));
    expect(st.inert, 'inert under prefers-reduced-motion');
    expect(!st.toggle, 'no toggle injected');
  });

  await scenario('mobile default: off, with a simplified beat list once enabled', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      mode: window.NGDAutoJourney.state.mode(),
      profile: window.NGDAutoJourney.state.profile,
      pressed: document.querySelector('.ngd-auto-toggle').getAttribute('aria-pressed'),
      beats: window.NGDAutoJourney.state.beats(),
    }));
    expect(st.mode === 'off' && st.profile === 'mobile', 'conservative mobile default');
    expect(st.pressed === 'false', 'toggle reads off');
    expect(st.beats === 4, 'simplified three-stage + jewellery beat list, got ' + st.beats);
  });

  await scenario('the chauffeur really drives the film: scroll advances through the scenes', {}, async (page) => {
    await open(page);
    await page.waitForFunction(() => !!window.NGDDiamondJourney);
    await fastTour(page);
    await page.waitForFunction(() => window.NGDAutoJourney.state.step() >= 1, null, { timeout: 15000 });
    await page.waitForFunction(() =>
      window.scrollY > 400 &&
      (window.NGDDiamondJourney.state.progress.growth || 0) > 0.1,
      null, { timeout: 20000 });
    const beats = await page.evaluate(() => window.NGDAutoJourney.state.beats());
    expect(beats === 7, 'desktop homepage tour has six stages + jewellery, got ' + beats);
  });

  await scenario('wheel hands control to the visitor mid-glide — no jump, no fight', {}, async (page) => {
    await open(page);
    await fastTour(page, { dwell: 3000, glideMin: 2500, glideMax: 4000 });
    await page.waitForFunction(() => window.NGDAutoJourney.state.running() && window.scrollY > 40, null, { timeout: 15000 });
    const before = await page.evaluate(() => {
      document.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }));
      return window.scrollY;
    });
    await page.waitForFunction(() => window.NGDAutoJourney.state.suspended(), null, { timeout: 3000 });
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before) < 60, 'the page stays where the visitor took it, drift=' + Math.abs(after - before));
  });

  await scenario('any pointer press suspends the journey instantly', {}, async (page) => {
    await open(page);
    await fastTour(page, { dwell: 3000 });
    await page.waitForFunction(() => window.NGDAutoJourney.state.running(), null, { timeout: 15000 });
    await page.evaluate(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await page.waitForFunction(() => window.NGDAutoJourney.state.suspended(), null, { timeout: 2000 });
  });

  await scenario('after a soft interruption the film resumes on idle', {}, async (page) => {
    await open(page);
    await fastTour(page);
    await page.waitForFunction(() => window.NGDAutoJourney.state.running(), null, { timeout: 15000 });
    await page.evaluate(() => {
      document.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    });
    await page.waitForFunction(() => window.NGDAutoJourney.state.suspended(), null, { timeout: 2000 });
    await page.waitForFunction(() =>
      window.NGDAutoJourney.state.running() && !window.NGDAutoJourney.state.suspended(),
      null, { timeout: 8000 });
  });

  await scenario('an open menu holds the journey until it closes', {}, async (page) => {
    await open(page);
    await fastTour(page);
    await page.waitForFunction(() => window.NGDAutoJourney.state.running(), null, { timeout: 15000 });
    await page.evaluate(() => {
      document.dispatchEvent(new Event('show.bs.offcanvas', { bubbles: true }));
    });
    await page.waitForFunction(() => window.NGDAutoJourney.state.suspended(), null, { timeout: 2000 });
    await page.waitForTimeout(900); // well past hardIdle — must NOT resume while open
    expect(await page.evaluate(() => window.NGDAutoJourney.state.running()) === false,
      'held while the menu is open');
    await page.evaluate(() => {
      document.dispatchEvent(new Event('hidden.bs.offcanvas', { bubbles: true }));
    });
    await page.waitForFunction(() => window.NGDAutoJourney.state.running(), null, { timeout: 8000 });
  });

  await scenario('the toggle: off stops and remembers; on again is an explicit user choice', {}, async (page) => {
    await open(page);
    await page.click('.ngd-auto-toggle');
    let st = await page.evaluate(() => ({
      mode: window.NGDAutoJourney.state.mode(),
      stored: sessionStorage.getItem('ngd-auto-explore'),
      pressed: document.querySelector('.ngd-auto-toggle').getAttribute('aria-pressed'),
    }));
    expect(st.mode === 'off' && st.stored === 'off' && st.pressed === 'false', 'off is stored for the session');
    await page.click('.ngd-auto-toggle');
    st = await page.evaluate(() => ({
      mode: window.NGDAutoJourney.state.mode(),
      stored: sessionStorage.getItem('ngd-auto-explore'),
    }));
    expect(st.mode === 'user-on' && st.stored === 'user-on', 're-enabling is the explicit user-on mode');
  });

  await scenario('default-on tours end quietly: no automatic page navigation', {}, async (page) => {
    await open(page);
    await fastTour(page);
    await page.waitForFunction(() => window.NGDAutoJourney.state.completed(), null, { timeout: 30000 });
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => ({
      navArmed: window.NGDAutoJourney.state.navArmed(),
      indicator: !!document.querySelector('.ngd-auto-next.is-shown'),
      here: location.pathname.endsWith('index.html'),
    }));
    expect(!st.navArmed && !st.indicator, 'no continuation is armed');
    expect(st.here, 'still on the homepage');
  });

  await scenario('user-on completion arms the NEXT indicator — and any touch cancels it', { pref: 'user-on' }, async (page) => {
    await open(page);
    await fastTour(page, { navCountdown: 60000 });
    await page.waitForFunction(() => window.NGDAutoJourney.state.navArmed(), null, { timeout: 30000 });
    const shown = await page.evaluate(() => ({
      text: document.querySelector('.ngd-auto-next').textContent,
      shown: document.querySelector('.ngd-auto-next').classList.contains('is-shown'),
    }));
    expect(shown.shown && /Manufacturing/i.test(shown.text), 'NEXT · Manufacturing indicator, got ' + shown.text.trim());
    await page.evaluate(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await page.waitForFunction(() => !window.NGDAutoJourney.state.navArmed(), null, { timeout: 2000 });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => location.pathname.endsWith('index.html')), 'cancelled — still here');
  });

  await scenario('user-on continuation departs through the SAME transition engine', { pref: 'user-on' }, async (page) => {
    await open(page);
    await page.evaluate(() => {
      window.addEventListener('pagehide', () => {
        try {
          sessionStorage.setItem('ngd-aj-depart', JSON.stringify({
            overlay: document.querySelector('.ngd-pt-overlay').classList.contains('is-active'),
            count: window.NGDPageTransitions.state.intercepted,
          }));
        } catch (e) { /* ok */ }
      });
    });
    await fastTour(page, { navCountdown: 500 });
    await page.waitForURL('**/manufacturing.html', { timeout: 45000 });
    await page.waitForFunction(() => !!window.NGDAutoJourney, null, { timeout: 15000 });
    const st = await page.evaluate(() => ({
      depart: JSON.parse(sessionStorage.getItem('ngd-aj-depart') || '{}'),
      mode: window.NGDAutoJourney.state.mode(),
      toggle: !!document.querySelector('.ngd-auto-toggle'),
    }));
    expect(st.depart.overlay === true, 'cinematic overlay ran the departure');
    expect(st.depart.count === 1, 'exactly one engine departure, got ' + st.depart.count);
    expect(st.mode === 'user-on' && st.toggle, 'Auto Explore carries into the next chapter');
  });

  await scenario('USER PRIORITY: a CTA click mid-film cancels auto and navigates at once', {}, async (page) => {
    await open(page);
    await fastTour(page, { dwell: 4000 });
    await page.waitForFunction(() => window.NGDAutoJourney.state.running(), null, { timeout: 15000 });
    await page.click('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]', { force: true });
    await page.waitForURL('**/diamonds.html', { timeout: 10000 });
    const st = await page.evaluate(() => ({
      mode: window.NGDAutoJourney ? window.NGDAutoJourney.state.mode() : null,
      here: location.pathname.endsWith('diamonds.html'),
    }));
    expect(st.here, 'the click won immediately');
    expect(st.mode === 'on', 'scenes-mode carries over without becoming page-hopping');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} auto-journey scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
