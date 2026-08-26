/* ============================================================
   Hero tests — REAL DIAMOND PHOTOGRAPHIC MODE (hero-real.js).
   The hero probes assets/images/hero/hero-diamond.webp: with no
   asset the WebGL film keeps the hero untouched; with the asset
   a layered photographic scene mounts instead — camera-like
   motion on the main stone, photo-masked light sweep / facet
   flash / spectral edge, mirrored reflection, four supporting
   depth-layer stones with distinct paths, the eclipse halo +
   caustics atmosphere, the 10 s GSAP film, scroll fast-forward,
   mobile + reduced profiles, and the section wisps.
   Deterministic via window.NGDHeroReal.seek().
   Run:  node tests/hero-real.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://hero-real.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };

/* A stand-in image for the drop-in asset slots (tests only — the
   repo itself ships no placeholder pretending to be a photograph). */
const STUB_IMG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">' +
  '<polygon points="400,60 640,300 400,740 160,300" fill="#e9eef8" opacity="0.92"/>' +
  '<polygon points="400,60 640,300 160,300" fill="#f7fafe" opacity="0.85"/></svg>';

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
    if (opts.assets) {
      await context.route('**/assets/images/hero/**', (r) => {
        const name2 = r.request().url().split('/').pop().split('?')[0];
        if (opts.assets.includes(name2)) {
          return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: STUB_IMG });
        }
        return r.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
      });
    } else if (!opts.repoAssets) {
      /* the repo ships a real hero photograph — withhold it so the
         "no asset" scenarios stay meaningful; repoAssets: true lets
         the committed file through untouched */
      await context.route('**/assets/images/hero/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }));
    }
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

const MAIN = ['hero-diamond.webp'];

async function openReal(page) {
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__NGD_HERO_MODE === 'real', null, { timeout: 25000 });
}

