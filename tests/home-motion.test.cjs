/* ============================================================
   Home Motion Language V2 tests (homepage choreography).
   home-motion.js drives the sections below the hero: owned
   headers with masked word cascades, the atelier's self-drawing
   line art, the journey's scrubbed spine fill and igniting
   nodes, the principles ribbon, magnetic CTAs and the scroll
   hairline — composing with (never replacing) the existing
   reveal and grid-stagger engines.
   Run:  node tests/home-motion.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://motion-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;

function stone(n) {
  return {
    public_id: 'DIA-MOTN000' + n,
    stock_number: 'NGD-410' + n,
    shape: ['Round', 'Oval', 'Princess'][(n - 1) % 3],
    carat: 1 + n * 0.25,
    color: 'D',
    clarity: 'VS1',
    cut: 'Excellent',
    laboratory: 'IGI',
    availability: 'In Stock',
    image_path: null,
    featured: true,
    created_at: '2026-08-1' + n + 'T10:00:00Z',
  };
}
const ROWS = [stone(3), stone(2), stone(1)];

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
    hasTouch: !!opts.hasTouch,
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
    const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
    await context.route(SB_HOST + '/**', (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
      }
      const path = new URL(req.url()).pathname;
      const body = path === '/rest/v1/diamonds' ? ROWS : [];
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
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
  /* wait out window 'load': ScrollTrigger's automatic refresh on it
     cancels any smooth scroll in flight, so scenarios must scroll
     only after the page has fully settled */
  await page.goto(`${SITE}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() =>
    window.NGDHomeMotion && (window.NGDHomeMotion.state.armed || window.NGDHomeMotion.state.reduced),
    null, { timeout: 15000 });
  await page.waitForTimeout(350);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('the engine arms and takes ownership without breaking the classic reveals', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      s: window.NGDHomeMotion.state,
      armedClass: document.documentElement.classList.contains('ngd-mo-armed'),
      owned: document.querySelectorAll('.ngd-reveal.ngd-mo-own').length,
      headerVisible: getComputedStyle(document.querySelector('#featured-diamonds .ngd-reveal.ngd-mo-own')).opacity,
    }));
    expect(st.s.armed && st.armedClass, 'engine armed');
    expect(st.s.headers === 3, 'three section headers choreographed, got ' + st.s.headers);
    expect(st.s.grids === 3, 'all three live grids adopted the stagger roster, got ' + st.s.grids);
    expect(st.s.nodes === 6, 'six journey nodes wired');
    expect(st.s.marquee === true, 'principles ribbon wired');
    expect(st.owned >= 9, 'headers plus atelier columns owned, got ' + st.owned);
    expect(st.headerVisible === '1', 'owned containers never sit in the blur state');
    /* the old contract still holds: scrolling the atelier flips is-visible */
    await page.evaluate(() => document.querySelector('#fine-jewellery').scrollIntoView({ block: 'end' }));
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('#fine-jewellery .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 9000 });
  });

  await scenario('the Signature stones headline rises word by word, divider drawing after it', {}, async (page) => {
    await open(page);
    const before = await page.evaluate(() => {
      const h2 = document.querySelector('#featured-diamonds h2');
      return {
        masks: h2.querySelectorAll('.ngd-mo-w').length,
        text: h2.textContent.replace(/\s+/g, ' ').trim(),
        accentKept: !!h2.querySelector('.ngd-mo-wi .ngd-italic-accent'),
      };
    });
    expect(before.masks >= 2, 'headline split into masked words, got ' + before.masks);
    expect(before.text === 'Signature stones', 'copy byte-identical after the split, got "' + before.text + '"');
    expect(before.accentKept, 'the italic accent survives inside its mask');
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() =>
      document.querySelector('#featured-diamonds h2').classList.contains('ngd-mo-done'),
      null, { timeout: 8000 });
    /* the divider is drawn by the site-wide signature (reveal
       .is-visible), which must still fire on the owned holder */
    await page.waitForFunction(() => {
      const box = document.querySelector('#featured-diamonds .col-lg-8');
      const t = getComputedStyle(box.querySelector('.ngd-divider')).transform;
      return t === 'none' || /^matrix\(1,/.test(t);
    }, null, { timeout: 6000 });
    const after = await page.evaluate(() => {
      const box = document.querySelector('#featured-diamonds .col-lg-8');
      const lead = box.querySelector('.ngd-lead');
      return {
        done: box.closest('.ngd-reveal').getAttribute('data-mo-done'),
        visible: box.closest('.ngd-reveal').classList.contains('is-visible'),
        leadO: getComputedStyle(lead).opacity,
        wiT: getComputedStyle(box.querySelector('.ngd-mo-wi')).transform,
      };
    });
    expect(after.done === '1', 'header timeline completed');
    expect(after.visible, 'ui.js still marks the owned holder visible');
    expect(after.leadO === '1', 'lead settled');
    expect(after.wiT === 'none', 'word transforms cleared at rest');
  });

  await scenario('live featured stones cascade through the existing grid stagger', {}, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() =>
      document.querySelectorAll('#featured-diamonds-grid .ngd-stagger-card.ngd-anim-in').length >= 3,
      null, { timeout: 15000 });
    const st = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#featured-diamonds-grid .ngd-stagger-card')];
      return {
        delays: cards.map((c) => parseInt(c.style.getPropertyValue('--ngd-d') || '0', 10)),
        links: cards.every((c) => !!c.querySelector('a[href*="diamond-details.html?id=DIA-"]')),
      };
    });
    expect(st.delays.length >= 3, 'three live cards rendered');
    expect(st.delays.some((d) => d > 0), 'the cascade is staggered, got ' + st.delays.join(','));
    expect(st.links, 'cards still link by immutable public id');
  });

  await scenario('the atelier line art draws itself as the cards tip in', {}, async (page) => {
    await open(page);
    const before = await page.evaluate(() => {
      const el = document.querySelector('#fine-jewellery-grid .ngd-jewel-figure svg circle, #fine-jewellery-grid .ngd-jewel-figure svg path');
      return {
        drawn: window.NGDHomeMotion.state.drawn,
        offset: parseFloat(el.style.strokeDashoffset || '0'),
      };
    });
    expect(before.drawn >= 20, 'the sketch shapes are measured for drawing, got ' + before.drawn);
    expect(before.offset > 0, 'strokes start undrawn, got ' + before.offset);
    await page.evaluate(() =>
      document.querySelector('#fine-jewellery-grid').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('#fine-jewellery-grid .ngd-jewel-figure svg *');
      let cleared = 0;
      els.forEach((el) => { if (el.style.strokeDasharray === '') cleared++; });
      return cleared >= els.length * 0.7;
    }, null, { timeout: 12000 });
    const after = await page.evaluate(() => {
      const col = document.querySelector('#fine-jewellery-grid > .ngd-reveal');
      return { o: getComputedStyle(col).opacity, t: col.style.transform || '' };
    });
    expect(after.o === '1' && after.t === '', 'columns land clean with props cleared');
  });

  await scenario('the journey spine fills with scroll, ignites its nodes, and reverses', {}, async (page) => {
    await open(page);
    const walk = await page.evaluate(async () => {
      const story = document.querySelector('#manufacturing-story .ngd-story');
      const fill = story.querySelector('.ngd-mo-spinefill');
      if (!fill) return { fill: false };
      const top = story.getBoundingClientRect().top + window.scrollY;
      /* poll each checkpoint into place — CI frames stall, so a
         fixed settle window under-reports the scrubbed value */
      const until = async (cond, ms) => {
        const t0 = performance.now();
        while (performance.now() - t0 < ms) {
          if (cond()) return true;
          await new Promise((r) => setTimeout(r, 120));
        }
        return cond();
      };
      const P = () => window.NGDHomeMotion.spineProgress();
      const L = () => window.NGDHomeMotion.litNodes();
      window.scrollTo(0, top - window.innerHeight * 0.2);
      await until(() => P() > 0, 5000);
      const mid = { p: P(), lit: L() };
      window.scrollTo(0, top + story.offsetHeight - window.innerHeight * 0.3);
      await until(() => P() > 0.85 && L() === 6, 6000);
      const end = { p: P(), lit: L() };
      window.scrollTo(0, Math.max(0, top - window.innerHeight * 1.5));
      await until(() => P() < 0.15 && L() === 0, 6000);
      const back = { p: P(), lit: L() };
      return { fill: true, mid, end, back,
        fillH: parseFloat(getComputedStyle(fill).height) };
    });
    expect(walk.fill, 'the spine fill element is mounted');
    expect(walk.mid.p > 0 && walk.mid.p < 0.7, 'part-filled early in the journey, got ' + walk.mid.p);
    expect(walk.end.p > 0.85, 'filled by the last stage, got ' + walk.end.p);
    expect(walk.end.lit === 6, 'every node ignited at the end, got ' + walk.end.lit);
    expect(walk.back.p < 0.15, 'the fill drains on the way back, got ' + walk.back.p);
    expect(walk.back.lit === 0, 'the nodes dim again, got ' + walk.back.lit);
  });

  await scenario('the principles ribbon loops on screen, rests off screen, never overflows', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const band = document.querySelector('[data-ngd-marquee]');
      const seqs = band.querySelectorAll('.ngd-marquee-seq');
      return {
        betweenSections: band.offsetTop > document.querySelector('#fine-jewellery').offsetTop &&
          band.offsetTop < document.querySelector('#manufacturing-story').offsetTop,
        ready: band.classList.contains('is-ready'),
        seqs: seqs.length,
        cloneHidden: seqs.length === 2 && seqs[1].getAttribute('aria-hidden') === 'true',
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(st.betweenSections, 'the band divides the atelier from the journey');
    expect(st.ready && st.seqs === 2 && st.cloneHidden, 'sequence cloned once for the seamless loop');
    expect(st.scrollW <= st.clientW + 1, 'no horizontal overflow from the loop');
    await page.evaluate(() =>
      document.querySelector('[data-ngd-marquee]').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => {
      const band = document.querySelector('[data-ngd-marquee]');
      return band.classList.contains('is-on') &&
        getComputedStyle(band.querySelector('.ngd-marquee-track')).animationName === 'ngd-mo-marquee';
    }, null, { timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() =>
      !document.querySelector('[data-ngd-marquee]').classList.contains('is-on'),
      null, { timeout: 5000 });
  });

  await scenario('gold CTAs are gently magnetic under a fine pointer, and let go', {}, async (page) => {
    await open(page);
    const count = await page.evaluate(() => window.NGDHomeMotion.state.magnetic);
    expect(count >= 3, 'section CTAs beyond the hero are magnetised, got ' + count);
    await page.evaluate(() =>
      document.querySelector('#featured-diamonds a[href="diamonds.html"]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    const btn = page.locator('#featured-diamonds a[href="diamonds.html"]');
    const box = await btn.boundingBox();
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
    await page.waitForFunction(() => {
      const t = getComputedStyle(document.querySelector('#featured-diamonds a[href="diamonds.html"]')).transform;
      return t !== 'none' && Math.abs(new DOMMatrix(t).e) > 1;
    }, null, { timeout: 3000 });
    await page.mouse.move(box.x - 200, box.y - 200);
    await page.waitForFunction(() => {
      const t = getComputedStyle(document.querySelector('#featured-diamonds a[href="diamonds.html"]')).transform;
      return t === 'none' || Math.abs(new DOMMatrix(t).e) < 0.6;
    }, null, { timeout: 4000 });
  });

  await scenario('a gold hairline mirrors overall scroll progress', {}, async (page) => {
    await open(page);
    const at = (sel) => page.evaluate((s) => {
      const bar = document.querySelector('.ngd-mo-progress');
      return parseFloat(bar.style.getPropertyValue('--ngd-mo-sp') || '0');
    }, sel);
    expect(await page.evaluate(() => !!document.querySelector('.ngd-mo-progress')), 'hairline mounted');
    expect((await at()) < 0.1, 'empty at the top');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => {
      const bar = document.querySelector('.ngd-mo-progress');
      return parseFloat(bar.style.getPropertyValue('--ngd-mo-sp') || '0') > 0.93;
    }, null, { timeout: 6000 });
  });

  await scenario('reduced motion: the engine stands down before touching anything', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      reduced: window.NGDHomeMotion.state.reduced,
      armed: window.NGDHomeMotion.state.armed,
      masks: document.querySelectorAll('.ngd-mo-w').length,
      hairline: !!document.querySelector('.ngd-mo-progress'),
      marqueeStatic: !document.querySelector('[data-ngd-marquee]').classList.contains('is-ready'),
      h2: document.querySelector('#featured-diamonds h2').textContent.replace(/\s+/g, ' ').trim(),
      spinefill: !!document.querySelector('.ngd-mo-spinefill'),
    }));
    expect(st.reduced && !st.armed, 'engine inert under reduced motion');
    expect(st.masks === 0 && !st.hairline && !st.spinefill, 'no split spans, hairline or spine fill');
    expect(st.marqueeStatic, 'the ribbon stays a static line');
    expect(st.h2 === 'Signature stones', 'copy untouched');
  });

  await scenario('mobile: choreography runs, magnetism yields to touch, nothing overflows', { viewport: { width: 390, height: 844 }, hasTouch: true }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => ({
      armed: window.NGDHomeMotion.state.armed,
      magnetic: window.NGDHomeMotion.state.magnetic,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(st.armed, 'engine armed on mobile');
    expect(st.magnetic === 0, 'no magnetism without a fine pointer, got ' + st.magnetic);
    expect(st.scrollW <= st.clientW + 1, 'no horizontal overflow');
    await page.evaluate(() =>
      document.querySelector('#manufacturing-story').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() =>
      document.querySelector('#manufacturing-story h2').classList.contains('ngd-mo-done'),
      null, { timeout: 8000 });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} home-motion scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
