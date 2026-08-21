/* ============================================================
   Manufacturing page tests (STEP 13).
   Verifies the dark hero, the nine-stage process timeline with
   parallax/reveal, the quality-control and certification
   sections, the Explore Our Diamonds CTA and the responsive
   behaviour at 1440/768/390.
   Run:  node tests/manufacturing.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const STAGES = ['CVD Diamond Growth', 'Rough Diamond', 'Planning', 'Laser Cutting', 'Polishing',
  'Quality Inspection', 'Certification', 'Finished Diamond', 'Jewellery Creation'];

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript',
      body: "window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'https://home-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};",
    }));
    await context.route('https://home-test.supabase.co/**', (r) => r.request().method() === 'OPTIONS'
      ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' })
      : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
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
  await page.goto(`${SITE}/manufacturing.html`, { waitUntil: 'networkidle' });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero: dark cinematic opening with the brilliance headline', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      headline: document.querySelector('.ngd-hero h1').textContent.replace(/\s+/g, ' ').trim(),
      intro: document.querySelector('.ngd-hero .ngd-lead').textContent.trim().length,
      darkNav: document.querySelector('.ngd-navbar').classList.contains('ngd-navbar-dark'),
      heroDark: document.querySelector('.ngd-hero').classList.contains('ngd-section-dark'),
      followBtn: !!document.querySelector('.ngd-hero a[href="#mfg-process"]'),
      header: !!document.querySelector('.ngd-navbar'),
      footer: !!document.querySelector('footer.ngd-footer'),
    }));
    /* the <br> collapses to no whitespace in textContent */
    expect(/From growth/i.test(state.headline) && /brilliance/i.test(state.headline),
      'growth-to-brilliance headline, got ' + state.headline);
    expect(state.intro > 40, 'short introduction present');
    expect(state.heroDark && state.darkNav, 'dark hero with dark navbar variant');
    expect(state.followBtn, 'hero links into the process');
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('timeline: nine numbered stages in order with art, copy and parallax hooks', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const stages = [...document.querySelectorAll('#mfg-process .ngd-story-stage')];
      return {
        spine: !!document.querySelector('#mfg-process .ngd-story-spine'),
        stages: stages.map((s) => ({
          node: s.querySelector('.ngd-story-node').textContent.trim(),
          num: s.querySelector('.ngd-story-num').textContent.trim(),
          title: s.querySelector('.ngd-story-title').textContent.trim(),
          text: s.querySelector('.ngd-story-text').textContent.trim(),
          svg: !!s.querySelector('.ngd-story-media svg'),
          parallax: s.querySelector('.ngd-story-media').hasAttribute('data-ngd-parallax'),
        })),
      };
    });
    expect(state.spine, 'process spine rendered');
    expect(state.stages.length === 9, '9 stages, got ' + state.stages.length);
    state.stages.forEach((s, i) => {
      const nn = String(i + 1).padStart(2, '0');
      expect(s.node === nn && s.num === nn, `stage ${i + 1} numbered ${nn}`);
      expect(s.title === STAGES[i], `stage ${i + 1} titled "${STAGES[i]}", got "${s.title}"`);
      expect(s.text.length > 20 && s.text.length < 260, `stage ${i + 1} 1–2 line description`);
      expect(s.svg, `stage ${i + 1} has a premium placeholder visual`);
      expect(s.parallax, `stage ${i + 1} media has a parallax hook`);
    });
  });

  await scenario('desktop: stages alternate left/right around the spine', {}, async (page) => {
    await open(page);
    const sides = await page.evaluate(() =>
      [...document.querySelectorAll('#mfg-process .ngd-story-stage')].map((s) => {
        const media = s.querySelector('.ngd-story-media').getBoundingClientRect();
        const text = s.querySelector('.ngd-story-title').getBoundingClientRect();
        return media.left < text.left ? 'L' : 'R';
      }).join(''));
    expect(sides === 'LRLRLRLRL', 'alternating cinematic layout, got ' + sides);
  });

  await scenario('parallax drifts the panels on scroll; reduced motion disables it', {}, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#mfg-process').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(250);
    const first = await page.evaluate(
      () => document.querySelector('#mfg-process .ngd-story-media').style.transform);
    await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'instant' }));
    await page.waitForTimeout(250);
    const second = await page.evaluate(
      () => document.querySelector('#mfg-process .ngd-story-media').style.transform);
    expect(first && second && first !== second,
      `parallax changes on scroll (${first} → ${second})`);
  });

  await scenario('reduced motion: no parallax transforms', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#mfg-process').scrollIntoView({ behavior: 'instant' }));
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(300);
    const transform = await page.evaluate(
      () => document.querySelector('#mfg-process .ngd-story-media').style.transform);
    expect(!transform, 'no transform under prefers-reduced-motion');
  });

  await scenario('quality control section: heading and four check cards', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#mfg-quality h2').textContent.replace(/\s+/g, ' ').trim(),
      cards: document.querySelectorAll('#mfg-quality .ngd-card').length,
      titles: [...document.querySelectorAll('#mfg-quality .ngd-title')].map((t) => t.textContent.trim()),
    }));
    expect(/Checked at every turn/i.test(state.heading), 'QC heading, got ' + state.heading);
    expect(state.cards === 4, '4 quality cards, got ' + state.cards);
    expect(state.titles.some((t) => /gemmologist/i.test(t)), 'gemmologist card present');
  });

  await scenario('certification section: labs named, badges and certificate art', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      text: document.querySelector('#mfg-certification').textContent,
      badges: [...document.querySelectorAll('#mfg-certification .ngd-badge')].map((b) => b.textContent.trim()),
      art: !!document.querySelector('#mfg-certification .ngd-story-media svg'),
    }));
    expect(/IGI/.test(state.text) && /GIA/.test(state.text), 'IGI + GIA named');
    expect(state.badges.length >= 2, 'lab badges shown');
    expect(state.art, 'certificate visual present');
  });

  await scenario('scroll reveal fires through the journey', {}, async (page) => {
    await open(page);
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
    });
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('main ~ * .ngd-reveal, header.ngd-hero .ngd-reveal, section .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 6000 });
  });

  await scenario('final CTA "Explore Our Diamonds" navigates to the inventory', {}, async (page) => {
    await open(page);
    const label = await page.textContent('#mfg-cta a.ngd-btn');
    expect(label.trim() === 'Explore Our Diamonds', 'CTA label, got ' + label.trim());
    await page.click('#mfg-cta a.ngd-btn');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('mobile 390: clean vertical journey, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const stage = document.querySelector('#mfg-process .ngd-story-stage');
      const media = stage.querySelector('.ngd-story-media').getBoundingClientRect();
      const title = stage.querySelector('.ngd-story-title').getBoundingClientRect();
      return {
        stacked: media.bottom <= title.top + 1,
        nodes: document.querySelectorAll('#mfg-process .ngd-story-node').length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.stacked, 'media stacks above text on mobile');
    expect(state.nodes === 9, 'all nine nodes on the mobile spine');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.evaluate(() =>
      document.querySelector('#mfg-process').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'manufacturing-mobile.png') });
  });

  await scenario('tablet 768 stacked; desktop hero screenshot; no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    let o = await page.evaluate(() => ({
      stacked: document.querySelector('#mfg-process .ngd-story-media').getBoundingClientRect().bottom <=
        document.querySelector('#mfg-process .ngd-story-title').getBoundingClientRect().top + 1,
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.stacked, 'simplified stacked layout at 768');
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'manufacturing-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} manufacturing scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
