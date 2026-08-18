/* ============================================================
   Forgot Password page UI tests (STEP 19).
   Verifies the premium split card with the loupe art, the
   title + instruction copy, the email field with validation,
   the Send Reset Link button, the real Supabase request behaviour,
   privacy-safe messaging, the back-to-login
   link, the login-page integration and responsive layouts
   at 1440/768/390.
   Run:  node tests/forgot-ui.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const results = [];
let browser;
let SITE;
let recoveryCalls = [];

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: "window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'https://forgot-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};",
    }));
    await context.route('https://forgot-test.supabase.co/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      recoveryCalls.push({ url: request.url(), body: request.postDataJSON() });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
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
  await page.goto(`${SITE}/forgot-password.html`, { waitUntil: 'networkidle' });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('split card: loupe art, title, instruction, field, button, links, alert area', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const side = document.querySelector('.ngd-auth-side');
      const main = document.querySelector('.ngd-auth-main');
      return {
        split: side.getBoundingClientRect().width > 200 &&
          main.getBoundingClientRect().left > side.getBoundingClientRect().right - 5,
        art: !!side.querySelector('.ngd-auth-art svg'),
        title: main.querySelector('h1').textContent.trim(),
        instruction: main.querySelector('p.ngd-text-muted').textContent.trim().length,
        email: !!document.getElementById('forgot-email'),
        labelled: !!document.querySelector('label[for="forgot-email"]'),
        submit: document.getElementById('forgot-submit').textContent.trim(),
        alertArea: !!document.getElementById('forgot-alert'),
        loginLink: !!main.querySelector('a[href="login.html"]'),
        shadow: getComputedStyle(document.querySelector('.ngd-auth-card')).boxShadow !== 'none',
        hasBackendScripts: [...document.querySelectorAll('script[src]')]
          .some((s) => /supabase/i.test(s.getAttribute('src'))),
      };
    });
    expect(state.split, 'split layout with the brand panel');
    expect(state.art, 'diamond loupe visual on the brand panel');
    expect(/reset your password/i.test(state.title), 'page title, got ' + state.title);
    expect(state.instruction > 40, 'short instruction text present');
    expect(state.email && state.labelled, 'labelled email field');
    expect(state.submit === 'Send Reset Link', 'button label, got ' + state.submit);
    expect(state.alertArea, 'dedicated message area reserved');
    expect(state.loginLink, 'back-to-login link present');
    expect(state.shadow, 'soft card shadow');
    expect(state.hasBackendScripts, 'Supabase Auth scripts loaded');
  });

  await scenario('validation: empty and malformed email flagged, nothing shown as sent', {}, async (page) => {
    await open(page);
    await page.click('#forgot-submit');
    let state = await page.evaluate(() => ({
      validated: document.getElementById('ngd-forgot-form').classList.contains('was-validated'),
      invalid: !document.getElementById('forgot-email').checkValidity(),
      alert: (document.querySelector('#forgot-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.validated && state.invalid, 'required email flagged');
    expect(state.alert === '', 'no message while the form is invalid');
    await page.fill('#forgot-email', 'not-an-email');
    await page.click('#forgot-submit');
    state = await page.evaluate(() => ({
      invalid: !document.getElementById('forgot-email').checkValidity(),
      alert: (document.querySelector('#forgot-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.invalid, 'bad email format flagged');
    expect(state.alert === '', 'still no message on invalid input');
  });

  await scenario('submit: Supabase receives request and UI uses privacy-safe success', {}, async (page) => {
    recoveryCalls = [];
    await open(page);
    await page.fill('#forgot-email', 'asha@example.com');
    await page.click('#forgot-submit');
    await page.waitForSelector('#forgot-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#forgot-alert .ngd-alert').textContent,
      success: !!document.querySelector('#forgot-alert .ngd-alert-success'),
      url: location.pathname,
      emailCleared: document.getElementById('forgot-email').value,
    }));
    expect(state.success, 'success alert shown only after accepted request');
    expect(state.alert.trim() === 'If this email is registered, a password reset link has been sent.',
      'privacy-safe message, got: ' + state.alert);
    expect(recoveryCalls.length === 1 && /\/auth\/v1\/recover/.test(recoveryCalls[0].url), 'Supabase recovery endpoint called once');
    expect(recoveryCalls[0].body.email === 'asha@example.com', 'email sent to Supabase');
    expect(/reset-password\.html/.test(recoveryCalls[0].body.redirect_to), 'recovery redirects to reset page');
    expect(/forgot-password\.html$/.test(state.url), 'stays on the page');
    expect(state.emailCleared === '', 'email field cleared after accepted request');
  });

  await scenario('back-to-login link navigates', {}, async (page) => {
    await open(page);
    await page.click('.ngd-auth-main a[href="login.html"]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
    const ok = await page.evaluate(() => !!document.getElementById('ngd-login-form'));
    expect(ok, 'login form renders');
  });

  await scenario('login page links here via Forgot password?', {}, async (page) => {
    await page.goto(`${SITE}/login.html`, { waitUntil: 'networkidle' });
    const href = await page.getAttribute('#login-forgot', 'href');
    expect(href === 'forgot-password.html', 'login link targets the reset page, got ' + href);
    await page.click('#login-forgot');
    await page.waitForURL('**/forgot-password.html', { timeout: 8000 });
  });

  await scenario('mobile 390: single column, compact form, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const side = document.querySelector('.ngd-auth-side');
      const email = document.getElementById('forgot-email').getBoundingClientRect();
      const submit = document.getElementById('forgot-submit').getBoundingClientRect();
      return {
        sideHidden: getComputedStyle(side).display === 'none',
        emailW: email.width,
        submitVisible: submit.bottom <= window.innerHeight,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.sideHidden, 'decorative brand panel hidden on mobile');
    expect(state.emailW > 250, 'full-width email field');
    expect(state.submitVisible, 'compact form — button visible without scrolling');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'forgot-ui-mobile.png') });
  });

  await scenario('tablet 768 and desktop 1440: card settles, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
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
      split: document.querySelector('.ngd-auth-side').getBoundingClientRect().width > 200,
    }));
    expect(o.split, 'split panel returns at 1440');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'forgot-ui-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} forgot-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
