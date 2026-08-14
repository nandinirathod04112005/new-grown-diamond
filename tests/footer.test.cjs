/* ============================================================
   Global footer tests (STEP 8).
   Verifies the shared dark footer on every public page: identical
   markup, navigation groups, working link targets, social
   placeholders, legal row, hover animation, back-to-top button,
   and the responsive layout at 1440/768/390.
   Run:  node tests/footer.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const PAGES = ['index.html', 'diamonds.html', 'diamond-details.html', 'jewellery.html',
  'jewellery-details.html', 'manufacturing.html', 'education.html', 'about.html', 'contact.html', 'privacy.html',
  'terms.html', 'styleguide.html'];

const QUICK = ['Home', 'Diamonds', 'Jewellery', 'Manufacturing', 'Education', 'About', 'Contact'];
const DIAMOND = ['Diamond Inventory', 'Featured Diamonds', 'Diamond Education'];
const JEWELLERY = ['Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles'];

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function head(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
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

  await scenario('identical footer + back-to-top on all 12 public pages', {}, async (page) => {
    let reference = null;
    for (const p of PAGES) {
      await page.goto(`${SITE}/${p}`, { waitUntil: 'domcontentloaded' });
      const state = await page.evaluate(() => ({
        html: document.querySelector('footer.ngd-footer').outerHTML,
        totop: !!document.querySelector('.ngd-totop'),
      }));
      expect(state.totop, `[${p}] back-to-top present`);
      if (reference === null) reference = state.html;
      expect(state.html === reference, `[${p}] footer markup identical to index`);
    }
  });

  await scenario('navigation groups match the spec', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    const groups = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll('.ngd-footer .ngd-footer-heading').forEach((h) => {
        out[h.textContent.trim()] =
          [...h.parentElement.querySelectorAll('a')].map((a) => a.textContent.trim());
      });
      return out;
    });
    expect(JSON.stringify(groups['Quick Links']) === JSON.stringify(QUICK),
      'Quick Links group, got ' + (groups['Quick Links'] || []).join(','));
    expect(JSON.stringify(groups['Diamonds']) === JSON.stringify(DIAMOND),
      'Diamonds group, got ' + (groups['Diamonds'] || []).join(','));
    expect(JSON.stringify(groups['Jewellery']) === JSON.stringify(JEWELLERY),
      'Jewellery group, got ' + (groups['Jewellery'] || []).join(','));
    expect((groups['Company'] || []).includes('Sign In') && groups['Company'].includes('Contact'),
      'Company group has Contact + Sign In, got ' + (groups['Company'] || []).join(','));
  });

  await scenario('brand block, description and 4 social placeholders', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      brand: document.querySelector('.ngd-footer .ngd-brand').textContent.replace(/\s+/g, ' ').trim(),
      desc: document.querySelector('.ngd-footer-desc').textContent.trim(),
      socials: [...document.querySelectorAll('.ngd-social a')].map((a) => ({
        href: a.getAttribute('href'),
        label: a.getAttribute('aria-label') || '',
        svg: !!a.querySelector('svg'),
      })),
    }));
    expect(/New Grown Diamond/.test(state.brand), 'brand present');
    expect(state.desc.length > 30 && state.desc.length < 220, 'short premium description');
    expect(state.socials.length === 4, '4 social icons');
    for (const s of state.socials) {
      expect(s.href === '#', 'social href is a safe placeholder');
      expect(s.label.length > 0 && s.svg, 'social has aria-label + icon');
    }
  });

  await scenario('legal row: live year, Privacy Policy and Terms links', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      year: document.querySelector('[data-ngd-year]').textContent.trim(),
      privacy: !!document.querySelector('.ngd-footer-bottom a[href="privacy.html"]'),
      terms: !!document.querySelector('.ngd-footer-bottom a[href="terms.html"]'),
      copyright: document.querySelector('.ngd-footer-bottom').textContent.includes('©'),
    }));
    expect(state.year === String(new Date().getFullYear()), 'year is live, got ' + state.year);
    expect(state.privacy && state.terms && state.copyright, 'legal links + copyright present');
  });

  await scenario('every footer page link resolves (HTTP 200)', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.$$eval('footer.ngd-footer a[href]', (as) =>
      [...new Set(as.map((a) => a.getAttribute('href')))]
    );
    const files = hrefs
      .filter((h) => h !== '#')
      .map((h) => h.split('#')[0].split('?')[0])
      .filter((h, i, arr) => h && arr.indexOf(h) === i);
    expect(files.length >= 10, 'link targets collected, got ' + files.length);
    for (const f of files) {
      const status = await head(`${SITE}/${f}`);
      expect(status === 200, `${f} resolves, got HTTP ${status}`);
    }
  });

  await scenario('link hover nudges right (small hover animation)', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const link = page.locator('.ngd-footer-links a').first();
    await link.scrollIntoViewIfNeeded();
    const before = await link.evaluate((el) => getComputedStyle(el).paddingLeft);
    await link.hover();
    await page.waitForTimeout(320);
    const after = await link.evaluate((el) => getComputedStyle(el).paddingLeft);
    expect(before !== after, `padding animates on hover (${before} → ${after})`);
  });

  await scenario('back-to-top appears on scroll and returns to the top', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const atTop = await page.$eval('.ngd-totop', (b) => b.classList.contains('is-visible'));
    expect(!atTop, 'hidden at the top of the page');
    await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
    await page.waitForFunction(() =>
      document.querySelector('.ngd-totop').classList.contains('is-visible'));
    await page.click('.ngd-totop');
    await page.waitForFunction(() => window.scrollY < 40, null, { timeout: 8000 });
    await page.waitForFunction(() =>
      !document.querySelector('.ngd-totop').classList.contains('is-visible'));
  });

  await scenario('back-to-top is instant under reduced motion', { reducedMotion: 'reduce' }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
    await page.waitForFunction(() =>
      document.querySelector('.ngd-totop').classList.contains('is-visible'));
    await page.click('.ngd-totop');
    await page.waitForTimeout(150);
    const y = await page.evaluate(() => window.scrollY);
    expect(y === 0, 'jumped straight to top, got y=' + y);
  });

  await scenario('desktop 1440: multi-column layout, no overflow', {}, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('.ngd-footer .ngd-footer-heading')]
        .map((h) => Math.round(h.getBoundingClientRect().left + window.scrollX));
      const tops = [...document.querySelectorAll('.ngd-footer .ngd-footer-heading')]
        .map((h) => Math.round(h.getBoundingClientRect().top + window.scrollY));
      return {
        distinctLefts: new Set(cols).size,
        distinctTops: new Set(tops).size,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.distinctLefts === 4 && state.distinctTops === 1,
      `4 link columns on one band, got ${state.distinctLefts} lefts / ${state.distinctTops} tops`);
    expect(state.scrollW <= state.clientW + 1, 'no overflow');
    await page.evaluate(() => document.querySelector('.ngd-footer').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'footer-desktop.png') });
  });

  await scenario('tablet 768 + mobile 390: stacked layouts, no overflow', {}, async (page) => {
    for (const vp of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await page.goto(SITE + '/index.html', { waitUntil: 'networkidle' });
      const state = await page.evaluate(() => {
        const tops = [...document.querySelectorAll('.ngd-footer .ngd-footer-heading')]
          .map((h) => Math.round(h.getBoundingClientRect().top + window.scrollY));
        return {
          rows: new Set(tops).size,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        };
      });
      if (vp.width === 768) {
        expect(state.rows === 1, `768: link columns share one band, got ${state.rows}`);
      } else {
        expect(state.rows === 2, `390: link columns stack two-across, got ${state.rows}`);
      }
      expect(state.scrollW <= state.clientW + 1, `${vp.width}: no overflow s=${state.scrollW}`);
    }
    await page.evaluate(() => document.querySelector('.ngd-footer').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'footer-mobile.png'), fullPage: false });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} footer scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