function seekR(page, t) {
  return page.evaluate((sec) => window.NGDHeroReal.seek(sec), t);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('no real asset: the WebGL film keeps the hero, nothing photographic mounts', {}, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__NGD_HERO_MODE === 'webgl', null, { timeout: 25000 });
    await page.waitForTimeout(1500); /* past the idle wisp window */
    const st = await page.evaluate(() => ({
      eligible: window.NGDHeroReal.eligible,
      active: window.NGDHeroReal.active,
      realDom: !!document.querySelector('.ngd-hero-real'),
      canvas: !!document.querySelector('.ngd-hero3d-stage canvas'),
      onClass: document.querySelector('.ngd-hero').classList.contains('ngd-real-on'),
      maybeClass: document.querySelector('.ngd-hero').classList.contains('ngd-real-maybe'),
      wisps: document.querySelectorAll('.ngd-real-wisps').length,
    }));
    expect(st.eligible, 'the homepage hero is eligible for photographic mode');
    expect(!st.active, 'photographic mode stays inactive without the asset');
    expect(!st.realDom, 'no photographic layer mounts');
    expect(st.canvas, 'the WebGL film still owns the stage');
    expect(!st.onClass && !st.maybeClass, 'the copy hold is released, no real-mode class');
    expect(st.wisps === 0, 'no section wisps without the asset');
    await page.waitForFunction(() =>
      parseFloat(getComputedStyle(document.querySelector('.ngd-hero h1')).opacity) > 0.9,
      null, { timeout: 8000 });
  });

  await scenario('the drop-in asset flips the hero to photographic mode', { assets: MAIN }, async (page) => {
    await openReal(page);
    const st = await page.evaluate(() => ({
      active: window.NGDHeroReal.active,
      profile: window.NGDHeroReal.state.profile,
      hero3d: typeof window.NGDHero3D,
      onClass: document.querySelector('.ngd-hero').classList.contains('ngd-real-on'),
      stageDisplay: getComputedStyle(document.querySelector('.ngd-hero3d-stage')).display,
      canvas: !!document.querySelector('.ngd-hero3d-stage canvas'),
      mainSrc: document.querySelector('.ngd-real-img').getAttribute('src'),
      mainLoaded: document.querySelector('.ngd-real-img').naturalWidth > 0,
      layers: {
        atmo: !!document.querySelector('.ngd-real-atmo'),
        caustic: !!document.querySelector('.ngd-real-caustic'),
        halo: !!document.querySelector('.ngd-real-halo'),
        glow: !!document.querySelector('.ngd-real-glow'),
        shadow: !!document.querySelector('.ngd-real-shadow'),
      },
    }));
    expect(st.active, 'photographic mode active');
    expect(st.profile === 'desktop', 'desktop profile');
    expect(st.hero3d === 'undefined', 'the WebGL film never started');
    expect(st.onClass && st.stageDisplay === 'none', 'the WebGL stage stands down');
    expect(!st.canvas, 'no WebGL canvas is created');
    expect(/hero-diamond\.webp$/.test(st.mainSrc), 'the main stone is the documented drop-in file');
    expect(st.mainLoaded, 'the main photograph decoded');
    expect(st.layers.atmo && st.layers.caustic && st.layers.halo && st.layers.glow && st.layers.shadow,
      'atmosphere, caustics, halo, glow and shadow layers all mount');
  });

  await scenario('the committed repo photograph activates photographic mode end to end', { repoAssets: true }, async (page) => {
    await openReal(page);
    const st = await page.evaluate(() => {
      const img = document.querySelector('.ngd-real-img');
      return {
        src: img.getAttribute('src'),
        w: img.naturalWidth,
        h: img.naturalHeight,
        supports: window.NGDHeroReal.state.assets().supports,
      };
    });
    expect(/hero-diamond\.webp$/.test(st.src), 'the shipped file is the one probed');
    expect(st.w > 600 && st.h > 400, 'the real photograph decoded at full size, got ' + st.w + 'x' + st.h);
    expect(st.supports === 4, 'the supporting field reuses the photograph');
  });

  await scenario('showroom dressing: golden arcs orbit, haze drifts, dust twinkles, glints flash', { assets: MAIN }, async (page) => {
    await openReal(page);
    const st = await page.evaluate(() => {
      const arcA = document.querySelector('.ngd-real-arc-a');
      const glints = document.querySelectorAll('.ngd-real-dust i.is-glint');
      return {
        arcs: document.querySelectorAll('.ngd-real-arc').length,
        arcSpin: getComputedStyle(arcA).animationName,
        arcDurA: getComputedStyle(arcA).animationDuration,
        arcDurB: getComputedStyle(document.querySelector('.ngd-real-arc-b')).animationDuration,
        haze: !!document.querySelector('.ngd-real-haze'),
        hazeDrift: getComputedStyle(document.querySelector('.ngd-real-haze')).animationName,
        dust: document.querySelectorAll('.ngd-real-dust i').length,
        glints: glints.length,
        glintAnim: glints.length ? getComputedStyle(glints[0]).animationName : '',
        badges: document.querySelectorAll('.ngd-hero .ngd-hero-badge').length,
      };
    });
    expect(st.arcs === 2, 'two golden orbit arcs on desktop, got ' + st.arcs);
    expect(st.arcSpin !== 'none', 'the arcs revolve');
    expect(st.arcDurA !== st.arcDurB, 'each arc revolves at its own pace');
    expect(st.haze && st.hazeDrift !== 'none', 'the haze layer drifts');
    expect(st.dust === 10, 'ten dust motes around the stone, got ' + st.dust);
    expect(st.glints === 2 && st.glintAnim !== 'none', 'two occasional facet glints');
    expect(st.badges === 3, 'the trust badges stand under the CTAs');
    /* the badges join the entrance cascade after the headline beat */
    await page.waitForFunction(() =>
      document.querySelector('.ngd-hero').classList.contains('ngd-cine'), null, { timeout: 8000 });
    const badgeDelay = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector('.ngd-hero-badge')).transitionDelay));
    expect(badgeDelay > 7.5, 'badges reveal after the headline, got ' + badgeDelay);
  });

  await scenario('dedicated supporting files are used, missing ones fall back to the main cutout', { assets: ['hero-diamond.webp', 'diamond-2.webp'] }, async (page) => {
    await openReal(page);
    const st = await page.evaluate(() => {
      const srcs = Array.from(document.querySelectorAll('.ngd-real-support img'))
        .map((img) => img.getAttribute('src'));
      const mask = getComputedStyle(document.querySelector('.ngd-real-sweep'));
      const refl = getComputedStyle(document.querySelector('.ngd-real-reflection'));
      return {
        srcs,
        sweepMask: mask.webkitMaskImage || mask.maskImage,
        flashMask: (getComputedStyle(document.querySelector('.ngd-real-flash')).webkitMaskImage || ''),
        reflTransform: refl.transform,
        reflMask: refl.webkitMaskImage || refl.maskImage,
      };
    });
    expect(st.srcs.length === 4, 'four supporting stones, got ' + st.srcs.length);
    expect(/diamond-2\.webp$/.test(st.srcs[0]) && /diamond-2\.webp$/.test(st.srcs[3]),
      'stones 1 & 4 use the dedicated diamond-2 file');
    expect(/hero-diamond\.webp$/.test(st.srcs[1]) && /hero-diamond\.webp$/.test(st.srcs[2]),
      'missing diamond-3/4 fall back to the main cutout');
    expect(st.sweepMask.includes('hero-diamond.webp'), 'the light sweep is masked by the photograph');
    expect(st.flashMask.includes('hero-diamond.webp'), 'the facet flash is masked by the photograph');
    expect(st.reflTransform === 'matrix(1, 0, 0, -1, 0, 0)', 'the reflection is a vertical mirror, got ' + st.reflTransform);
    expect(st.reflMask.includes('linear-gradient'), 'the reflection fades out on dark glass');
  });

  await scenario('every supporting stone travels its own way — size, path, speed, depth, orientation', { assets: MAIN }, async (page) => {
    await openReal(page);
    await seekR(page, 9);
    const st = await page.evaluate(() => {
      const figs = Array.from(document.querySelectorAll('.ngd-real-support'));
      return figs.map((fig) => {
        const img = fig.querySelector('img');
        const cs = getComputedStyle(img);
        return {
          dur: cs.animationDuration,
          name: cs.animationName,
          blur: cs.filter,
          opacity: getComputedStyle(fig).opacity,
          rot: (fig.getAttribute('style').match(/rotate\((-?\d+)deg\)/) || [])[1],
          width: fig.getBoundingClientRect().width,
        };
      });
    });
    expect(new Set(st.map((s) => s.dur.split(',')[0])).size === 4, 'four distinct speeds');
    expect(new Set(st.map((s) => s.name)).size >= 3, 'at least three distinct travel paths (never one shared direction)');
    expect(new Set(st.map((s) => s.blur)).size >= 3, 'distinct depth blur levels');
    expect(new Set(st.map((s) => s.opacity)).size === 4, 'four distinct opacities');
    expect(new Set(st.map((s) => s.rot)).size === 4, 'four distinct orientations');
    expect(new Set(st.map((s) => Math.round(s.width))).size >= 3, 'distinct sizes');
  });

  await scenario('the film opens dark, a small stone enters, the hero approaches the camera', { assets: MAIN }, async (page) => {
    await openReal(page);
    const dark = await seekR(page, 0.5);
    expect(dark.main.opacity === 0, 'the hero photograph is not yet visible');
    expect(dark.supports[0] === 0, 'no supporting stone yet');
    const enter = await seekR(page, 1.7);
    expect(enter.supports[0] > 0.3, 'the small stone enters from the distance, got ' + enter.supports[0]);
    expect(enter.main.opacity < 0.2, 'the hero still waits');
    const a = await seekR(page, 2.6);
    const b = await seekR(page, 3.6);
    expect(a.main.opacity > 0.9, 'the hero photograph is present by 2.6 s');
    expect(b.main.scale > a.main.scale, 'the stone grows toward the camera');
    expect(b.main.blur < a.main.blur, 'depth blur resolves as it nears');
    expect(b.main.x > a.main.x, 'the stone travels in from the left of its seat');
  });

  await scenario('brilliance: a moving light strikes the stone, then recedes', { assets: MAIN }, async (page) => {
    await openReal(page);
    const hit = await seekR(page, 4.6);
    expect(hit.sweep > -120 && hit.sweep < 129, 'the masked light sweep is crossing the stone, got ' + hit.sweep);
    expect(hit.flash > 0.15, 'the facet flash fires, got ' + hit.flash);
    expect(hit.spectral > 0.1, 'a restrained spectral edge appears');
    expect(hit.halo.opacity > 0.34, 'the halo answers the strike');
    const after = await seekR(page, 5.6);
    expect(after.sweep >= 129, 'the sweep has finished its pass');
    expect(after.flash < 0.1, 'the flash recedes — no cartoon sparkle held');
    expect(after.spectral <= 0.15, 'the spectral edge settles to a whisper');
  });

  await scenario('depth ensemble, gravity shift and the halo\'s own lagged path', { assets: MAIN }, async (page) => {
    await openReal(page);
    const mid = await seekR(page, 6.0);
    expect(mid.supports[1] > 0.5, 'the second stone has crossed in');
    expect(mid.main.x < -6, 'the hero has not yet taken its seat');
    expect(mid.halo.x <= -8.5, 'the halo waits on its own path');
    const shift = await seekR(page, 7.8);
    expect(shift.main.x > -6, 'the stone glides toward its seat');
    expect(shift.halo.x < shift.main.x, 'the halo lags behind on an independent path');
    const done = await seekR(page, 9);
    expect(Math.abs(done.main.x) < 0.3 && Math.abs(done.halo.x) < 0.3, 'stone and halo both seated');
    expect(Math.abs(done.main.scale - 0.88) < 0.03, 'final seat scale');
    expect(done.settled === true, 'the film has settled');
    const flags = await page.evaluate(() => ({
      intro: window.__NGD_HERO_INTRO,
      cls: document.querySelector('.ngd-hero').classList.contains('ngd-real-settled'),
    }));
    expect(flags.intro === 'done' && flags.cls, 'settled class + intro flag for the ambient loop');
  });

  await scenario('CTAs reveal early and stay clickable; the headline owns the late beat', { assets: MAIN }, async (page) => {
    await openReal(page);
    await page.waitForFunction(() =>
      document.querySelector('.ngd-hero').classList.contains('ngd-cine'), null, { timeout: 8000 });
    const st = await page.evaluate(() => {
      const h1 = document.querySelector('.ngd-hero h1');
      const btn = document.querySelector('.ngd-hero .ngd-btn-gold');
      const bcs = getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      return {
        h1Delay: parseFloat(getComputedStyle(h1).transitionDelay),
        btnDelay: parseFloat(bcs.transitionDelay),
        btnPointer: bcs.pointerEvents,
        btnInLayout: rect.width > 40 && rect.height > 20,
      };
    });
    expect(st.h1Delay >= 6, 'the headline reveals on the ~7 s film beat, got ' + st.h1Delay);
    expect(st.btnDelay <= 3.2, 'the CTAs reveal by ~3 s, got ' + st.btnDelay);
    expect(st.btnPointer !== 'none' && st.btnInLayout, 'the CTA stays in the layout and clickable throughout');
  });

  await scenario('scroll exit: the stone deepens, the halo expands, the caustics stretch', { assets: MAIN }, async (page) => {
    await openReal(page);
    await seekR(page, 9);
    const st = await page.evaluate(() => {
      const hero = document.querySelector('.ngd-hero');
      const read = () => ({
        card: (() => { const c = getComputedStyle(document.querySelector('.ngd-real-card')); return { t: c.transform, o: parseFloat(c.opacity), f: c.filter }; })(),
        haloScale: parseFloat((getComputedStyle(document.querySelector('.ngd-real-halo')).transform.match(/matrix\(([-\d.]+)/) || [])[1]),
        causticY: parseFloat((getComputedStyle(document.querySelector('.ngd-real-caustic')).transform.match(/matrix\([-\d.]+, [-\d.]+, [-\d.]+, ([-\d.]+)/) || [])[1]),
      });
      hero.style.setProperty('--ngd-heroexit', '0');
      const before = read();
      hero.style.setProperty('--ngd-heroexit', '0.5');
      const after = read();
      hero.style.setProperty('--ngd-heroexit', '0');
      return { before, after };
    });
    expect(st.after.card.t !== st.before.card.t, 'the stone moves with the exit — no plain fade');
    expect(st.after.card.o < st.before.card.o - 0.2, 'the stone dims as it deepens');
    expect(/blur\((?!0px)/.test(st.after.card.f), 'depth blur as the stone recedes');
    expect(st.after.haloScale > st.before.haloScale * 1.2, 'the halo expands, got ' + st.after.haloScale);
    expect(st.after.causticY > st.before.causticY * 1.15, 'the caustics stretch vertically');
  });

  await scenario('an early scroll fast-forwards the film — never a scroll lock', { assets: MAIN }, async (page) => {
    await openReal(page);
    const early = await page.evaluate(() => window.NGDHeroReal.state.t());
    expect(early < 4, 'the film has only begun, t=' + early);
    await page.evaluate(() => window.scrollTo({ top: Math.round(innerHeight * 0.9), behavior: 'instant' }));
    await page.waitForFunction(() => window.NGDHeroReal.state.t() > 4, null, { timeout: 6000 });
    const st = await page.evaluate(() => ({ ff: window.NGDHeroReal.debug().ff, y: window.scrollY }));
    expect(st.ff === true, 'fast-forward engaged');
    expect(st.y > 0, 'the page scrolled freely');
  });

  await scenario('mobile: the full concept with fewer background stones, crown-top seat', { assets: MAIN, viewport: { width: 390, height: 844 } }, async (page) => {
    await openReal(page);
    await page.waitForTimeout(2000); /* past the idle wisp window */
    const st = await page.evaluate(() => ({
      profile: window.NGDHeroReal.state.profile,
      assets: window.NGDHeroReal.state.assets(),
      mobileClass: document.querySelector('.ngd-hero-real').classList.contains('ngd-real-mobile'),
      s2Display: getComputedStyle(document.querySelector('.ngd-real-s2')).display,
      mainTop: document.querySelector('.ngd-real-main').getBoundingClientRect().top,
      mainCentred: Math.abs((document.querySelector('.ngd-real-main').getBoundingClientRect().left +
        document.querySelector('.ngd-real-main').getBoundingClientRect().width / 2) - 195) < 30,
      copyBelowStone: document.querySelector('.ngd-hero h1').getBoundingClientRect().top >
        document.querySelector('.ngd-real-main').getBoundingClientRect().bottom - 40,
    }));
    expect(st.profile === 'mobile' && st.mobileClass, 'mobile profile');
    expect(st.assets.supports === 2, 'two supporting stones on mobile, got ' + st.assets.supports);
    expect(st.s2Display === 'none', 'the extra depth stones rest on mobile');
    expect(st.assets.wisps === 0, 'no section wisps on mobile');
    expect(st.mainTop < 300 && st.mainCentred, 'crown-top centred seat');
    expect(st.copyBelowStone, 'the copy anchors below the stone — no crown overlap');
    const dressing = await page.evaluate(() => ({
      arcB: getComputedStyle(document.querySelector('.ngd-real-arc-b')).display,
      dust: document.querySelectorAll('.ngd-real-dust i').length,
    }));
    expect(dressing.arcB === 'none', 'the second arc rests on mobile');
    expect(dressing.dust === 5, 'a lighter dust field on mobile, got ' + dressing.dust);
  });

  await scenario('reduced motion: the finished composition, perfectly still', { assets: MAIN, reducedMotion: 'reduce' }, async (page) => {
    await openReal(page);
    const st = await page.evaluate(() => ({
      settled: window.NGDHeroReal.state.settled(),
      t: window.NGDHeroReal.state.t(),
      playing: window.NGDHeroReal.debug().playing,
      intro: window.__NGD_HERO_INTRO,
      animated: window.__NGD_HERO_ANIMATED,
      h1Opacity: getComputedStyle(document.querySelector('.ngd-hero h1')).opacity,
      sweepAnim: getComputedStyle(document.querySelector('.ngd-real-sweep')).animationName,
      mainOpacity: window.NGDHeroReal.debug().main.opacity,
    }));
    expect(st.settled && st.t >= 8.5, 'settled immediately');
    expect(st.playing === false && st.animated === false, 'no timeline runs');
    expect(st.intro === 'done', 'intro flagged done for the rest of the page');
    expect(st.h1Opacity === '1', 'the copy is simply present');
    expect(st.sweepAnim === 'none', 'no ambient sweep under reduced motion');
    expect(st.mainOpacity === 1, 'the stone is seated and visible');
    const inert = await seekR(page, 2);
    expect(inert.main.opacity === 1 && inert.settled, 'seek is inert under reduced motion');
  });

  await scenario('the real-diamond system continues into the sections — wisps + optional rough crystal', { assets: ['hero-diamond.webp', 'rough-diamond.webp'] }, async (page) => {
    await openReal(page);
    await page.waitForFunction(() => window.NGDHeroReal.state.assets().wisps > 0, null, { timeout: 10000 });
    const st = await page.evaluate(() => {
      const count = (sel) => document.querySelectorAll(sel + ' .ngd-real-wisps img').length;
      const shapes = Array.from(document.querySelectorAll('#diamond-shapes .ngd-real-wisps img'))
        .map((img) => getComputedStyle(img).filter);
      const growth = document.querySelector('.ngd-story-stage[data-slug="growth"] .ngd-real-wisps img');
      return {
        total: window.NGDHeroReal.state.assets().wisps,
        shapes: count('#diamond-shapes'),
        featured: count('#featured-diamonds'),
        jewellery: count('#fine-jewellery'),
        growthSrc: growth ? growth.getAttribute('src') : null,
        shapesClass: document.querySelector('#diamond-shapes').classList.contains('ngd-has-wisps'),
        shapesBlursDiffer: new Set(shapes).size === shapes.length,
      };
    });
    expect(st.total === 5, 'five wisps across the sections, got ' + st.total);
    expect(st.shapes === 2 && st.featured === 1 && st.jewellery === 1, 'shapes 2 / featured 1 / jewellery 1 — never overloaded');
    expect(/rough-diamond\.webp$/.test(st.growthSrc || ''), 'the growth stage carries the rough crystal');
    expect(st.shapesClass, 'sections are marked for the wisp layer');
    expect(st.shapesBlursDiffer, 'wisps sit at different depths');
    await page.evaluate(() => document.querySelector('#diamond-shapes').scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForFunction(() =>
      document.querySelector('#diamond-shapes .ngd-real-wisps').classList.contains('is-live'),
      null, { timeout: 5000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} hero-real scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
