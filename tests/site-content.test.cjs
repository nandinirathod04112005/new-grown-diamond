/* ============================================================
   Public CMS content loader tests (LIVE).
   Verifies assets/js/site-content.js against the real pages:
   active site_content rows override the built-in copy via
   textContent and validated URLs; missing rows, inactive
   sections and Supabase failures leave the designed fallback
   exactly as authored (never blank); admin-entered HTML renders
   as literal text and javascript: URLs never bind.
   Run:  node tests/site-content.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://cms-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;

const HERO_ROW = {
  key: 'homepage_hero', heading: null,
  subheading: 'CMS · Grown For You', body: 'Copy managed from the admin console.',
  cta_text: 'Shop Stones', cta_url: 'diamonds.html?from=cms',
  cta2_text: 'Shop Pieces', cta2_url: 'jewellery.html?from=cms',
  image_url: null, secondary_image_url: null, active: true,
};
const FOOTER_ROW = { key: 'footer_content', body: 'A footer line managed in the CMS.', active: true };

const results = [];
let browser;
let SITE;
let cmsCalls = [];

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
function makeMock(opts) {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status, obj) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
    }
    if (url.pathname === '/rest/v1/site_content') {
      cmsCalls.push(req.url());
      if (opts.fail) return json(500, { message: 'mock outage' });
      const activeOnly = url.searchParams.get('active') === 'eq.true';
      return json(200, (opts.rows || []).filter((r) => !activeOnly || r.active === true));
    }
    return json(200, []); // featured diamonds / jewellery queries are other suites' business
  };
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(opts));
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

const heroState = () => ({
  eyebrow: document.querySelector('[data-cms="homepage_hero.subheading"]').textContent.trim(),
  lead: document.querySelector('[data-cms="homepage_hero.body"]').textContent.trim(),
  ctaText: document.querySelector('[data-cms="homepage_hero.cta_text"]').textContent.trim(),
  ctaHref: document.querySelector('[data-cms-href="homepage_hero.cta_url"]').getAttribute('href'),
  footer: document.querySelector('[data-cms="footer_content.body"]').textContent.trim(),
});

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('active CMS rows override the homepage copy (text, CTAs, footer)', {
    rows: [HERO_ROW, FOOTER_ROW],
  }, async (page) => {
    cmsCalls = [];
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      document.querySelector('[data-cms="homepage_hero.subheading"]').textContent.includes('CMS'));
    const state = await page.evaluate(heroState);
    expect(state.eyebrow === 'CMS · Grown For You', 'eyebrow from the CMS, got ' + state.eyebrow);
    expect(state.lead === 'Copy managed from the admin console.', 'lead from the CMS');
    expect(state.ctaText === 'Shop Stones' && state.ctaHref === 'diamonds.html?from=cms',
      'CTA text + URL from the CMS, got ' + state.ctaText + ' → ' + state.ctaHref);
    expect(state.footer === 'A footer line managed in the CMS.', 'footer line from the CMS');
    expect(cmsCalls.length === 1 && cmsCalls[0].includes('active=eq.true'),
      'one query, restricted to active sections: ' + cmsCalls[0]);
  });

  await scenario('no saved rows: the designed built-in copy stays exactly as authored', { rows: [] }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(heroState);
    expect(state.eyebrow === 'Lab-grown · Certified · Bespoke', 'built-in eyebrow kept');
    expect(/Certified lab-grown stones and fine jewellery/.test(state.lead), 'built-in lead kept');
    expect(state.ctaText === 'Explore Diamonds' && state.ctaHref === 'diamonds.html', 'built-in CTA kept');
  });

  await scenario('inactive sections fall back to the built-in copy', {
    rows: [Object.assign({}, HERO_ROW, { active: false })],
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(heroState);
    expect(state.eyebrow === 'Lab-grown · Certified · Bespoke', 'inactive row never applied');
  });

  await scenario('supabase failure leaves the page whole and calm', { fail: true }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(heroState);
    expect(state.eyebrow === 'Lab-grown · Certified · Bespoke', 'fallback copy on outage');
    const alive = await page.evaluate(() => !!document.querySelector('#fine-jewellery') && !!document.querySelector('footer'));
    expect(alive, 'rest of the homepage unaffected');
  });

  await scenario('admin HTML renders as literal text; javascript: URLs never bind', {
    rows: [Object.assign({}, HERO_ROW, {
      body: 'Nice copy <img src=x onerror="window.__cms=1"> indeed',
      cta_url: 'javascript:alert(1)',
    })],
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      document.querySelector('[data-cms="homepage_hero.body"]').textContent.includes('Nice copy'));
    const state = await page.evaluate(() => ({
      leadText: document.querySelector('[data-cms="homepage_hero.body"]').textContent,
      leadHasImg: !!document.querySelector('[data-cms="homepage_hero.body"] img'),
      xss: window.__cms === 1,
      ctaHref: document.querySelector('[data-cms-href="homepage_hero.cta_url"]').getAttribute('href'),
    }));
    expect(/onerror/.test(state.leadText) && !state.leadHasImg && !state.xss,
      'markup stays literal text — nothing executes');
    expect(state.ctaHref === 'diamonds.html', 'javascript: URL refused; built-in href kept, got ' + state.ctaHref);
  });

  await scenario('other pages read their own sections (About intro)', {
    rows: [{ key: 'about_intro', subheading: 'CMS About Eyebrow', body: 'About lead from the CMS.', active: true }],
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      document.querySelector('[data-cms="about_intro.subheading"]').textContent.includes('CMS'));
    const state = await page.evaluate(() => ({
      eyebrow: document.querySelector('[data-cms="about_intro.subheading"]').textContent.trim(),
      lead: document.querySelector('[data-cms="about_intro.body"]').textContent.trim(),
      headingStyled: !!document.querySelector('h1 .ngd-italic-accent'),
    }));
    expect(state.eyebrow === 'CMS About Eyebrow' && state.lead === 'About lead from the CMS.', 'About intro from the CMS');
    expect(state.headingStyled, 'the designed display heading is untouched');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} site-content scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
