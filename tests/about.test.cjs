/* ============================================================
   About page tests (STEP 15).
   Verifies the dark split hero with its parallax visual, the
   story / mission-vision / four-movement journey / why-choose-us
   / quality / innovation / responsible sections, glass cards,
   tilt + reveal behaviour and the Explore Our Diamonds CTA at
   1440/768/390.
   Run:  node tests/about.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SECTIONS = ['hero', 'story', 'mission-vision', 'journey', 'why',
  'quality', 'innovation', 'responsible', 'cta'];
const JOURNEY = ['Growth', 'Craftsmanship', 'Inspection', 'Finished Brilliance'];
const WHY = ['Quality Focus', 'Modern Technology', 'Trusted Process',
  'Certified Diamonds', 'Customer Focus', 'Responsible Growth'];

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
  await page.goto(`${SITE}/about.html`, { waitUntil: 'networkidle' });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero: dark split opening with visual, parallax hook and intro', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const hero = document.querySelector('#about-hero');
      const media = hero.querySelector('.ngd-story-media');
      return {
        heroDark: hero.classList.contains('ngd-section-dark'),
        darkNav: document.querySelector('.ngd-navbar').classList.contains('ngd-navbar-dark'),
        headline: hero.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
        intro: hero.querySelector('.ngd-lead').textContent.trim().length,
        art: !!media.querySelector('svg'),
        parallax: media.hasAttribute('data-ngd-parallax'),
        tiltWrap: !!media.closest('[data-ngd-tilt]'),
        storyBtn: !!hero.querySelector('a[href="#about-story"]'),
        diamondsBtn: !!hero.querySelector('a[href="diamonds.html"]'),
        header: !!document.querySelector('.ngd-navbar'),
        footer: !!document.querySelector('footer.ngd-footer'),
      };
    });
    expect(state.heroDark && state.darkNav, 'dark hero with dark navbar variant');
    expect(/modern house/i.test(state.headline) && /diamonds/i.test(state.headline),
      'brand headline, got ' + state.headline);
    expect(state.intro > 60, 'short brand introduction present');
    expect(state.art && state.parallax, 'large visual placeholder with parallax depth');
    expect(state.tiltWrap, 'hero visual carries subtle 3D tilt');
    expect(state.storyBtn && state.diamondsBtn, 'hero CTAs present');
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('all nine about sections render in order', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      hooks: [...document.querySelectorAll('[data-about-section]')]
        .map((s) => s.getAttribute('data-about-section')),
      tops: [...document.querySelectorAll('[data-about-section]')]
        .map((s) => s.getBoundingClientRect().top + window.scrollY),
    }));
    expect(JSON.stringify(state.hooks) === JSON.stringify(SECTIONS),
      'section hooks in order, got ' + state.hooks.join(','));
    expect(state.tops.every((t, i) => i === 0 || t > state.tops[i - 1]),
      'sections stack top to bottom');
  });

  await scenario('our story: split layout with art and purpose copy', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const s = document.querySelector('#about-story');
      return {
        eyebrow: s.querySelector('.ngd-eyebrow').textContent.trim(),
        heading: s.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        art: !!s.querySelector('.ngd-story-media svg'),
        parallax: s.querySelector('.ngd-story-media').hasAttribute('data-ngd-parallax'),
        copy: [...s.querySelectorAll('p')].map((p) => p.textContent.trim().length),
      };
    });
    expect(state.eyebrow === 'Our Story', 'story eyebrow, got ' + state.eyebrow);
    expect(/purpose/i.test(state.heading), 'story heading, got ' + state.heading);
    expect(state.art && state.parallax, 'layered story visual with parallax');
    expect(state.copy.length >= 2 && state.copy.every((c) => c > 60), 'two story paragraphs');
  });

  await scenario('mission & vision: two premium glass cards', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#about-mission-vision .ngd-card')];
      return {
        count: cards.length,
        glass: cards.filter((c) => c.classList.contains('ngd-glass')).length,
        tilt: cards.filter((c) => c.hasAttribute('data-ngd-tilt')).length,
        eyebrows: cards.map((c) => c.querySelector('.ngd-eyebrow').textContent.trim()),
        titles: cards.map((c) => c.querySelector('.ngd-title').textContent.trim()),
        copy: cards.map((c) => c.querySelector('p').textContent.trim().length),
      };
    });
    expect(state.count === 2, 'two cards, got ' + state.count);
    expect(state.glass === 2, 'both cards use the glass surface');
    expect(state.tilt === 2, 'both cards carry subtle 3D tilt');
    expect(JSON.stringify(state.eyebrows) === JSON.stringify(['Our Mission', 'Our Vision']),
      'mission + vision labelled, got ' + state.eyebrows.join(','));
    expect(state.titles.every((t) => t.length > 5), 'each card titled');
    expect(state.copy.every((c) => c > 80), 'substantial copy per card');
  });

  await scenario('journey: four movements with art, numbering and desktop alternation', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const stages = [...document.querySelectorAll('#about-journey .ngd-story-stage')];
      return {
        spine: !!document.querySelector('#about-journey .ngd-story-spine'),
        stages: stages.map((s) => ({
          node: s.querySelector('.ngd-story-node').textContent.trim(),
          title: s.querySelector('.ngd-story-title').textContent.trim(),
          text: s.querySelector('.ngd-story-text').textContent.trim().length,
          svg: !!s.querySelector('.ngd-story-media svg'),
          parallax: s.querySelector('.ngd-story-media').hasAttribute('data-ngd-parallax'),
        })),
        sides: stages.map((s) => {
          const media = s.querySelector('.ngd-story-media').getBoundingClientRect();
          const text = s.querySelector('.ngd-story-title').getBoundingClientRect();
          return media.left < text.left ? 'L' : 'R';
        }).join(''),
        mfgLink: !!document.querySelector('#about-journey a[href="manufacturing.html"]'),
      };
    });
    expect(state.spine, 'journey spine rendered');
    expect(state.stages.length === 4, '4 stages, got ' + state.stages.length);
    state.stages.forEach((s, i) => {
      const nn = String(i + 1).padStart(2, '0');
      expect(s.node === nn, `stage ${i + 1} numbered ${nn}`);
      expect(s.title === JOURNEY[i], `stage ${i + 1} titled "${JOURNEY[i]}", got "${s.title}"`);
      expect(s.text > 20 && s.text < 260, `stage ${i + 1} short line`);
      expect(s.svg && s.parallax, `stage ${i + 1} layered visual with parallax`);
    });
    expect(state.sides === 'LRLR', 'alternating desktop layout, got ' + state.sides);
    expect(state.mfgLink, 'links to the full manufacturing journey');
  });

  await scenario('why choose us: six concise reason cards', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#about-why .ngd-card')];
      return {
        count: cards.length,
        titles: cards.map((c) => c.querySelector('.ngd-title').textContent.trim()),
        tiles: cards.filter((c) => c.querySelector('.ngd-icon-tile')).length,
        tilt: cards.filter((c) => c.hasAttribute('data-ngd-tilt')).length,
        copy: cards.map((c) => c.querySelector('p').textContent.trim().length),
      };
    });
    expect(state.count === 6, 'six cards, got ' + state.count);
    expect(JSON.stringify(state.titles) === JSON.stringify(WHY),
      'expected reasons in order, got ' + state.titles.join(','));
    expect(state.tiles === 6 && state.tilt === 6, 'icon tiles + tilt on all cards');
    expect(state.copy.every((c) => c > 40 && c < 180), 'concise copy per card');
  });

  await scenario('quality & trust: dark band naming IGI + GIA with badges and education link', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const s = document.querySelector('#about-quality');
      return {
        dark: s.classList.contains('ngd-section-dark'),
        text: s.textContent,
        badges: s.querySelectorAll('.ngd-badge').length,
        art: !!s.querySelector('.ngd-story-media svg'),
        points: s.querySelectorAll('ul li').length,
        eduLink: !!s.querySelector('a[href="education.html"]'),
      };
    });
    expect(state.dark, 'quality section uses the dark band');
    expect(/IGI/.test(state.text) && /GIA/.test(state.text), 'IGI + GIA named');
    expect(state.badges >= 2, 'lab badges shown');
    expect(state.art, 'certificate artwork present');
    expect(state.points >= 3, 'trust points listed');
    expect(state.eduLink, 'cross-links the education page');
  });

  await scenario('innovation: technology copy with art and manufacturing link', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const s = document.querySelector('#about-innovation');
      return {
        text: s.textContent,
        art: !!s.querySelector('.ngd-story-media svg'),
        parallax: s.querySelector('.ngd-story-media').hasAttribute('data-ngd-parallax'),
        points: s.querySelectorAll('ul li').length,
        mfgLink: !!s.querySelector('a[href="manufacturing.html"]'),
      };
    });
    expect(/CVD/.test(state.text), 'growth technology named');
    expect(state.art && state.parallax, 'technology visual with parallax');
    expect(state.points >= 3, 'technology points listed');
    expect(state.mfgLink, 'links to the manufacturing page');
  });

  await scenario('responsible journey: three cards plus the education aside', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const s = document.querySelector('#about-responsible');
      return {
        cards: s.querySelectorAll('.ngd-card').length,
        titles: [...s.querySelectorAll('.ngd-title')].map((t) => t.textContent.trim()),
        note: (s.querySelector('.ngd-edu-note') || { textContent: '' }).textContent,
        eduLink: !!s.querySelector('.ngd-edu-note a[href="education.html#edu-compare"]'),
      };
    });
    expect(state.cards === 3, 'three responsibility cards, got ' + state.cards);
    expect(state.titles.some((t) => /above-ground/i.test(t)) &&
      state.titles.some((t) => /traceable/i.test(t)),
      'origin + traceability covered, got ' + state.titles.join(','));
    expect(/different beginning/i.test(state.note), 'comparison aside present');
    expect(state.eduLink, 'aside deep-links the education comparison');
  });

  await scenario('parallax drifts the hero visual on scroll; reduced motion disables it', {}, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#about-journey').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(250);
    const first = await page.evaluate(
      () => document.querySelector('#about-journey .ngd-story-media').style.transform);
    await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'instant' }));
    await page.waitForTimeout(250);
    const second = await page.evaluate(
      () => document.querySelector('#about-journey .ngd-story-media').style.transform);
    expect(first && second && first !== second,
      `parallax changes on scroll (${first} → ${second})`);
  });

  await scenario('reduced motion: no parallax transforms', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#about-journey').scrollIntoView({ behavior: 'instant' }));
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(300);
    const transform = await page.evaluate(
      () => document.querySelector('#about-journey .ngd-story-media').style.transform);
    expect(!transform, 'no transform under prefers-reduced-motion');
  });

  await scenario('scroll reveal fires through the page', {}, async (page) => {
    await open(page);
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
    });
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('.ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 6000 });
  });

  await scenario('final CTA "Explore Our Diamonds" opens the inventory', {}, async (page) => {
    await open(page);
    const label = await page.textContent('#about-cta a.ngd-btn');
    expect(label.trim() === 'Explore Our Diamonds', 'CTA label, got ' + label.trim());
    await page.click('#about-cta a.ngd-btn');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked hero + journey, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const hero = document.querySelector('#about-hero');
      const heroMedia = hero.querySelector('.ngd-story-media').getBoundingClientRect();
      const heroCopy = hero.querySelector('h1').getBoundingClientRect();
      const stage = document.querySelector('#about-journey .ngd-story-stage');
      const media = stage.querySelector('.ngd-story-media').getBoundingClientRect();
      const title = stage.querySelector('.ngd-story-title').getBoundingClientRect();
      return {
        heroStacked: heroCopy.bottom <= heroMedia.top + 1,
        journeyStacked: media.bottom <= title.top + 1,
        whyPerRow: [...document.querySelectorAll('#about-why .ngd-card')].filter((c, _, all) =>
          Math.abs(c.getBoundingClientRect().top - all[0].getBoundingClientRect().top) < 4).length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyW: document.body.scrollWidth,
      };
    });
    expect(state.heroStacked, 'hero copy stacks above the visual on mobile');
    expect(state.journeyStacked, 'journey media stacks above text on mobile');
    expect(state.whyPerRow === 2, 'two why-cards per row on mobile, got ' + state.whyPerRow);
    expect(state.scrollW <= state.clientW + 1 && state.bodyW <= state.clientW + 1,
      `no overflow s=${state.scrollW} b=${state.bodyW} c=${state.clientW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'about-mobile.png') });
  });

  await scenario('tablet 768 and desktop 1440: layouts settle with no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    let o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
      whyPerRow: [...document.querySelectorAll('#about-why .ngd-card')].filter((c, _, all) =>
        Math.abs(c.getBoundingClientRect().top - all[0].getBoundingClientRect().top) < 4).length,
    }));
    expect(o.whyPerRow === 3, 'three why-cards per row at 1440, got ' + o.whyPerRow);
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'about-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} about scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
