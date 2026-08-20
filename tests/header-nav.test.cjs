/* ============================================================
   Header + mobile navigation tests (PROMPT 2).
   Verifies the sticky glass header, desktop dropdown, login
   button, hamburger and the offcanvas mobile menu on every
   public page, at desktop / tablet / mobile widths.
   Run:  node tests/header-nav.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const PAGES = ['index.html', 'diamonds.html', 'diamond-details.html', 'jewellery.html', 'jewellery-details.html', 'manufacturing.html', 'styleguide.html'];
const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, viewport, fn) {
  const context = await browser.newContext({ viewport });
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

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 834, height: 1112 };
const MOBILE = { width: 390, height: 844 };

async function openMenu(page) {
  await page.click('.ngd-burger-btn');
  await page.waitForSelector('.ngd-mobile-menu.show', { timeout: 4000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('desktop: header sticky, nav visible, burger hidden (all pages)', DESKTOP, async (page) => {
    for (const p of PAGES) {
      await page.goto(`${SITE}/${p}`, { waitUntil: 'networkidle' });
      const state = await page.evaluate(() => ({
        position: getComputedStyle(document.querySelector('.ngd-navbar')).position,
        burgerVisible: !!document.querySelector('.ngd-burger-btn').offsetParent,
        navLinks: [...document.querySelectorAll('.ngd-nav .nav-link')].map((a) => a.textContent.trim()),
        loginHref: (document.querySelector('.ngd-navbar a[href="login.html"]') || {}).textContent,
      }));
      expect(state.position === 'sticky', `[${p}] header sticky, got ${state.position}`);
      expect(!state.burgerVisible, `[${p}] burger hidden on desktop`);
      expect(state.navLinks.includes('Home') && state.navLinks.includes('Collections'),
        `[${p}] nav links present, got ${state.navLinks.join(',')}`);
      expect(!!state.loginHref, `[${p}] login button present`);
    }
  });

  /* Short viewport so the (compact) landing page actually scrolls */
  await scenario('desktop: glass appears on scroll (index)', { width: 1440, height: 480 }, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    const before = await page.$eval('.ngd-navbar', (n) => n.classList.contains('is-scrolled'));
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(250);
    const after = await page.$eval('.ngd-navbar', (n) => n.classList.contains('is-scrolled'));
    expect(!before && after, `glass toggles: before=${before} after=${after}`);
  });

  await scenario('desktop: Collections dropdown opens, closes on outside click', DESKTOP, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('#navCollections');
    await page.waitForSelector('.ngd-nav .dropdown-menu.show', { timeout: 4000 });
    const items = await page.$$eval('.ngd-nav .dropdown-menu.show .dropdown-item', (els) =>
      els.map((e) => e.textContent.trim())
    );
    expect(items.some((t) => t.startsWith('Diamonds')) && items.some((t) => t.startsWith('Jewellery')),
      'dropdown lists Diamonds + Jewellery, got ' + items.join(' | '));
    await page.screenshot({ path: path.join(SCREEN_DIR, 'header-dropdown-desktop.png') });
    await page.mouse.click(60, 400);
    await page.waitForFunction(() => !document.querySelector('.ngd-nav .dropdown-menu.show'));
    const expanded = await page.getAttribute('#navCollections', 'aria-expanded');
    expect(expanded === 'false', 'aria-expanded reset after close');
  });

  await scenario('desktop: dropdown item navigates to diamonds.html', DESKTOP, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('#navCollections');
    await page.waitForSelector('.ngd-nav .dropdown-menu.show');
    await page.click('.ngd-nav .dropdown-menu.show a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('desktop: login button navigates to login.html', DESKTOP, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('.ngd-navbar .d-lg-flex a[href="login.html"]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
  });

  await scenario('tablet: burger shown, desktop nav hidden', TABLET, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      burgerVisible: !!document.querySelector('.ngd-burger-btn').offsetParent,
      navVisible: !!document.querySelector('.ngd-navbar .d-lg-flex').offsetParent,
    }));
    expect(state.burgerVisible, 'burger visible at 834px');
    expect(!state.navVisible, 'desktop nav hidden at 834px');
  });

  await scenario('mobile: menu opens with animation, burger morphs to X', MOBILE, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => !!document.querySelector('.ngd-burger-btn').offsetParent), 'burger visible');
    await openMenu(page);
    expect(await page.$eval('.ngd-burger-btn', (b) => b.classList.contains('is-open')), 'burger has is-open');
    expect((await page.getAttribute('.ngd-burger-btn', 'aria-expanded')) === 'true', 'aria-expanded true');
    /* staggered items finish their entrance (opacity animates to 1) */
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('.ngd-mobile-menu .ngd-menu-item');
      return [...items].every((el) => parseFloat(getComputedStyle(el).opacity) > 0.95);
    }, null, { timeout: 4000 });
    const links = await page.$$eval('.ngd-mobile-menu a[href]', (els) => els.map((a) => a.getAttribute('href')));
    for (const href of ['index.html', 'diamonds.html', 'jewellery.html', 'login.html', 'register.html']) {
      expect(links.includes(href), 'mobile menu contains ' + href);
    }
    await page.screenshot({ path: path.join(SCREEN_DIR, 'header-mobile-menu.png') });
  });

  await scenario('mobile: close button smoothly closes the menu', MOBILE, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await openMenu(page);
    await page.click('.ngd-mobile-close');
    await page.waitForFunction(() => !document.querySelector('.ngd-mobile-menu').classList.contains('show'));
    await page.waitForFunction(() => !document.querySelector('.ngd-burger-btn').classList.contains('is-open'));
    expect((await page.getAttribute('.ngd-burger-btn', 'aria-expanded')) === 'false', 'aria-expanded false');
  });

  await scenario('mobile: Escape key closes the menu', MOBILE, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await openMenu(page);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.ngd-mobile-menu').classList.contains('show'));
  });

  await scenario('mobile: backdrop tap closes the menu', MOBILE, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await openMenu(page);
    await page.mouse.click(15, 420); // left of the right-side panel = backdrop
    await page.waitForFunction(() => !document.querySelector('.ngd-mobile-menu').classList.contains('show'));
  });

  await scenario('mobile: menu link navigates (Diamonds)', MOBILE, async (page) => {
    await page.goto(`${SITE}/index.html`, { waitUntil: 'networkidle' });
    await openMenu(page);
    await page.click('.ngd-mobile-menu a[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('all pages: no horizontal overflow at any width', DESKTOP, async (page) => {
    for (const vp of [DESKTOP, TABLET, MOBILE]) {
      await page.setViewportSize(vp);
      for (const p of PAGES) {
        await page.goto(`${SITE}/${p}`, { waitUntil: 'networkidle' });
        const o = await page.evaluate(() => ({
          s: document.documentElement.scrollWidth,
          c: document.documentElement.clientWidth,
        }));
        expect(o.s <= o.c + 1, `[${vp.width}px ${p}] overflow s=${o.s} c=${o.c}`);
      }
    }
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} header scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
