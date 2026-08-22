/* ============================================================
   Know About Us (about.html) tests.
   The company-profile rebuild: every section is checked against
   the APPROVED company information only — four decades in
   diamonds, natural-diamond heritage, the 2012 transition to
   lab-grown manufacturing, Surat production, CVD + HPHT + Type
   IIA capability, the D–J / 0.30–6.00 ct / ten-shape range,
   global B2B audiences, business values and the mission. Also:
   the removed unsupported claims stay removed (no traceability
   promises, no "own reactors", no invented establishment year,
   no separate Vision), the Know About Us navigation replaces the
   public Design System link, SEO carries the new title, CMS
   hooks + image slots stay wired, and the page behaves at
   1440/768/390 with reveal + parallax intact.
   Run:  node tests/about.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SECTIONS = ['hero', 'intro', 'legacy', 'transition', 'surat',
  'what', 'range', 'serve', 'values', 'mission', 'cta'];
const TIMELINE = ['Four Decades of Diamond Experience', 'Natural Diamond Heritage',
  '2012 — The Lab-Grown Transition', 'Today — Global CVD & HPHT Supply'];
const SHAPES = ['Brilliant Round', 'Cushion', 'Heart', 'Marquise', 'Pear',
  'Princess', 'Radiant', 'Square Radiant', 'Emerald', 'Oval'];
const CAPABILITIES = ['CVD Lab-Grown Diamonds', 'HPHT Lab-Grown Diamonds',
  'Type IIA Diamonds', 'Certified', 'Non-Certified', 'Conflict-Free', 'Ethically Manufactured'];
const VALUES = ['Integrity', 'Honesty', 'Quality', 'Consistency', 'Innovation', 'Ethical Manufacturing'];
const AUDIENCES = ['B2B Clients', 'Retailers', 'Jewellery Traders', 'Wholesalers & Buyers'];

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
  const consoleErrors = [];
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
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|SwiftShader/i.test(m.text())) {
        consoleErrors.push(m.text());
      }
    });
    await fn(page);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    expect(consoleErrors.length === 0, 'no console errors, got: ' + consoleErrors.join(' | '));
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

function sectionText(page, slug) {
  return page.evaluate((s) =>
    document.querySelector('[data-about-section="' + s + '"]').textContent.replace(/\s+/g, ' '), slug);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero: Know About Us eyebrow, four-decades headline and the two B2B CTAs', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      eyebrow: document.querySelector('#about-hero .ngd-eyebrow').textContent.trim(),
      h1: document.querySelector('#about-hero h1').textContent.replace(/\s+/g, ' ').trim(),
      h1Count: document.querySelectorAll('h1').length,
      dark: document.getElementById('about-hero').classList.contains('ngd-section-dark'),
      lead: document.querySelector('#about-hero [data-cms="about_intro.body"]').textContent,
      diamondsCta: !!document.querySelector('#about-hero a.ngd-btn[href="diamonds.html"]'),
      manufacturingCta: !!document.querySelector('#about-hero a.ngd-btn[href="manufacturing.html"]'),
      parallax: !!document.querySelector('#about-hero [data-ngd-parallax]'),
    }));
    expect(state.eyebrow === 'Know About Us', 'hero eyebrow, got ' + state.eyebrow);
    expect(/Four decades of diamond expertise\./.test(state.h1) && /A new era of grown diamonds\./.test(state.h1),
      'the approved headline concept, got ' + state.h1);
    expect(state.h1Count === 1, 'exactly one H1');
    expect(state.dark && state.parallax, 'premium dark hero with the parallax visual');
    expect(/integrity and honesty/.test(state.lead) && /Surat, India/.test(state.lead) &&
      /across the globe/.test(state.lead), 'heritage + Surat + global clientele in the lead');
    expect(state.diamondsCta && state.manufacturingCta, 'Explore Our Diamonds + Our Manufacturing CTAs');
  });

  await scenario('all eleven profile sections render in order', {}, async (page) => {
    await open(page);
    const slugs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-about-section]')].map((s) => s.getAttribute('data-about-section')));
    expect(JSON.stringify(slugs) === JSON.stringify(SECTIONS),
      'section order, got ' + slugs.join(' → '));
    const h2s = await page.evaluate(() => document.querySelectorAll('main h2, section h2').length);
    expect(h2s >= 9, 'H2 headings carry the section hierarchy, got ' + h2s);
  });

  await scenario('introduction: the approved company copy — integrity, excellence, worldwide customers', {}, async (page) => {
    await open(page);
    const text = await sectionText(page, 'intro');
    expect(/legacy of integrity and honesty/.test(text), 'integrity + honesty legacy line');
    expect(/excellence and innovation in diamond manufacturing/.test(text), 'excellence + innovation kept');
    expect(/customers worldwide/.test(text) && /strong business values/.test(text),
      'worldwide customers + business values kept');
    expect(/manufacturer, wholesaler and supplier of CVD and HPHT/.test(text),
      'the current business definition appears');
  });

  await scenario('legacy: four decades from natural diamonds — and no invented establishment year', {}, async (page) => {
    await open(page);
    const text = await sectionText(page, 'legacy');
    expect(/around four decades/i.test(text), 'the approximate four-decades claim, got: ' + text.slice(0, 160));
    expect(/natural diamonds/i.test(text), 'natural-diamond beginnings named');
    const mainText = await page.evaluate(() =>
      [...document.querySelectorAll('[data-about-section]')].map((s) => s.textContent).join(' '));
    const years = (mainText.match(/\b(19|20)\d{2}\b/g) || []).filter((y, i, all) => all.indexOf(y) === i);
    expect(JSON.stringify(years) === JSON.stringify(['2012']),
      '2012 is the only year on the profile — no invented dates, got ' + years.join(','));
    expect(!/Established|Founded|Since 19/i.test(mainText), 'no invented establishment claim');
  });

  await scenario('2012 milestone: the four-step timeline in the approved order', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#about-transition h2').textContent.replace(/\s+/g, ' ').trim(),
      stages: [...document.querySelectorAll('#about-transition .ngd-story-stage .ngd-story-title')]
        .map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
      nodes: [...document.querySelectorAll('#about-transition .ngd-story-node')].map((n) => n.textContent.trim()),
      spine: !!document.querySelector('#about-transition .ngd-story-spine'),
      lead: document.querySelector('#about-transition .ngd-lead').textContent,
    }));
    expect(state.heading === '2012 — The Transition to Lab-Grown Diamonds',
      'milestone heading, got ' + state.heading);
    expect(JSON.stringify(state.stages) === JSON.stringify(TIMELINE),
      'timeline order, got ' + state.stages.join(' → '));
    expect(state.nodes.join(',') === '01,02,03,04' && state.spine, 'elegant numbered spine timeline');
    expect(/In 2012/.test(state.lead) && /polished/.test(state.lead) &&
      /consumer and industry trends/.test(state.lead), 'the approved 2012 story');
  });

  await scenario('Surat: state-of-the-art facilities, global supply — no invented factory statistics', {}, async (page) => {
    await open(page);
    const text = await sectionText(page, 'surat');
    expect(/Built in Surat\. Supplied Worldwide\./.test(text), 'the section heading');
    expect(/state-of-the-art diamond production facilities in Surat, India/.test(text),
      'the approved facility fact');
    expect(/consistency in quality, quantity and supply/.test(text) && /competitive and affordable pricing/.test(text),
      'the consistency aims');
    expect(!/square feet|sq\.? ?ft|employees|\d+ machines|\d+ (countries|nations)|carats? per (year|annum)/i.test(text),
      'no invented factory statistics');
  });

  await scenario('what we do: four B2B roles and all seven approved capabilities', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#about-what h3')].map((h) => h.textContent.trim()),
      chips: [...document.querySelectorAll('#about-capabilities .ngd-badge')].map((b) => b.textContent.trim()),
    }));
    expect(JSON.stringify(state.cards) === JSON.stringify(['Manufacturer', 'Wholesaler', 'Global Supplier', 'Customized Programs']),
      'the four roles, got ' + state.cards.join(','));
    expect(JSON.stringify(state.chips) === JSON.stringify(CAPABILITIES),
      'all capabilities listed, got ' + state.chips.join(','));
  });

  await scenario('range: ten approved shapes, D–J colour, 0.30–6.00 ct, custom programs + inventory CTA', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      shapes: [...document.querySelectorAll('#about-shapes .ngd-badge')].map((b) => b.textContent.trim()),
      text: document.querySelector('[data-about-section="range"]').textContent.replace(/\s+/g, ' '),
      cta: (document.querySelector('#about-range a.ngd-btn') || { textContent: '', getAttribute: () => '' }),
      ctaText: (document.querySelector('#about-range a.ngd-btn') || { textContent: '' }).textContent.trim(),
      ctaHref: (document.querySelector('#about-range a.ngd-btn') || { getAttribute: () => '' }).getAttribute('href'),
    }));
    expect(JSON.stringify(state.shapes) === JSON.stringify(SHAPES),
      'all ten approved shapes in order, got ' + state.shapes.join(','));
    expect(/D – J/.test(state.text) && /0\.30 – 6\.00/.test(state.text),
      'colour and carat ranges shown, got ' + state.text.slice(0, 120));
    expect(/Customized programs can be discussed/.test(state.text), 'custom programs invitation');
    expect(state.ctaText === 'View Diamond Inventory' && state.ctaHref === 'diamonds.html',
      'inventory CTA, got ' + state.ctaText + ' → ' + state.ctaHref);
  });

  await scenario('who we serve: the four approved audiences — no invented customers or logos', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#about-serve h3')].map((h) => h.textContent.trim()),
      heading: document.querySelector('#about-serve h2').textContent.replace(/\s+/g, ' ').trim(),
      logos: document.querySelectorAll('#about-serve img').length,
    }));
    expect(state.heading === 'Serving the Global Diamond Trade', 'section heading, got ' + state.heading);
    expect(JSON.stringify(state.cards) === JSON.stringify(AUDIENCES),
      'the four audiences, got ' + state.cards.join(','));
    expect(state.logos === 0, 'no fake customer logos');
  });

  await scenario('values: exactly the six supported values, no sustainability statistics', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#about-values h3')].map((h) => h.textContent.trim()),
      text: document.querySelector('[data-about-section="values"]').textContent,
    }));
    expect(JSON.stringify(state.cards) === JSON.stringify(VALUES),
      'the six values, got ' + state.cards.join(','));
    expect(!/\d+\s*%|carbon.?neutral|water|renewable/i.test(state.text),
      'no unsupported environmental statistics');
  });

  await scenario('mission: the approved mission, no separate Vision, no removed claims anywhere', {}, async (page) => {
    await open(page);
    const text = await sectionText(page, 'mission');
    expect(/over 40 years of experience in mined diamonds/.test(text), '40+ years origin kept');
    expect(/transitioned to lab-grown diamonds in 2012/.test(text), '2012 transition kept');
    expect(/technological developments/.test(text) && /awareness and education/.test(text),
      'technology + education commitments kept');
    expect(/strong alternative to mined diamonds/.test(text) &&
      /leading wholesale supplier of lab-grown diamonds/.test(text), 'the mission goals kept');
    const whole = await page.evaluate(() => document.body.textContent);
    expect(!/Our Vision/.test(whole), 'the invented Vision section is gone');
    expect(!/traced to its first day|traceable/i.test(whole), 'no unverified traceability claims');
    expect(!/our own reactors|under one roof/i.test(whole), 'no unverified reactor/one-roof claims');
    expect(!/Grown to order|leaves the Earth intact/i.test(whole), 'old unsupported environmental copy removed');
  });

  await scenario('SEO: the Know About Us title and Surat/CVD/HPHT description survive the SEO module', {}, async (page) => {
    await open(page);
    await page.waitForFunction(() => document.title === 'Know About Us | New Grown Diamond', null, { timeout: 8000 });
    const state = await page.evaluate(() => ({
      description: (document.querySelector('meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content'),
      canonicalCount: document.querySelectorAll('meta[name="description"]').length,
    }));
    expect(/Surat-based lab-grown diamond manufacturer/.test(state.description) &&
      /CVD and HPHT/.test(state.description) && /B2B/.test(state.description),
      'approved meta description, got ' + state.description);
    expect(state.canonicalCount === 1, 'a single effective description tag');
  });

  await scenario('navigation: Know About Us replaces Design System publicly (about + index + mobile + footer)', {}, async (page) => {
    await open(page);
    let nav = await page.evaluate(() => ({
      desktop: [...document.querySelectorAll('.ngd-nav .nav-link')].map((a) => a.textContent.trim()),
      aboutHref: (document.querySelector('.ngd-nav .nav-link[href="about.html"]') || { getAttribute: () => null }).getAttribute('aria-current'),
      mobile: [...document.querySelectorAll('.ngd-mobile-menu a')].map((a) => a.getAttribute('href')),
      mobileLabel: (document.querySelector('.ngd-mobile-menu a[href="about.html"]') || { textContent: '' }).textContent.trim(),
      footerStyleguide: document.querySelectorAll('footer a[href="styleguide.html"]').length,
    }));
    expect(nav.desktop.includes('Know About Us') && !nav.desktop.includes('Design system'),
      'about page desktop nav, got ' + nav.desktop.join(','));
    expect(nav.aboutHref === 'page', 'Know About Us marked current on its own page');
    expect(nav.mobile.includes('about.html') && !nav.mobile.includes('styleguide.html') &&
      nav.mobileLabel === 'Know About Us', 'mobile menu swapped');
    expect(nav.footerStyleguide === 0, 'no public footer link to the internal styleguide');

    await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
    nav = await page.evaluate(() => ({
      desktop: [...document.querySelectorAll('.ngd-nav .nav-link')].map((a) => a.textContent.trim()),
      styleguideLinks: document.querySelectorAll('a[href="styleguide.html"]').length,
    }));
    expect(nav.desktop.includes('Know About Us') && !nav.desktop.includes('Design system'),
      'homepage nav swapped too, got ' + nav.desktop.join(','));
    expect(nav.styleguideLinks === 0, 'no public styleguide links anywhere on the homepage');
  });

  await scenario('CMS: hooks stay wired — a live row overrides copy, image slots stay hidden until a URL exists', {}, async (page) => {
    await page.route('https://home-test.supabase.co/rest/v1/site_content*', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([{
        key: 'about_legacy', subheading: 'Our Heritage', body: 'CMS override copy for the legacy block.',
        image_url: 'https://home-test.supabase.co/storage/v1/object/public/site-media/content/surat.png', active: true,
      }]),
    }));
    await page.route('**/storage/v1/object/public/site-media/**', (r) => r.fulfill({
      status: 200, contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    }));
    await open(page);
    await page.waitForFunction(() =>
      document.querySelector('[data-cms="about_legacy.body"]').textContent.includes('CMS override copy'), null, { timeout: 8000 });
    const state = await page.evaluate(() => ({
      subheading: document.querySelector('[data-cms="about_legacy.subheading"]').textContent.trim(),
      photoShown: getComputedStyle(document.querySelector('img[data-cms-src="about_legacy.image_url"]')).display !== 'none',
      othersHidden: [...document.querySelectorAll('img.ngd-cms-photo:not([src])')]
        .every((img) => getComputedStyle(img).display === 'none'),
      hookCount: document.querySelectorAll('[data-cms]').length,
    }));
    expect(state.subheading === 'Our Heritage', 'CMS subheading override applied');
    expect(state.photoShown, 'a supplied image URL reveals the section photo');
    expect(state.othersHidden, 'image slots without a URL keep the placeholder art');
    expect(state.hookCount >= 10, 'the editable hook set stays in place, got ' + state.hookCount);
  });

  await scenario('final CTA: Build Your Diamond Program With Us + working links', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#about-cta h2').textContent.replace(/\s+/g, ' ').trim(),
      body: document.querySelector('#about-cta p').textContent.replace(/\s+/g, ' '),
      diamonds: !!document.querySelector('#about-cta a.ngd-btn[href="diamonds.html"]'),
      contact: !!document.querySelector('#about-cta a.ngd-btn[href="contact.html"]'),
    }));
    expect(state.heading === 'Build Your Diamond Program With Us', 'CTA heading, got ' + state.heading);
    expect(/regular supply or a customized diamond program/.test(state.body), 'the B2B invitation');
    expect(state.diamonds && state.contact, 'Explore Diamonds + Contact Our Team buttons');
    await page.click('#about-cta a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('scroll reveal fires through the profile', {}, async (page) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    const revealed = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.ngd-reveal')];
      return els.filter((el) => el.classList.contains('is-visible')).length / els.length;
    });
    expect(revealed > 0.5, 'most reveal blocks became visible, got ' + revealed);
  });

  await scenario('reduced motion: no parallax transforms', { reducedMotion: 'reduce' }, async (page) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    const transforms = await page.evaluate(() =>
      [...document.querySelectorAll('[data-ngd-parallax]')].map((el) => el.style.transform || ''));
    expect(transforms.every((t) => t === '' || t === 'none'), 'parallax stays still, got ' + transforms.join('|'));
  });

  await scenario('mobile 390: stacked sections, readable timeline and range, no overflow', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      stageWidths: [...document.querySelectorAll('#about-transition .ngd-story-stage')].length,
      shapeChip: (document.querySelector('#about-shapes .ngd-badge') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height,
    }));
    expect(state.overflow, 'no horizontal overflow at 390px');
    expect(state.stageWidths === 4, 'all four timeline stages present');
    expect(state.shapeChip > 12, 'shape chips render readably, got ' + state.shapeChip);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'about-390.png'), fullPage: true });
  });

  await scenario('tablet 768 and desktop 1440: layouts settle with no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow, 'no overflow at 768');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow, 'no overflow at 1440');
    await page.screenshot({ path: path.join(SCREEN_DIR, 'about-1440.png'), fullPage: true });
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
