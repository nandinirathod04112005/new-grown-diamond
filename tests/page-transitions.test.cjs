/* ============================================================
   Page-to-page transition tests.
   The shared cinematic navigation layer: internal public links
   run a short leave (content dip + dark veil + light line +
   diamond mark) and then a NORMAL browser navigation; arriving
   pages play a sub-second intro. Everything else must pass
   through untouched — external origins, WhatsApp, mailto/tel,
   downloads, new tabs, modified clicks, in-page anchors, auth
   and admin URLs — and under prefers-reduced-motion the module
   stands down entirely. Browser back always lands clean.
   Run:  node tests/page-transitions.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://cine-pt.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };

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
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript', body: TEST_CONFIG,
    }));
    await context.route(SB_HOST + '/**', (r) => {
      if (r.request().method() === 'OPTIONS') {
        return r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': '*/0' }, body: '[]' });
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

async function open(page, file) {
  await page.goto(`${SITE}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDPageTransitions);
}

/** Dispatch a real bubbling click on a synthetic link, but stop the
    browser from actually navigating: a listener registered AFTER the
    module's own reads the module's verdict, then cancels the event. */
function probeLink(page, attrs) {
  return page.evaluate((a) => {
    const link = document.createElement('a');
    Object.entries(a).forEach(([k, v]) => link.setAttribute(k, v));
    link.textContent = 'probe';
    document.body.appendChild(link);
    let verdict = null;
    const guard = (ev) => { verdict = ev.defaultPrevented; ev.preventDefault(); };
    document.addEventListener('click', guard);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document.removeEventListener('click', guard);
    link.remove();
    return verdict;
  }, attrs);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('the transition module arms on every public page', {}, async (page) => {
    for (const [file, slug] of [['index.html', 'home'], ['education.html', 'education'], ['compare-diamonds.html', 'compare']]) {
      await open(page, file);
      const st = await page.evaluate(() => ({
        enabled: window.NGDPageTransitions.state.enabled,
        duration: window.NGDPageTransitions.DURATION,
        overlay: !!document.querySelector('.ngd-pt-overlay .ngd-pt-line') &&
                 !!document.querySelector('.ngd-pt-overlay .ngd-pt-mark'),
        slug: document.body.getAttribute('data-ngd-page'),
      }));
      expect(st.enabled, file + ' transitions enabled');
      expect(st.duration >= 450 && st.duration <= 800, 'duration within the 450–800ms window');
      expect(st.overlay, file + ' overlay with light line + diamond mark built');
      expect(st.slug === slug, file + ' page slug is ' + slug + ', got ' + st.slug);
    }
  });

  await scenario('an internal link runs the cinematic leave, then really navigates', {}, async (page) => {
    await open(page, 'index.html');
    const t0 = Date.now();
    await page.click('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]');
    const mid = await page.evaluate(() => ({
      overlay: document.querySelector('.ngd-pt-overlay').classList.contains('is-active'),
      leaving: document.body.classList.contains('ngd-pt-leaving'),
      count: window.NGDPageTransitions.state.intercepted,
    }));
    expect(mid.overlay && mid.leaving, 'overlay + content dip active right after the click');
    expect(mid.count === 1, 'exactly one interception recorded');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
    const elapsed = Date.now() - t0;
    expect(elapsed >= 480, 'navigation held for the leave animation, elapsed=' + elapsed);
    expect(elapsed < 5000, 'navigation not excessively delayed, elapsed=' + elapsed);
  });

  await scenario('the arriving page plays its sub-second intro and settles clean', {}, async (page) => {
    await open(page, 'index.html');
    await page.click('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
    await page.waitForFunction(() => !!window.NGDPageTransitions);
    const slug = await page.evaluate(() => document.body.getAttribute('data-ngd-page'));
    expect(slug === 'diamonds', 'arrival page identity set');
    /* the intro class must clear within ~1s so nothing lingers */
    await page.waitForFunction(() => !document.body.classList.contains('ngd-pt-enter'), null, { timeout: 2500 });
    const clean = await page.evaluate(() => ({
      overlay: document.querySelector('.ngd-pt-overlay').classList.contains('is-active'),
      leaving: document.body.classList.contains('ngd-pt-leaving'),
      mainOpacity: getComputedStyle(document.querySelector('main')).opacity,
    }));
    expect(!clean.overlay && !clean.leaving, 'no leave state on the new page');
    expect(clean.mainOpacity === '1', 'content fully visible after the intro');
  });

  await scenario('external, WhatsApp, mailto, tel and hash links are never intercepted', {}, async (page) => {
    await open(page, 'index.html');
    for (const href of ['https://example.com/x', 'https://wa.me/911234567890', 'mailto:hello@example.com', 'tel:+911234567890', '#site-footer']) {
      const verdict = await probeLink(page, { href });
      expect(verdict === false, href + ' passed through, verdict=' + verdict);
    }
    expect(await page.evaluate(() => window.NGDPageTransitions.state.intercepted) === 0, 'no interceptions recorded');
  });

  await scenario('downloads, new tabs and modified clicks keep native behaviour', {}, async (page) => {
    await open(page, 'index.html');
    expect((await probeLink(page, { href: 'diamonds.html', download: '' })) === false, 'download link untouched');
    expect((await probeLink(page, { href: 'diamonds.html', target: '_blank' })) === false, 'new-tab link untouched');
    const ctrl = await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = 'diamonds.html';
      document.body.appendChild(link);
      let verdict = null;
      const guard = (ev) => { verdict = ev.defaultPrevented; ev.preventDefault(); };
      document.addEventListener('click', guard);
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
      document.removeEventListener('click', guard);
      link.remove();
      return verdict;
    });
    expect(ctrl === false, 'ctrl-click untouched');
  });

  await scenario('auth, account and admin URLs are off the transition whitelist', {}, async (page) => {
    await open(page, 'index.html');
    for (const href of ['login.html', 'register.html', 'account/dashboard.html', 'admin/dashboard.html']) {
      const verdict = await probeLink(page, { href });
      expect(verdict === false, href + ' navigates natively, verdict=' + verdict);
    }
  });

  await scenario('the whitelist works end-to-end: compare page transitions in', {}, async (page) => {
    await open(page, 'index.html');
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = 'compare-diamonds.html';
      link.id = 'pt-probe-compare';
      link.textContent = 'compare';
      document.body.appendChild(link);
      link.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.click('#pt-probe-compare');
    const active = await page.evaluate(() => document.querySelector('.ngd-pt-overlay').classList.contains('is-active'));
    expect(active, 'overlay ran for the compare page');
    await page.waitForURL('**/compare-diamonds.html', { timeout: 8000 });
  });

  await scenario('double-clicking a link schedules exactly one navigation', {}, async (page) => {
    await open(page, 'index.html');
    /* the page navigates 520ms after the first click — record the final
       interception count at pagehide so slow frames can't outrun the read */
    await page.evaluate(() => {
      window.addEventListener('pagehide', () => {
        try {
          sessionStorage.setItem('ngd-pt-count', String(window.NGDPageTransitions.state.intercepted));
        } catch (e) { /* ignore */ }
      });
    });
    const link = page.locator('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]');
    await link.click();
    await link.click({ force: true }).catch(() => {});
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
    const count = await page.evaluate(() => sessionStorage.getItem('ngd-pt-count'));
    expect(count === '1', 'second click swallowed while leaving, count=' + count);
  });

  await scenario('reduced motion: no overlay, no delay, functionality identical', { reducedMotion: 'reduce' }, async (page) => {
    await open(page, 'index.html');
    const st = await page.evaluate(() => ({
      enabled: window.NGDPageTransitions.state.enabled,
      reduced: window.NGDPageTransitions.state.reduced,
      overlay: !!document.querySelector('.ngd-pt-overlay'),
      enterClass: document.body.classList.contains('ngd-pt-enter'),
    }));
    expect(!st.enabled && st.reduced, 'module stood down');
    expect(!st.overlay, 'no overlay built');
    expect(!st.enterClass, 'no intro class applied');
    await page.click('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
    const count = await page.evaluate(() =>
      window.NGDPageTransitions ? window.NGDPageTransitions.state.intercepted : 0);
    expect(count === 0, 'native navigation, nothing intercepted');
  });

  await scenario('browser back lands on a clean, interactive page', {}, async (page) => {
    await open(page, 'index.html');
    await page.click('.ngd-hero a.ngd-btn-gold[href="diamonds.html"]');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
    await page.goBack();
    await page.waitForURL('**/index.html', { timeout: 8000 });
    await page.waitForFunction(() => !!window.NGDPageTransitions, null, { timeout: 4000 });
    await page.waitForFunction(() => !document.body.classList.contains('ngd-pt-enter'), null, { timeout: 2500 });
    const st = await page.evaluate(() => ({
      leaving: document.body.classList.contains('ngd-pt-leaving'),
      overlay: document.querySelector('.ngd-pt-overlay').classList.contains('is-active'),
      mainOpacity: getComputedStyle(document.querySelector('main, .ngd-hero')).opacity,
      heroCta: !!document.querySelector('.ngd-hero a.ngd-btn-gold'),
    }));
    expect(!st.leaving && !st.overlay, 'no stale transition state after back');
    expect(st.mainOpacity === '1', 'content fully visible after back');
    expect(st.heroCta, 'page interactive after back');
  });

  await scenario('an in-page anchor scrolls without waking the overlay', {}, async (page) => {
    await open(page, 'index.html');
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '#site-footer';
      link.id = 'pt-probe-hash';
      link.textContent = 'to footer';
      document.querySelector('.ngd-hero .container').appendChild(link);
    });
    await page.click('#pt-probe-hash');
    await page.waitForFunction(() => location.hash === '#site-footer', null, { timeout: 3000 });
    const st = await page.evaluate(() => ({
      overlay: document.querySelector('.ngd-pt-overlay').classList.contains('is-active'),
      count: window.NGDPageTransitions.state.intercepted,
      samePage: location.pathname.endsWith('index.html'),
    }));
    expect(!st.overlay && st.count === 0, 'hash navigation untouched');
    expect(st.samePage, 'still on the homepage');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} page-transition scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
