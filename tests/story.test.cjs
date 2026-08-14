/* ============================================================
   Homepage Manufacturing Story tests (STEP 7).
   Verifies the journey section below Fine Jewellery: six numbered
   stages with art and copy, alternating desktop layout, vertical
   mobile journey, subtle parallax (and its reduced-motion/mobile
   opt-outs), scroll reveal, and the Manufacturing CTA.
   Run:  node tests/story.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const STAGES = [
  'Diamond Growth', 'Rough Diamond', 'Cutting',
  'Polishing', 'Quality Inspection', 'Finished Diamond & Jewellery',
];

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

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('section below jewellery: heading, six numbered stages with art + copy', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const section = document.querySelector('#manufacturing-story');
      const jewellery = document.querySelector('#fine-jewellery');
      const stages = [...section.querySelectorAll('.ngd-story-stage')];
      return {
        belowJewellery:
          section.getBoundingClientRect().top + window.scrollY >
          jewellery.getBoundingClientRect().top + window.scrollY,
        heading: section.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        spine: !!section.querySelector('.ngd-story-spine'),
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
    expect(state.belowJewellery, 'story section sits below Fine Jewellery');
    expect(/journey/i.test(state.heading), 'storytelling heading present');
    expect(state.spine, 'journey spine rendered');
    expect(state.stages.length === 6, '6 stages, got ' + state.stages.length);
    state.stages.forEach((s, i) => {
      const nn = String(i + 1).padStart(2, '0');
      expect(s.node === nn && s.num === nn, `stage ${i + 1} numbered ${nn}`);
      expect(s.title === STAGES[i], `stage ${i + 1} titled "${STAGES[i]}", got "${s.title}"`);
      expect(s.text.length > 20 && s.text.length < 260, `stage ${i + 1} short text`);
      expect(s.svg, `stage ${i + 1} has artwork`);
      expect(s.parallax, `stage ${i + 1} media has parallax hook`);
    });
  });

  await scenario('desktop: stages alternate left/right around the spine', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const sides = await page.evaluate(() =>
      [...document.querySelectorAll('.ngd-story-stage')].map((s) => {
        const media = s.querySelector('.ngd-story-media').getBoundingClientRect();
        const text = s.querySelector('.ngd-story-title').getBoundingClientRect();
        return media.left < text.left ? 'media-left' : 'media-right';
      })
    );
    expect(
      JSON.stringify(sides) ===
        JSON.stringify(['media-left', 'media-right', 'media-left', 'media-right', 'media-left', 'media-right']),
      'alternating layout, got ' + sides.join(',')
    );
  });

  await scenario('desktop: parallax drifts the panels on scroll', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    /* the page uses smooth scroll-behavior — jump instantly so the
       section is actually in view when we sample */
    await page.evaluate(() =>
      document.querySelector('#manufacturing-story').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(250);
    const first = await page.evaluate(
      () => document.querySelector('.ngd-story-media').style.transform
    );
    await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'instant' }));
    await page.waitForTimeout(250);
    const second = await page.evaluate(
      () => document.querySelector('.ngd-story-media').style.transform
    );
    expect(first && second && first !== second,
      `parallax transform changes on scroll (${first} → ${second})`);
  });

  await scenario('reduced motion: no parallax transforms applied', { reducedMotion: 'reduce' }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('#manufacturing-story').scrollIntoView());
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);
    const transform = await page.evaluate(
      () => document.querySelector('.ngd-story-media').style.transform
    );
    expect(!transform, 'no transform under prefers-reduced-motion, got ' + (transform || '(none)'));
  });

  await scenario('mobile 390: vertical journey, no parallax, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const stage = document.querySelector('.ngd-story-stage');
      const media = stage.querySelector('.ngd-story-media').getBoundingClientRect();
      const title = stage.querySelector('.ngd-story-title').getBoundingClientRect();
      return {
        stacked: media.bottom <= title.top + 1,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        nodes: document.querySelectorAll('.ngd-story-node').length,
      };
    });
    expect(state.stacked, 'media stacks above text on mobile');
    expect(state.nodes === 6, 'all six nodes present');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW} c=${state.clientW}`);
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    const transform = await page.evaluate(
      () => document.querySelector('.ngd-story-media').style.transform
    );
    expect(!transform, 'no parallax on mobile');
    await page.evaluate(() =>
      document.querySelector('#manufacturing-story').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'story-mobile.png') });
  });

  await scenario('tablet 768: vertical journey, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const stage = document.querySelector('.ngd-story-stage');
      const media = stage.querySelector('.ngd-story-media').getBoundingClientRect();
      const title = stage.querySelector('.ngd-story-title').getBoundingClientRect();
      return {
        stacked: media.bottom <= title.top + 1,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.stacked, 'media stacks above text at 768');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW} c=${state.clientW}`);
  });

  await scenario('scroll reveal fires through the journey', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const section = document.querySelector('#manufacturing-story');
      const top = section.getBoundingClientRect().top + window.scrollY;
      const end = top + section.offsetHeight;
      for (let y = top; y <= end; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('#manufacturing-story .ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 5000 });
  });

  await scenario('CTA "Discover Our Manufacturing" navigates to the page', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.click('#manufacturing-story a[href="manufacturing.html"]');
    await page.waitForURL('**/manufacturing.html', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      heading: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
      header: !!document.querySelector('.ngd-navbar'),
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(/growth/i.test(state.heading) && /brilliance/i.test(state.heading),
      'manufacturing hero headline, got ' + state.heading);
    expect(state.header, 'site header present');
    expect(state.scrollW <= state.clientW + 1, 'manufacturing page no overflow');
  });

  await scenario('desktop screenshot of the journey', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() =>
      document.querySelector('#manufacturing-story').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'story-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} story scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
