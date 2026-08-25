/* ============================================================
   Cinematic hero sequence tests.
   The ~10 second obsidian / midnight-sapphire opening: exposure
   rising out of darkness, the hero diamond's real 3D journey
   (far background → close pass → centre-right seat), camera
   movement that settles, the travelling key light, the timed
   ensemble of supporting stones, the restrained flare on the
   close pass, scroll fast-forward (never fight the visitor),
   the ambient loop after settle, the mobile profile, reduced
   motion showing the final composition immediately, and the
   scroll hint. Deterministic via window.NGDHero3D.seek().
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

  await scenario('the timeline API and full desktop ensemble are exposed', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      objects: window.NGDHero3D.state.objects,
      seek: typeof window.NGDHero3D.seek,
      debug: typeof window.NGDHero3D.debug,
      profile: window.NGDHero3D.state.profile,
    }));
    expect(st.seek === 'function' && st.debug === 'function', 'seek + debug available');
    expect(st.profile === 'desktop', 'desktop profile');
    expect(st.objects.hero === 1, 'one hero diamond');
    expect(st.objects.secondaries === 4, 'four supporting stones, got ' + st.objects.secondaries);
    expect(st.objects.fragments === 2, 'two foreground fragments');
    expect(st.objects.beams === 2, 'two light beams');
  });

  await scenario('the scene opens near-black and rises to full brilliance', {}, async (page) => {
    await open(page);
    const dark = await seek(page, 0.4);
    const mid = await seek(page, 1.5);
    const done = await seek(page, 9);
    expect(dark.exposure < 0.3, 'near-darkness at the start, got ' + dark.exposure);
    expect(mid.exposure > dark.exposure && mid.exposure < 1.05, 'light rising mid-entry, got ' + mid.exposure);
    expect(Math.abs(done.exposure - 1.12) < 0.06, 'full brilliance once settled, got ' + done.exposure);
  });

  await scenario('the hero diamond truly travels: far background → close pass → centre-right seat', {}, async (page) => {
    await open(page);
    const far = await seek(page, 1);
    const pass = await seek(page, 4.9);
    const seat = await seek(page, 9);
    expect(far.hero[2] < -8, 'enters from deep background, z=' + far.hero[2]);
    expect(pass.hero[2] > 0, 'sweeps in front of the stage line on the pass, z=' + pass.hero[2]);
    expect(Math.abs(pass.hero[0]) < 0.5, 'the pass crosses near centre, x=' + pass.hero[0]);
    expect(Math.abs(seat.hero[0] - 1.9) < 0.05 && Math.abs(seat.hero[2] + 1.4) < 0.05,
      'settles centre-right, got ' + seat.hero.join(','));
  });

  await scenario('the camera itself moves, then settles for the resting composition', {}, async (page) => {
    await open(page);
    const start = await seek(page, 0.05);
    const orbit = await seek(page, 4.9);
    const rest = await seek(page, 9);
    expect(start.camera[2] > 6.2, 'starts pulled back, z=' + start.camera[2]);
    expect(orbit.camera[0] < -0.4, 'counter-orbits left on the pass, x=' + orbit.camera[0]);
    expect(Math.abs(rest.camera[0]) < 0.02 && Math.abs(rest.camera[2] - 4.9) < 0.02,
      'settles to the resting position, got ' + rest.camera.join(','));
  });

  await scenario('lighting animates — the key light travels through the reveal', {}, async (page) => {
    await open(page);
    const early = await seek(page, 1);
    const late = await seek(page, 5.4);
    expect(Math.abs(late.key[0] - early.key[0]) > 1.5,
      'key light orbits across the scene, ' + early.key[0].toFixed(2) + ' → ' + late.key[0].toFixed(2));
  });

  await scenario('the close pass is the wow beat: restrained flare, stone large in frame', {}, async (page) => {
    await open(page);
    const pass = await seek(page, 4.9);
    expect(pass.exposure > 1.2, 'flare lifts the exposure on the pass, got ' + pass.exposure);
    const calm = await seek(page, 6.8);
    expect(calm.exposure < pass.exposure, 'flare recedes after the pass');
  });

  await scenario('supporting stones enter on cue, each with its own motion', {}, async (page) => {
    await open(page);
    await seek(page, 3);
    const during = await page.evaluate(() => window.NGDHero3D.state.secondaries());
    expect(during[0].opacity > 0.3, 'the background crosser is already travelling, got ' + during[0].opacity);
    expect(during[0].x < -1, 'crosser still crossing from the left, x=' + during[0].x);
    expect(during[1].opacity < 0.05, 'the ensemble waits for its cue');
    await seek(page, 9);
    const settled = await page.evaluate(() => window.NGDHero3D.state.secondaries());
    expect(settled.every((s) => s.opacity > 0.5), 'all supporting stones present once settled');
    const rots = new Set(settled.map((s) => s.rotY.toFixed(3)));
    expect(rots.size === settled.length, 'no two stones rotate identically');
    expect(settled[0].x > 5, 'the crosser exits frame-right instead of parking, x=' + settled[0].x);
  });

  await scenario('an early scroll never fights the visitor — the intro glides to its end', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.NGDHero3D.setScroll(0.35));
    await page.waitForFunction(() =>
      window.NGDHero3D.state.settled() && window.__NGD_HERO_INTRO === 'done',
      null, { timeout: 6000 });
    const dbg = await page.evaluate(async () => {
      window.NGDHero3D.setScroll(0.35); // hold the handoff value for the read
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return window.NGDHero3D.debug();
    });
    expect(dbg.exposure < 1.05, 'scroll handoff dims the scene, got ' + dbg.exposure);
  });

  await scenario('ambient loop: the settled scene keeps living without jumping', {}, async (page) => {
    await open(page);
    await seek(page, 9);
    const a = await page.evaluate(() => window.NGDHero3D.debug());
    await page.waitForTimeout(800);
    const b = await page.evaluate(() => window.NGDHero3D.debug());
    expect(b.spin > a.spin + 0.05, 'the hero keeps its slow rotation, ' + a.spin.toFixed(2) + ' → ' + b.spin.toFixed(2));
    expect(Math.abs(b.hero[0] - a.hero[0]) < 0.05, 'no positional jump in the loop');
  });

  await scenario('mobile profile: lighter ensemble, crown-top composition, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      objects: window.NGDHero3D.state.objects,
      profile: window.NGDHero3D.state.profile,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(st.profile === 'mobile', 'mobile profile');
    expect(st.objects.secondaries === 2 && st.objects.fragments === 0 && st.objects.beams === 1,
      'reduced ensemble, got ' + JSON.stringify(st.objects));
    const seat = await seek(page, 9);
    expect(Math.abs(seat.hero[0]) < 0.05 && seat.hero[1] > 1.3,
      'diamond crowns the composition above the copy, got ' + seat.hero.join(','));
    expect(st.scrollW <= st.clientW + 1, 'no horizontal overflow');
  });

  await scenario('reduced motion: the final premium composition, immediately and still', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      intro: window.__NGD_HERO_INTRO,
      animated: window.__NGD_HERO_ANIMATED,
      t: window.NGDHero3D.state.t(),
      dbg: window.NGDHero3D.debug(),
    }));
    expect(st.intro === 'done', 'no 10-second wait under reduced motion');
    expect(st.animated === false, 'no animation loop');
    expect(st.t > 7.8, 'timeline parked at the settled composition');
    expect(Math.abs(st.dbg.hero[0] - 1.9) < 0.05, 'hero diamond in its final seat');
    expect(Math.abs(st.dbg.exposure - 1.12) < 0.06, 'full brightness still frame');
    const after = await page.evaluate(() => {
      window.NGDHero3D.seek(1);          // must be inert
      return window.NGDHero3D.state.t();
    });
    expect(after > 7.8, 'seek is disabled — the still never re-enters the intro');
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
