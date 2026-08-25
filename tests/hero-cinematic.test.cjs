/* ============================================================
   Hero tests — DIAMOND ECLIPSE → SUPERNOVA.
   One dominant colourless stone revealed by PHYSICAL LIGHTING
   (environment intensity + a travelling studio key — never a
   fade), camera orbit/dolly choreography, the eclipse halo and
   floor caustics signatures, the supernova beat, the gravity
   shift to the right-side seat, the ambient loop, the scroll
   exit (halo expands, stone deepens, scene dims), mobile and
   reduced-motion profiles, and the scroll hint. Deterministic
   via window.NGDHero3D.seek().
   Run:  node tests/hero-cinematic.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://hero-cine.supabase.co';
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
  await page.waitForFunction(() => window.__NGD_HERO_MODE === 'webgl', null, { timeout: 25000 });
}

function seek(page, t) {
  return page.evaluate((sec) => {
    window.NGDHero3D.seek(sec);
    return window.NGDHero3D.debug();
  }, t);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('one dominant stone with the two signature effects — no swarm', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      objects: window.NGDHero3D.state.objects,
      seek: typeof window.NGDHero3D.seek,
      profile: window.NGDHero3D.state.profile,
    }));
    expect(st.seek === 'function', 'seek available');
    expect(st.profile === 'desktop', 'desktop profile');
    expect(st.objects.hero === 1, 'exactly one diamond');
    expect(st.objects.secondaries === undefined, 'the supporting swarm is gone');
    expect(st.objects.halo === 1, 'the eclipse halo signature');
    expect(st.objects.caustics === 2, 'the floor caustic signature, got ' + st.objects.caustics);
    expect(st.objects.beams === 3, 'atmospheric beams + shaft, got ' + st.objects.beams);
  });

  await scenario('S1 eclipse: near-black, halo forming, the stone still unlit', {}, async (page) => {
    await open(page);
    const dark = await seek(page, 0.7);
    expect(dark.exposure < 0.25, 'eclipse darkness, exposure=' + dark.exposure);
    expect(dark.envIntensity < 0.2, 'the stone is not yet lit, env=' + dark.envIntensity);
    expect(dark.halo.opacity > 0.1, 'the eclipse halo is forming, got ' + dark.halo.opacity);
    expect(dark.keyIntensity < 0.05, 'the studio key has not entered yet');
  });

  await scenario('S2 first light: the stone is revealed by LIGHTING, never faded in', {}, async (page) => {
    await open(page);
    const before = await seek(page, 1.2);
    const first = await seek(page, 2.4);
    const lit = await seek(page, 4.6);
    expect(first.keyIntensity > 0.3 && first.keyIntensity > before.keyIntensity,
      'the narrow studio key enters, ' + before.keyIntensity.toFixed(2) + ' → ' + first.keyIntensity.toFixed(2));
    expect(first.envIntensity > before.envIntensity + 0.15,
      'facets progressively catch the environment, ' + before.envIntensity.toFixed(2) + ' → ' + first.envIntensity.toFixed(2));
    expect(lit.envIntensity > 1.2, 'fully lit after facet birth, env=' + lit.envIntensity);
  });

  await scenario('S3 facet birth: the camera truly orbits and dollies', {}, async (page) => {
    await open(page);
    const left = await seek(page, 3.0);
    const right = await seek(page, 5.0);
    const close = await seek(page, 5.9);
    const rest = await seek(page, 9);
    expect(left.camera[0] < -0.8, 'orbit swings left of the stone, x=' + left.camera[0]);
    expect(right.camera[0] > 0.7, 'then arcs to the right, x=' + right.camera[0]);
    expect(close.camera[2] < 3.6, 'the dolly closes in for the nova, z=' + close.camera[2]);
    expect(Math.abs(rest.camera[0]) < 0.03 && Math.abs(rest.camera[2] - 4.9) < 0.03,
      'the camera settles to neutral framing, got ' + rest.camera.join(','));
  });

  await scenario('S4 supernova: brilliance from light — flare, halo surge, caustic burst', {}, async (page) => {
    await open(page);
    const nova = await seek(page, 5.75);
    const after = await seek(page, 7.2);
    expect(nova.exposure > 1.25, 'exposure flares at the nova, got ' + nova.exposure);
    expect(nova.halo.opacity > 0.5, 'the halo brightens, got ' + nova.halo.opacity);
    expect(nova.caustic > 0.4, 'the caustics expand, got ' + nova.caustic);
    expect(after.exposure < nova.exposure, 'the flare recedes after the moment');
  });

  await scenario('the stone holds centre-stage through the film — animation is light + camera', {}, async (page) => {
    await open(page);
    for (const t of [1, 3, 5, 6.2]) {
      const dbg = await seek(page, t);
      expect(Math.abs(dbg.hero[0] - 0.35) < 0.4 && Math.abs(dbg.hero[2]) < 0.4,
        't=' + t + ': the diamond is not flown around, got ' + dbg.hero.join(','));
    }
  });

  await scenario('S5 gravity shift: the stone takes its seat, the halo follows its own path', {}, async (page) => {
    await open(page);
    const before = await seek(page, 6.4);
    const midway = await seek(page, 7.4);
    const seated = await seek(page, 9);
    expect(Math.abs(before.hero[0] - 0.35) < 0.1, 'still centre-stage before the shift');
    expect(midway.hero[0] > 0.7, 'gliding right mid-shift, x=' + midway.hero[0]);
    expect(midway.halo.x < midway.hero[0] - 0.25, 'the halo lags on its own path: ' +
      midway.halo.x.toFixed(2) + ' vs ' + midway.hero[0].toFixed(2));
    expect(Math.abs(seated.hero[0] - 1.9) < 0.05 && Math.abs(seated.hero[2] + 1.4) < 0.05,
      'final right-side seat, got ' + seated.hero.join(','));
    expect(Math.abs(seated.halo.x - 1.15) < 0.12, 'the offset eclipse rests behind the seat, got ' + seated.halo.x);
  });

  await scenario('ambient loop: the settled scene keeps living without jumping', {}, async (page) => {
    await open(page);
    await seek(page, 9);
    const a = await page.evaluate(() => window.NGDHero3D.debug());
    await page.waitForTimeout(800);
    const b = await page.evaluate(() => ({
      dbg: window.NGDHero3D.debug(),
      still: window.NGDHero3D.state.stillMode(),
    }));
    expect(b.still || b.dbg.spin > a.spin + 0.02,
      'micro-rotation continues (or the still is parked), ' + a.spin.toFixed(3) + ' → ' + b.dbg.spin.toFixed(3));
    expect(Math.abs(b.dbg.hero[0] - a.hero[0]) < 0.05, 'no positional jump in the loop');
  });

  await scenario('scroll exit: the halo expands, the stone deepens, the scene dims', {}, async (page) => {
    await open(page);
    const exit = await page.evaluate(() => {
      window.NGDHero3D.setScroll(0.5);
      window.NGDHero3D.seek(9);
      return window.NGDHero3D.debug();
    });
    expect(exit.halo.scale > 1.3, 'eclipse halo expands with the scroll, got ' + exit.halo.scale);
    expect(exit.hero[2] < -1.75, 'the diamond eases deeper, z=' + exit.hero[2]);
    expect(Math.abs(exit.exposure - 1.12 * 0.75) < 0.06, 'the scene dims for the handoff, got ' + exit.exposure);
  });

  await scenario('an early scroll never fights the visitor — the intro glides to its end', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.NGDHero3D.setScroll(0.35));
    await page.waitForFunction(() =>
      window.NGDHero3D.state.settled() && window.__NGD_HERO_INTRO === 'done',
      null, { timeout: 15000 });
  });

  await scenario('mobile: the full concept, smaller choreography, crown-top seat', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      objects: window.NGDHero3D.state.objects,
      profile: window.NGDHero3D.state.profile,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(st.profile === 'mobile', 'mobile profile');
    expect(st.objects.halo === 1 && st.objects.caustics === 2 && st.objects.beams === 1,
      'halo + caustics kept, lighter beams: ' + JSON.stringify(st.objects));
    const seat = await seek(page, 9);
    expect(Math.abs(seat.hero[0]) < 0.05 && seat.hero[1] > 1.3,
      'crown-top composition, got ' + seat.hero.join(','));
    expect(Math.abs(seat.halo.x) < 0.15, 'halo centred behind the crown, got ' + seat.halo.x);
    expect(st.scrollW <= st.clientW + 1, 'no horizontal overflow');
  });

  await scenario('reduced motion: the final eclipse composition, immediately and still', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      intro: window.__NGD_HERO_INTRO,
      animated: window.__NGD_HERO_ANIMATED,
      dbg: window.NGDHero3D.debug(),
      t: window.NGDHero3D.state.t(),
    }));
    expect(st.intro === 'done' && st.animated === false, 'no film, no loop');
    expect(st.t > 8, 'parked at the settled composition');
    expect(Math.abs(st.dbg.hero[0] - 1.9) < 0.05, 'stone in its seat');
    expect(Math.abs(st.dbg.exposure - 1.12) < 0.06, 'full brightness still');
    expect(st.dbg.halo.opacity > 0.3, 'the eclipse halo is part of the still');
    const after = await page.evaluate(() => {
      window.NGDHero3D.seek(1);
      return window.NGDHero3D.state.t();
    });
    expect(after > 8, 'seek is inert — the still never re-enters the intro');
  });

  await scenario('scroll hint: present, labelled, and retiring as the story takes over', {}, async (page) => {
    await open(page);
    const hint = await page.evaluate(() => {
      const el = document.querySelector('.ngd-scroll-hint');
      return {
        exists: !!el,
        href: el && el.getAttribute('href'),
        label: el ? el.textContent.trim() : '',
        line: !!document.querySelector('.ngd-scroll-hint-line'),
      };
    });
    expect(hint.exists && hint.line, 'hint with its animated line');
    expect(hint.href === '#diamond-shapes', 'hint leads into the shapes chapter');
    expect(/scroll to discover/i.test(hint.label), 'hint copy');
    await page.evaluate(() => window.scrollTo({ top: Math.round(innerHeight * 0.9), behavior: 'instant' }));
    await page.waitForFunction(() =>
      parseFloat(getComputedStyle(document.querySelector('.ngd-scroll-hint')).opacity) < 0.4,
      null, { timeout: 4000 });
    await page.waitForFunction(() =>
      parseFloat(getComputedStyle(document.querySelector('.ngd-hero > .container')).opacity) < 0.75,
      null, { timeout: 4000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} hero-cinematic scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
