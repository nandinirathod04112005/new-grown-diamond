/* ============================================================
   Login page UI tests (STEP 17).
   Verifies the premium split card (brand panel with diamond
   art + form side), the show/hide password toggle, the
   remember-me email prefill, the honest forgot-password
   notice, validation states, the no-fake-success guarantee
   and responsive behaviour at 1440/768/390.
   The deeper auth flows (role redirects, suspended accounts,
   mocked Supabase) live in auth-flow.test.cjs.
   Run:  node tests/login-ui.test.cjs
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
  await page.goto(`${SITE}/login.html`, { waitUntil: 'networkidle' });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('desktop split card: brand panel with diamond art, complete form side', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const side = document.querySelector('.ngd-auth-side');
      const main = document.querySelector('.ngd-auth-main');
      const sideBox = side.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      const card = document.querySelector('.ngd-auth-card');
      return {
        splitVisible: sideBox.width > 200 && mainBox.left > sideBox.left + sideBox.width - 5,
        art: !!side.querySelector('.ngd-auth-art svg'),
        brand: /New Grown Diamond/.test(side.textContent),
        shadow: getComputedStyle(card).boxShadow !== 'none',
        controls: {
          email: !!document.getElementById('login-email'),
          password: !!document.getElementById('login-password'),
          toggle: !!document.getElementById('login-toggle-password'),
          remember: !!document.getElementById('login-remember'),
          forgot: !!document.getElementById('login-forgot'),
          submit: !!document.getElementById('login-submit'),
          signup: !!document.querySelector('.ngd-auth-main a[href="register.html"]'),
          alertArea: !!document.getElementById('login-alert'),
        },
        labels: ['login-email', 'login-password'].every((id) =>
          !!document.querySelector(`label[for="${id}"]`)),
      };
    });
    expect(state.splitVisible, 'split layout: brand panel beside the form');
    expect(state.art, 'diamond visual on the brand panel');
    expect(state.brand, 'brand name on the panel');
    expect(state.shadow, 'soft card shadow');
    Object.entries(state.controls).forEach(([k, v]) => expect(v, `${k} present`));
    expect(state.labels, 'fields are labelled');
  });

  await scenario('show/hide password toggle flips the field without submitting', {}, async (page) => {
    await open(page);
    await page.fill('#login-password', 'secret-pass');
    let s = await page.evaluate(() => ({
      type: document.getElementById('login-password').type,
      pressed: document.getElementById('login-toggle-password').getAttribute('aria-pressed'),
      label: document.getElementById('login-toggle-password').getAttribute('aria-label'),
    }));
    expect(s.type === 'password' && s.pressed === 'false' && /show/i.test(s.label),
      'starts hidden with Show label');
    await page.click('#login-toggle-password');
    s = await page.evaluate(() => ({
      type: document.getElementById('login-password').type,
      pressed: document.getElementById('login-toggle-password').getAttribute('aria-pressed'),
      label: document.getElementById('login-toggle-password').getAttribute('aria-label'),
      validated: document.getElementById('ngd-login-form').classList.contains('was-validated'),
      value: document.getElementById('login-password').value,
    }));
    expect(s.type === 'text' && s.pressed === 'true' && /hide/i.test(s.label),
      'reveals the password with Hide label');
    expect(!s.validated, 'toggle is not a submit — no validation triggered');
    expect(s.value === 'secret-pass', 'value untouched');
    await page.click('#login-toggle-password');
    s = await page.evaluate(() => ({ type: document.getElementById('login-password').type }));
    expect(s.type === 'password', 'second click hides it again');
  });

  await scenario('remember me: stores the email only, prefills after reload', {}, async (page) => {
    await open(page);
    await page.fill('#login-email', 'asha@example.com');
    await page.fill('#login-password', 'secret-pass');
    await page.check('#login-remember');
    await page.click('#login-submit');
    await page.waitForSelector('#login-alert .ngd-alert', { timeout: 5000 });
    const stored = await page.evaluate(() => ({
      email: localStorage.getItem('ngd_login_email'),
      keys: Object.keys(localStorage),
    }));
    expect(stored.email === 'asha@example.com', 'email remembered, got ' + stored.email);
    expect(!stored.keys.some((k) => /pass|role/i.test(k)), 'never stores password or role');
    await page.reload({ waitUntil: 'networkidle' });
    const after = await page.evaluate(() => ({
      email: document.getElementById('login-email').value,
      checked: document.getElementById('login-remember').checked,
      password: document.getElementById('login-password').value,
    }));
    expect(after.email === 'asha@example.com' && after.checked, 'email prefilled + box checked');
    expect(after.password === '', 'password never prefilled');
  });

  await scenario('remember me unchecked: submit clears the stored email', {}, async (page) => {
    await open(page);
    await page.evaluate(() => localStorage.setItem('ngd_login_email', 'old@example.com'));
    await page.reload({ waitUntil: 'networkidle' });
    let prefilled = await page.evaluate(() => document.getElementById('login-email').value);
    expect(prefilled === 'old@example.com', 'stored email prefilled on load');
    await page.uncheck('#login-remember');
    await page.fill('#login-password', 'secret-pass');
    await page.click('#login-submit');
    await page.waitForSelector('#login-alert .ngd-alert', { timeout: 5000 });
    const stored = await page.evaluate(() => localStorage.getItem('ngd_login_email'));
    expect(stored === null, 'stored email cleared, got ' + stored);
  });

  await scenario('forgot password: honest notice, no fake reset, no navigation', {}, async (page) => {
    await open(page);
    await page.click('#login-forgot');
    const state = await page.evaluate(() => ({
      alert: (document.querySelector('#login-alert .ngd-alert') || { textContent: '' }).textContent,
      info: !!document.querySelector('#login-alert .ngd-alert-info'),
      url: location.pathname,
    }));
    expect(state.info, 'informational notice shown');
    expect(/upcoming release/i.test(state.alert) && /contact/i.test(state.alert),
      'notice says the reset flow is coming and offers the contact route, got: ' + state.alert);
    expect(!/reset link sent|check your inbox/i.test(state.alert), 'no fake reset behaviour');
    expect(/login\.html$/.test(state.url), 'stays on the login page');
  });

  await scenario('validation: empty and malformed input flagged, no fake success', {}, async (page) => {
    await open(page);
    await page.click('#login-submit');
    let state = await page.evaluate(() => ({
      validated: document.getElementById('ngd-login-form').classList.contains('was-validated'),
      emailInvalid: !document.getElementById('login-email').checkValidity(),
      passInvalid: !document.getElementById('login-password').checkValidity(),
    }));
    expect(state.validated, 'validation styles applied');
    expect(state.emailInvalid && state.passInvalid, 'both required fields flagged');
    await page.fill('#login-email', 'not-an-email');
    await page.fill('#login-password', 'x');
    await page.click('#login-submit');
    state = await page.evaluate(() => ({
      emailInvalid: !document.getElementById('login-email').checkValidity(),
      alert: (document.querySelector('#login-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.emailInvalid, 'bad email format flagged');
    expect(!/welcome|success/i.test(state.alert), 'no success wording ever');
  });

  await scenario('unconfigured Supabase: valid submit warns honestly, stays put', {}, async (page) => {
    await open(page);
    await page.fill('#login-email', 'asha@example.com');
    await page.fill('#login-password', 'secret-pass');
    await page.click('#login-submit');
    await page.waitForSelector('#login-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#login-alert .ngd-alert').textContent,
      warning: !!document.querySelector('#login-alert .ngd-alert-warning'),
      url: location.pathname,
    }));
    expect(state.warning && /supabase-config\.js/i.test(state.alert),
      'honest not-configured warning, got: ' + state.alert);
    expect(/login\.html$/.test(state.url), 'no fake redirect to a dashboard');
  });

  await scenario('signup link navigates to the register page', {}, async (page) => {
    await open(page);
    await page.click('.ngd-auth-main a[href="register.html"]');
    await page.waitForURL('**/register.html', { timeout: 8000 });
    const hasForm = await page.evaluate(() => !!document.querySelector('form'));
    expect(hasForm, 'register page renders its form');
  });

  await scenario('mobile 390: single column, reachable button, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const side = document.querySelector('.ngd-auth-side');
      const submit = document.getElementById('login-submit').getBoundingClientRect();
      return {
        sideHidden: getComputedStyle(side).display === 'none',
        submitW: submit.width,
        submitVisible: submit.top < window.innerHeight * 2,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        toggleBox: document.getElementById('login-toggle-password').getBoundingClientRect().width,
      };
    });
    expect(state.sideHidden, 'decorative brand panel hidden on mobile');
    expect(state.submitW > 250, 'full-width login button');
    expect(state.submitVisible, 'login button within easy reach');
    expect(state.toggleBox >= 40, 'touch-sized password toggle');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'login-ui-mobile.png') });
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
    await page.screenshot({ path: path.join(SCREEN_DIR, 'login-ui-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} login-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
