/* ============================================================
   Education page tests (STEP 14).
   Verifies the eight learning chapters: natural-vs-lab-grown
   comparison, CVD vs HPHT, the 4C cards, the shape gallery,
   certification, the how-to-read-a-report list, jewellery care,
   the FAQ accordion (single-open), chapter chips, reveal/tilt
   behaviour and the Explore Certified Diamonds CTA at
   1440/768/390.
   Run:  node tests/education.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const CHAPTERS = ['edu-compare', 'edu-methods', 'edu-4cs', 'edu-shapes',
  'edu-certification', 'edu-report', 'edu-care', 'edu-faq'];
const SHAPES = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise'];
const FOUR_CS = ['Cut', 'Colour', 'Clarity', 'Carat'];

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

async function open(page) {
  await page.goto(`${SITE}/education.html`, { waitUntil: 'networkidle' });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero: headline, chapter chips and all eight chapters in order', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((chapters) => {
      const tops = chapters.map((id) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : -1;
      });
      return {
        heading: document.querySelector('#edu-hero h1').textContent.replace(/\s+/g, ' ').trim(),
        chips: [...document.querySelectorAll('#edu-hero .ngd-chip')].map((c) => c.getAttribute('href')),
        tops,
        header: !!document.querySelector('.ngd-navbar'),
        footer: !!document.querySelector('footer.ngd-footer'),
        ctaAfter: document.getElementById('edu-cta').getBoundingClientRect().top + window.scrollY,
      };
    }, CHAPTERS);
    expect(/Diamond education/i.test(state.heading) && /made clear/i.test(state.heading),
      'education headline, got ' + state.heading);
    expect(state.chips.length === 8 &&
      JSON.stringify(state.chips) === JSON.stringify(CHAPTERS.map((c) => '#' + c)),
      'eight chapter chips link the sections, got ' + state.chips.join(','));
    expect(state.tops.every((t, i) => t > 0 && (i === 0 || t > state.tops[i - 1])),
      'chapters render in order, tops ' + state.tops.join(','));
    expect(state.ctaAfter > state.tops[7], 'final CTA sits after the FAQ');
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('chapter chip jumps to its section', {}, async (page) => {
    await open(page);
    await page.click('#edu-hero .ngd-chip[href="#edu-4cs"]');
    await page.waitForFunction(() => location.hash === '#edu-4cs');
    /* smooth scroll — wait until the section top settles near the viewport top */
    await page.waitForFunction(() => {
      const top = document.getElementById('edu-4cs').getBoundingClientRect().top;
      return top >= -10 && top <= 120;
    }, null, { timeout: 5000 });
  });

  await scenario('natural vs lab-grown: origin cards and neutral comparison table', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const section = document.querySelector('#edu-compare');
      const rows = [...section.querySelectorAll('.ngd-table tbody tr')];
      return {
        badges: [...section.querySelectorAll('.ngd-badge')].map((b) => b.textContent.trim()),
        heads: [...section.querySelectorAll('.ngd-table thead th')].map((t) => t.textContent.trim()),
        rowCount: rows.length,
        material: rows[0] ? [...rows[0].querySelectorAll('td')].map((t) => t.textContent.trim()) : [],
        hardness: (rows[1] || { textContent: '' }).textContent,
        text: section.textContent,
      };
    });
    expect(state.badges.includes('Natural') && state.badges.includes('Lab-Grown'),
      'both origin cards present, got ' + state.badges.join(','));
    expect(JSON.stringify(state.heads) ===
      JSON.stringify(['Property', 'Natural Diamond', 'Lab-Grown Diamond']),
      'comparison columns, got ' + state.heads.join(' | '));
    expect(state.rowCount >= 8, 'at least 8 comparison rows, got ' + state.rowCount);
    expect(state.material[0] === 'Crystallised carbon' && state.material[0] === state.material[1],
      'material row identical for both, got ' + state.material.join(' | '));
    expect(/10 on the Mohs/.test(state.hardness), 'hardness row present');
    expect(/graded to the same standards/i.test(state.text), 'neutral grading footnote present');
  });

  await scenario('CVD vs HPHT: two method cards with art, steps and the real-diamond note', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#edu-methods .ngd-card')];
      return {
        titles: cards.map((c) => c.querySelector('.ngd-title').textContent.trim()),
        art: cards.map((c) => !!c.querySelector('.ngd-story-media svg')),
        bullets: cards.map((c) => c.querySelectorAll('ul li').length),
        tilt: cards.filter((c) => c.hasAttribute('data-ngd-tilt')).length,
        note: (document.querySelector('#edu-methods .ngd-edu-note') || { textContent: '' }).textContent,
      };
    });
    expect(state.titles.length === 2 &&
      /Chemical Vapour Deposition/.test(state.titles[0]) &&
      /High Pressure, High Temperature/.test(state.titles[1]),
      'CVD + HPHT cards, got ' + state.titles.join(' | '));
    expect(state.art.every(Boolean), 'both methods illustrated');
    expect(state.bullets.every((b) => b === 3), 'three facts per method');
    expect(state.tilt === 2, 'both method cards tilt');
    expect(/Both methods grow real diamonds/i.test(state.note), 'real-diamond note present');
  });

  await scenario('4Cs: exactly four cards — Cut, Colour, Clarity, Carat — each with a visual', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#edu-4cs .ngd-4c-card')];
      return {
        count: cards.length,
        titles: cards.map((c) => c.querySelector('.ngd-title').textContent.trim()),
        visuals: cards.filter((c) => c.querySelector('.ngd-4c-visual')).length,
        colourScale: !!cards[1] && !!cards[1].querySelector('.ngd-colour-scale'),
        caratDots: cards[3] ? cards[3].querySelectorAll('.ngd-carat-dots i').length : 0,
        cutSvg: !!cards[0] && !!cards[0].querySelector('.ngd-4c-visual svg'),
        claritySvg: !!cards[2] && !!cards[2].querySelector('.ngd-4c-visual svg'),
        tilt: cards.filter((c) => c.hasAttribute('data-ngd-tilt')).length,
        texts: cards.map((c) => c.querySelector('p.ngd-text-muted').textContent.trim().length),
      };
    });
    expect(state.count === 4, 'exactly 4 cards, got ' + state.count);
    expect(JSON.stringify(state.titles) === JSON.stringify(FOUR_CS),
      'Cut/Colour/Clarity/Carat in order, got ' + state.titles.join(','));
    expect(state.visuals === 4, 'every card has a visual band');
    expect(state.cutSvg && state.claritySvg, 'cut + clarity icon art');
    expect(state.colourScale, 'colour card shows the D→K scale');
    expect(state.caratDots === 4, 'carat card shows four size dots');
    expect(state.tilt === 4, 'all 4C cards tilt');
    expect(state.texts.every((t) => t > 60 && t < 320), 'short beginner-friendly copy per card');
  });

  await scenario('shapes: all eight silhouettes link into the filtered inventory', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      names: [...document.querySelectorAll('#edu-shapes .ngd-shape-name')].map((n) => n.textContent.trim()),
      hrefs: [...document.querySelectorAll('#edu-shapes .ngd-shape-card')].map((a) => a.getAttribute('href')),
      svgs: document.querySelectorAll('#edu-shapes .ngd-shape-media svg').length,
    }));
    expect(JSON.stringify(state.names) === JSON.stringify(SHAPES),
      'all 8 shapes in order, got ' + state.names.join(','));
    expect(state.hrefs.every((h) => /^diamonds\.html\?shape=[a-z]+$/.test(h)),
      'shape links carry the filter param, got ' + state.hrefs.join(' '));
    expect(state.svgs === 8, '8 cut illustrations');
    await page.click('#edu-shapes .ngd-shape-card[href="diamonds.html?shape=marquise"]');
    await page.waitForURL('**/diamonds.html?shape=marquise', { timeout: 8000 });
  });

  await scenario('certification: dark chapter names IGI + GIA with badges and art', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const section = document.querySelector('#edu-certification');
      return {
        dark: section.classList.contains('ngd-section-dark'),
        text: section.textContent,
        badges: [...section.querySelectorAll('.ngd-badge')].map((b) => b.textContent.trim()),
        art: !!section.querySelector('.ngd-story-media svg'),
        points: section.querySelectorAll('ul li').length,
      };
    });
    expect(state.dark, 'certification chapter uses the dark band');
    expect(/IGI/.test(state.text) && /GIA/.test(state.text), 'IGI + GIA named');
    expect(state.badges.length >= 2, 'lab badges shown, got ' + state.badges.length);
    expect(state.art, 'certificate artwork present');
    expect(state.points >= 3, 'why-it-matters points listed');
  });

  await scenario('report chapter: eight numbered lines plus the authenticity check', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#edu-report .ngd-report-list li')];
      return {
        count: items.length,
        first: items[0] ? items[0].textContent : '',
        growth: items.map((i) => i.textContent).join(' '),
        note: (document.querySelector('#edu-report .ngd-edu-note') || { textContent: '' }).textContent,
        art: !!document.querySelector('#edu-report .ngd-story-media svg'),
      };
    });
    expect(state.count === 8, 'eight report lines, got ' + state.count);
    expect(/Report number/.test(state.first), 'starts with the report number');
    expect(/CVD or HPHT/.test(state.growth), 'growth-method line included');
    expect(/authenticity check/i.test(state.note) && /girdle/i.test(state.note),
      'authenticity tip present');
    expect(state.art, 'annotated report artwork present');
  });

  await scenario('care chapter: four aftercare rituals', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('#edu-care .ngd-card').length,
      tiles: document.querySelectorAll('#edu-care .ngd-icon-tile').length,
      titles: [...document.querySelectorAll('#edu-care .ngd-title')].map((t) => t.textContent.trim()),
    }));
    expect(state.cards === 4 && state.tiles === 4, '4 care cards with icon tiles');
    expect(state.titles.some((t) => /clean/i.test(t)) && state.titles.some((t) => /store/i.test(t)),
      'cleaning + storage covered, got ' + state.titles.join(','));
  });

  await scenario('FAQ accordion: six questions, first open, single-open behaviour', {}, async (page) => {
    await open(page);
    await page.evaluate(() =>
      document.querySelector('#edu-faq').scrollIntoView({ behavior: 'instant', block: 'start' }));
    const initial = await page.evaluate(() => ({
      items: document.querySelectorAll('#eduFaq .accordion-item').length,
      firstOpen: document.querySelector('#eduFaqA1').classList.contains('show'),
      firstExpanded: document.querySelector('[data-bs-target="#eduFaqA1"]').getAttribute('aria-expanded'),
      othersClosed: [...document.querySelectorAll('#eduFaq .accordion-collapse')]
        .filter((c) => c.id !== 'eduFaqA1').every((c) => !c.classList.contains('show')),
    }));
    expect(initial.items === 6, 'six FAQ items, got ' + initial.items);
    expect(initial.firstOpen && initial.firstExpanded === 'true', 'first answer open by default');
    expect(initial.othersClosed, 'remaining answers start closed');
    await page.click('[data-bs-target="#eduFaqA3"]');
    await page.waitForFunction(() =>
      document.querySelector('#eduFaqA3').classList.contains('show') &&
      !document.querySelector('#eduFaqA1').classList.contains('show'), null, { timeout: 4000 });
    const after = await page.evaluate(() => ({
      thirdExpanded: document.querySelector('[data-bs-target="#eduFaqA3"]').getAttribute('aria-expanded'),
      firstExpanded: document.querySelector('[data-bs-target="#eduFaqA1"]').getAttribute('aria-expanded'),
    }));
    expect(after.thirdExpanded === 'true' && after.firstExpanded === 'false',
      'aria-expanded follows the single-open accordion');
  });

  await scenario('4C card tilt reacts to pointer and resets', {}, async (page) => {
    await open(page);
    const card = page.locator('#edu-4cs .ngd-4c-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
    await page.waitForTimeout(120);
    const transform = await card.evaluate((el) => el.style.transform);
    expect(/perspective/.test(transform) && /rotate/.test(transform),
      'pointer tilt applied, got: ' + (transform || '(none)'));
    await page.mouse.move(box.x - 80, box.y - 80);
    await page.waitForTimeout(120);
    const after = await card.evaluate((el) => el.style.transform);
    expect(after === '', 'tilt resets on pointer leave, got: ' + (after || '(cleared)'));
  });

  await scenario('scroll reveal fires through every chapter', {}, async (page) => {
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

  await scenario('final CTA "Explore Certified Diamonds" opens the inventory', {}, async (page) => {
    await open(page);
    const label = await page.textContent('#edu-cta a.ngd-btn');
    expect(label.trim() === 'Explore Certified Diamonds', 'CTA label, got ' + label.trim());
    await page.click('#edu-cta a.ngd-btn');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('mobile 390: stacked chapters, 2-across shapes, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#edu-4cs .ngd-4c-card')];
      const shapes = [...document.querySelectorAll('#edu-shapes .ngd-shape-card')];
      return {
        fourCsStacked: cards[0].getBoundingClientRect().width > 300,
        shapesPerRow: shapes.filter((s) =>
          Math.abs(s.getBoundingClientRect().top - shapes[0].getBoundingClientRect().top) < 4).length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyW: document.body.scrollWidth,
      };
    });
    expect(state.fourCsStacked, '4C cards full-width on mobile');
    expect(state.shapesPerRow === 2, 'two shape cards per row, got ' + state.shapesPerRow);
    expect(state.scrollW <= state.clientW + 1 && state.bodyW <= state.clientW + 1,
      `no overflow s=${state.scrollW} b=${state.bodyW} c=${state.clientW}`);
    await page.evaluate(() =>
      document.querySelector('#edu-4cs').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'education-mobile.png') });
  });

  await scenario('tablet 768: two 4C cards per row, no overflow; desktop screenshot', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    let o = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#edu-4cs .ngd-4c-card')];
      return {
        perRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.perRow === 2, 'two 4C cards per row at 768, got ' + o.perRow);
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
      perRow: [...document.querySelectorAll('#edu-4cs .ngd-4c-card')].filter((card, _, all) =>
        Math.abs(card.getBoundingClientRect().top - all[0].getBoundingClientRect().top) < 4).length,
    }));
    expect(o.perRow === 4, 'four 4C cards per row at 1440, got ' + o.perRow);
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.evaluate(() =>
      document.querySelector('#edu-4cs').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'education-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} education scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
