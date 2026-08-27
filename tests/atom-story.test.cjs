/* ============================================================
   From One Atom — pinned scroll story tests (homepage).
   The section between Guided Selection and Featured Diamonds
   pins a stage inside a tall runway and drives the whole
   narrative — lattice, layer-growth, polish, certificate —
   from a single scroll-progress number, so it must be exactly
   reversible. assets/js/atom-story.js exposes the deterministic
   seek()/debug() API these scenarios use.
   Run:  node tests/atom-story.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://atom-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;

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
    await context.route(SB_HOST + '/**', (r) => r.request().method() === 'OPTIONS'
      ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' })
      : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '*/0' }, body: '[]' }));
    if (opts.blockThree) {
      /* registered after installCdnRoutes, so it wins the match:
         the three module import fails and the story must degrade */
      await context.route('**/npm/three@*/**', (r) => r.abort());
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

async function open(page) {
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.NGDAtomStory, null, { timeout: 15000 });
}

const seek = (page, p) => page.evaluate((v) => window.NGDAtomStory.seek(v), p);

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('a pinned stage inside a tall runway, between guided selection and the featured stones', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const section = document.querySelector('#atom-story');
      const runway = section.querySelector('.ngd-atom-runway');
      const pin = section.querySelector('.ngd-atom-pin');
      const pinCs = getComputedStyle(pin);
      return {
        afterGuided: section.offsetTop > document.querySelector('#guided-selection').offsetTop,
        beforeFeatured: section.offsetTop < document.querySelector('#featured-diamonds').offsetTop,
        runwayH: runway.offsetHeight,
        pinPos: pinCs.position,
        pinTop: pinCs.top,
        pinH: pin.offsetHeight,
        vh: window.innerHeight,
        canvas: !!section.querySelector('canvas.ngd-atom-gl'),
        darkStage: getComputedStyle(section).backgroundImage.includes('linear-gradient'),
        headline: section.querySelector('[data-atom-open] h2').textContent.replace(/\s+/g, ' ').trim(),
        marks: section.querySelector('[data-atom-marks]').children.length,
      };
    });
    expect(st.afterGuided && st.beforeFeatured, 'placed between guided selection and featured diamonds');
    expect(Math.abs(st.runwayH - st.vh * 4.2) < 60, 'the runway is a 420vh scroll, got ' + st.runwayH);
    expect(st.pinPos === 'sticky' && st.pinTop === '0px', 'the stage pins with position:sticky, got ' + st.pinPos);
    expect(Math.abs(st.pinH - st.vh) < 4, 'the pinned stage is one viewport tall');
    expect(st.canvas, 'the WebGL canvas is on stage');
    expect(st.darkStage, 'the stage paints its own dark ground');
    expect(/It begins as one atom\./.test(st.headline), 'opening statement, got "' + st.headline + '"');
    expect(st.marks === 6, 'six journey marks');
  });

  await scenario('the scale readout walks all six stages as progress advances', {}, async (page) => {
    await open(page);
    const walk = await page.evaluate(() => {
      const out = [];
      const onMark = () => {
        const marks = Array.from(document.querySelector('[data-atom-marks]').children);
        return marks.findIndex((m) => m.classList.contains('on'));
      };
      [0.05, 0.2, 0.45, 0.6, 0.75, 0.9].forEach((p) => {
        const d = window.NGDAtomStory.seek(p);
        out.push({ p, stage: d.stage, scale: d.scale, mark: onMark(),
          track: document.querySelector('[data-atom-track]').style.width });
      });
      return out;
    });
    const names = walk.map((w) => w.stage);
    expect(names.join('|') === 'Carbon|Lattice|Seed plate|Rough crystal|Round Brilliant|Certified',
      'stages in order, got ' + names.join('|'));
    expect(walk[0].scale === '0.15 nm' && walk[5].scale === '1.02 ct', 'scale runs from atoms to carats');
    walk.forEach((w, i) => expect(w.mark === i, 'mark ' + i + ' lights at p=' + w.p + ', got ' + w.mark));
    expect(walk[3].track === '60%', 'the track mirrors progress, got ' + walk[3].track);
  });

  await scenario('the opening statement recedes and the cue fades as the journey starts', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const openEl = document.querySelector('[data-atom-open]');
      const cue = document.querySelector('.ngd-atom-cue');
      const at = (p) => {
        window.NGDAtomStory.seek(p);
        return { open: parseFloat(openEl.style.opacity), cue: parseFloat(cue.style.opacity || '1') };
      };
      return { start: at(0), mid: at(0.08), gone: at(0.25) };
    });
    expect(st.start.open === 1 && st.start.cue === 1, 'fully present at rest');
    expect(st.mid.open > 0.2 && st.mid.open < 0.9, 'receding mid-hand-off, got ' + st.mid.open);
    expect(st.gone.open === 0 && st.gone.cue === 0, 'stepped aside once the lattice takes the stage');
  });

  await scenario('the crystal grows in layers, then takes its polish (WebGL uniforms)', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.NGDAtomStory.boot());
    await page.waitForFunction(() => window.NGDAtomStory.state.booted(), null, { timeout: 25000 });
    const st = await page.evaluate(() => {
      const S = window.NGDAtomStory;
      const lattice = S.seek(0.2);
      const growing = S.seek(0.5);
      const rough = S.seek(0.66);
      const polished = S.seek(0.9);
      return { lattice, growing, rough, polished };
    });
    expect(st.lattice.latticeOpacity > 0.9, 'the diamond-cubic lattice burns bright early, got ' + st.lattice.latticeOpacity);
    expect(st.lattice.grow === 0, 'no material before the seed stage');
    expect(st.growing.grow > 0.4 && st.growing.grow < 0.7, 'mid-growth at half way, got ' + st.growing.grow);
    expect(st.growing.gemScale > 0.5, 'the stone has real size mid-growth, got ' + st.growing.gemScale);
    expect(st.growing.latticeOpacity < 0.6, 'the lattice hands over to the solid');
    expect(st.rough.grow === 1 && st.rough.polish === 0, 'fully grown but still rough at 0.66');
    expect(st.polished.polish === 1, 'polished by 0.9');
    expect(st.polished.gemScale > 1, 'the brilliant at full presence');
    expect(st.polished.latticeOpacity === 0, 'the lattice is gone');
    expect(st.polished.camZ > st.lattice.camZ, 'the camera pulls back as the stone grows');
  });

  await scenario('the grading report slides in, counts its number, and fills field by field', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const S = window.NGDAtomStory;
      const cert = document.querySelector('[data-atom-cert]');
      const early = S.seek(0.4);
      const earlyPE = cert.style.opacity;
      const filling = S.seek(0.85);
      const carat = Array.from(document.querySelectorAll('.ngd-atom-fld'))
        .find((f) => /carat/i.test(f.textContent)).querySelector('b').textContent;
      const done = S.seek(0.99);
      const allValues = Array.from(document.querySelectorAll('.ngd-atom-fld b')).map((b) => b.textContent);
      return { early, earlyPE, filling, carat, done, allValues };
    });
    expect(st.early.certOpacity === 0, 'no report while the stone is still growing');
    expect(st.filling.certOpacity === 1, 'the report is on stage during grading');
    expect(st.filling.filled >= 3 && st.filling.filled <= 5, 'part-way through the fields at 0.85, got ' + st.filling.filled);
    expect(st.carat === '1.02 ct', 'carat weight graded, got "' + st.carat + '"');
    expect(st.filling.certNo === 'IGI 2441827', 'the report number has resolved, got ' + st.filling.certNo);
    expect(st.done.filled === 9, 'every field graded by the end');
    expect(st.done.sealOpacity === 1, 'the laser-inscription seal lands last');
    expect(st.done.stage === 'Certified', 'the readout agrees');
    expect(st.allValues.includes('D') && st.allValues.includes('Laboratory grown'),
      'colour and origin among the graded values');
  });

  await scenario('scrolling back un-grades the stone — the story is exactly reversible', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const S = window.NGDAtomStory;
      S.seek(0.99);
      const back = S.seek(0.3);
      const openBack = parseFloat(document.querySelector('[data-atom-open]').style.opacity);
      const rest = S.seek(0);
      return { back, openBack, rest };
    });
    expect(st.back.filled === 0, 'every certificate field empties again, got ' + st.back.filled);
    expect(st.back.certNo === 'IGI ———————', 'the report number un-counts, got ' + st.back.certNo);
    expect(st.back.certOpacity === 0 && st.back.sealOpacity === 0, 'report and seal leave the stage');
    expect(st.back.closeOpacity === 0, 'the closing statement withdraws');
    expect(st.back.stage === 'Lattice', 'the readout rewinds, got ' + st.back.stage);
    expect(st.rest.openOpacity === 1, 'the opening line returns at rest');
  });

  await scenario('the closing statement offers real destinations — only once it is visible', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const S = window.NGDAtomStory;
      const closeEl = document.querySelector('[data-atom-close]');
      S.seek(0.2);
      const hiddenPE = closeEl.style.pointerEvents;
      const done = S.seek(0.99);
      const links = Array.from(closeEl.querySelectorAll('.ngd-atom-btnrow a')).map((a) => ({
        href: a.getAttribute('href'), text: a.textContent.trim(),
        gold: a.classList.contains('ngd-btn-gold'), ghost: a.classList.contains('ngd-btn-ghost'),
      }));
      return { hiddenPE, done, visiblePE: closeEl.style.pointerEvents, links,
        headline: closeEl.querySelector('h2').textContent.replace(/\s+/g, ' ').trim() };
    });
    expect(st.hiddenPE === 'none', 'invisible CTAs never intercept the pointer');
    expect(st.done.closeOpacity === 1 && st.visiblePE === 'auto', 'CTAs go live with the statement');
    expect(/And ends as a certificate\./.test(st.headline), 'closing statement, got "' + st.headline + '"');
    expect(st.links.length === 2, 'two destinations');
    expect(st.links[0].href === 'diamonds.html' && st.links[0].gold && /Shop Diamonds/i.test(st.links[0].text),
      'gold CTA to the inventory');
    expect(st.links[1].href === 'manufacturing.html' && st.links[1].ghost, 'ghost CTA to the growing story');
  });

  await scenario('WebGL boots lazily — nothing loads until the section approaches', {}, async (page) => {
    await open(page);
    const before = await page.evaluate(() => {
      const section = document.querySelector('#atom-story');
      return {
        farBelow: section.getBoundingClientRect().top > window.innerHeight + 700,
        booted: window.NGDAtomStory.state.booted(),
      };
    });
    expect(before.farBelow, 'the section starts beyond the 700px boot horizon');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.NGDAtomStory.state.booted()) === false,
      'no three.js work while the story is far off stage');
    await page.evaluate(() => document.querySelector('#atom-story').scrollIntoView());
    await page.waitForFunction(() => window.NGDAtomStory.state.booted(), null, { timeout: 25000 });
  });

  await scenario('a blocked three.js module degrades to the DOM story, never an error', { blockThree: true }, async (page) => {
    await open(page);
    await page.evaluate(() => window.NGDAtomStory.boot());
    await page.waitForFunction(() =>
      document.querySelector('#atom-story').classList.contains('ngd-atom-nogl'), null, { timeout: 15000 });
    const st = await page.evaluate(() => {
      const d = window.NGDAtomStory.seek(0.99);
      return {
        booted: d.booted, filled: d.filled, stage: d.stage, closeOpacity: d.closeOpacity,
        canvasHidden: getComputedStyle(document.querySelector('.ngd-atom-gl')).display === 'none',
        fallbackGlow: getComputedStyle(document.querySelector('.ngd-atom-pin'), '::before')
          .backgroundImage.includes('radial-gradient'),
      };
    });
    expect(!st.booted, 'no renderer without the module');
    expect(st.canvasHidden, 'the dead canvas leaves the stage');
    expect(st.fallbackGlow, 'a quiet gradient stands in for the stone');
    expect(st.filled === 9 && st.stage === 'Certified' && st.closeOpacity === 1,
      'the DOM narrative still plays to the end');
  });

  await scenario('reduced motion: the finished composition, statically, in normal flow', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const section = document.querySelector('#atom-story');
      const runway = section.querySelector('.ngd-atom-runway');
      const cert = section.querySelector('[data-atom-cert]');
      return {
        staticMode: window.NGDAtomStory.state.staticMode(),
        cls: section.classList.contains('ngd-atom-static'),
        runwayFlows: runway.offsetHeight < window.innerHeight * 2,
        pinPos: getComputedStyle(section.querySelector('.ngd-atom-pin')).position,
        canvasGone: getComputedStyle(section.querySelector('.ngd-atom-gl')).display === 'none',
        certShown: getComputedStyle(cert).opacity === '1' && getComputedStyle(cert).position === 'static',
        closeShown: getComputedStyle(section.querySelector('[data-atom-close]')).opacity === '1',
        stage: section.querySelector('[data-atom-name]').textContent,
        filled: section.querySelectorAll('.ngd-atom-fld.done').length,
      };
    });
    expect(st.staticMode && st.cls, 'static mode declared');
    expect(st.runwayFlows, 'no 420vh runway — the section sits in normal flow');
    expect(st.pinPos === 'relative', 'nothing pins');
    expect(st.canvasGone, 'no WebGL under reduced motion');
    expect(st.certShown && st.closeShown, 'certificate and closing statement simply shown');
    expect(st.stage === 'Certified' && st.filled === 9, 'the finished composition');
  });

  await scenario('mobile: a shorter runway and a report sized to the hand', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const section = document.querySelector('#atom-story');
      window.NGDAtomStory.seek(0.85);
      const cert = section.querySelector('[data-atom-cert]').getBoundingClientRect();
      return {
        runwayH: section.querySelector('.ngd-atom-runway').offsetHeight,
        vh: window.innerHeight,
        certW: cert.width,
        certInside: cert.right <= window.innerWidth + 1 && cert.left >= 0,
        marksGone: getComputedStyle(section.querySelector('[data-atom-marks]')).display === 'none',
        cueGone: getComputedStyle(section.querySelector('.ngd-atom-cue')).display === 'none',
        h2Fits: section.querySelector('[data-atom-open] h2').getBoundingClientRect().width <= window.innerWidth,
      };
    });
    expect(Math.abs(st.runwayH - st.vh * 3.2) < 60, 'the runway compresses to 320vh, got ' + st.runwayH);
    expect(st.certW <= 342 && st.certInside, 'the report fits on screen, got ' + st.certW);
    expect(st.marksGone && st.cueGone, 'marks and cue yield the small stage');
    expect(st.h2Fits, 'the opening line fits the viewport');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} atom-story scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
