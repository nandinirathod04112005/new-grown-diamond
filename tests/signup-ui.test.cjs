/* ============================================================
   Signup page UI tests (STEP 18).
   Verifies the premium split card with its ring art, all eight
   fields, both show/hide toggles, the password strength meter,
   the full validation matrix (email/mobile/min-8/match/terms),
   the no-role-selector security guard, the honest no-backend
   behaviour and responsive layouts at 1440/768/390.
   The mocked signup flows live in auth-flow.test.cjs.
   Run:  node tests/signup-ui.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const FIELD_IDS = ['reg-full-name', 'reg-company', 'reg-email', 'reg-phone',
  'reg-country', 'reg-password', 'reg-confirm', 'reg-terms'];

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
  await page.goto(`${SITE}/register.html`, { waitUntil: 'networkidle' });
}

async function fillValid(page) {
  await page.fill('#reg-full-name', 'Asha Verma');
  await page.fill('#reg-email', 'asha@example.com');
  await page.fill('#reg-phone', '+91 90000 00000');
  await page.selectOption('#reg-country', 'India');
  await page.fill('#reg-password', 'Brilliant#12');
  await page.fill('#reg-confirm', 'Brilliant#12');
  await page.check('#reg-terms');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('desktop split card: ring art, all eight fields, no role selector', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((ids) => {
      const side = document.querySelector('.ngd-auth-side');
      const main = document.querySelector('.ngd-auth-main');
      return {
        split: side.getBoundingClientRect().width > 200 &&
          main.getBoundingClientRect().left > side.getBoundingClientRect().right - 5,
        art: !!side.querySelector('.ngd-auth-art svg'),
        fields: ids.every((id) => !!document.getElementById(id)),
        labelled: ids.every((id) => !!document.querySelector(`label[for="${id}"]`)),
        countries: document.querySelectorAll('#reg-country option').length,
        toggles: document.querySelectorAll('.ngd-pass-toggle').length,
        strength: !!document.getElementById('reg-strength'),
        alertArea: !!document.getElementById('register-alert'),
        submit: document.getElementById('register-submit').textContent.trim(),
        loginLink: !!document.querySelector('.ngd-auth-main a[href="login.html"]'),
        termsLinks: [...document.querySelectorAll('.form-check-label a')].map((a) => a.getAttribute('href')),
        roleControls: document.querySelectorAll(
          'select[name*="role" i], input[name*="role" i], [id*="role" i]').length,
        shadow: getComputedStyle(document.querySelector('.ngd-auth-card')).boxShadow !== 'none',
      };
    }, FIELD_IDS);
    expect(state.split, 'split layout with the brand panel');
    expect(state.art, 'diamond ring visual on the brand panel');
    expect(state.fields && state.labelled, 'all eight labelled fields present');
    expect(state.countries >= 10, 'country choices, got ' + state.countries);
    expect(state.toggles === 2, 'show/hide toggle on both password fields');
    expect(state.strength, 'password strength meter present');
    expect(state.alertArea, 'backend/auth error area reserved');
    expect(/create account/i.test(state.submit), 'Create Account button');
    expect(state.loginLink, 'link back to login');
    expect(state.termsLinks.includes('terms.html') && state.termsLinks.includes('privacy.html'),
      'terms + privacy linked, got ' + state.termsLinks.join(','));
    expect(state.roleControls === 0, 'no admin/customer role selector anywhere');
    expect(state.shadow, 'soft card shadow');
  });

  await scenario('both password toggles flip independently with aria states', {}, async (page) => {
    await open(page);
    await page.fill('#reg-password', 'Brilliant#12');
    await page.fill('#reg-confirm', 'Brilliant#12');
    await page.click('#reg-toggle-password');
    let s = await page.evaluate(() => ({
      pass: document.getElementById('reg-password').type,
      confirm: document.getElementById('reg-confirm').type,
      pressed: document.getElementById('reg-toggle-password').getAttribute('aria-pressed'),
    }));
    expect(s.pass === 'text' && s.confirm === 'password',
      'only the password field revealed');
    expect(s.pressed === 'true', 'aria-pressed tracks the state');
    await page.click('#reg-toggle-confirm');
    s = await page.evaluate(() => ({
      confirm: document.getElementById('reg-confirm').type,
      validated: document.getElementById('ngd-register-form').classList.contains('was-validated'),
    }));
    expect(s.confirm === 'text', 'confirm toggle works too');
    expect(!s.validated, 'toggles never submit the form');
  });

  await scenario('strength meter: empty → weak → fair → strong, live updates', {}, async (page) => {
    await open(page);
    const level = () => page.evaluate(() => ({
      level: document.getElementById('reg-strength').getAttribute('data-level'),
      label: document.querySelector('#reg-strength .ngd-strength-label').textContent.trim(),
    }));
    let s = await level();
    expect(s.level === '0' && s.label === '', 'empty password shows no verdict');
    await page.fill('#reg-password', 'abc');
    s = await level();
    expect(s.level === '1' && s.label === 'Weak', 'short password reads Weak, got ' + s.label);
    await page.fill('#reg-password', 'abcdefgh');
    s = await level();
    expect(s.level === '2' && s.label === 'Fair', '8 plain chars read Fair, got ' + s.label);
    await page.fill('#reg-password', 'Brilliant#12Facet');
    s = await level();
    expect(s.level === '4' && s.label === 'Strong', 'long mixed password reads Strong, got ' + s.label);
  });

  await scenario('validation: empty submit flags every required field incl. terms', {}, async (page) => {
    await open(page);
    await page.click('#register-submit');
    const state = await page.evaluate(() => ({
      validated: document.getElementById('ngd-register-form').classList.contains('was-validated'),
      invalid: ['reg-full-name', 'reg-email', 'reg-phone', 'reg-country', 'reg-password', 'reg-confirm', 'reg-terms']
        .filter((id) => !document.getElementById(id).checkValidity()),
      companyOk: document.getElementById('reg-company').checkValidity(),
    }));
    expect(state.validated, 'validation styles applied');
    expect(state.invalid.length === 7, 'all required fields flagged, got ' + state.invalid.join(','));
    expect(state.companyOk, 'optional company not flagged');
  });

  await scenario('validation: email, mobile, min-8 and mismatch flagged specifically', {}, async (page) => {
    await open(page);
    await page.fill('#reg-full-name', 'Asha Verma');
    await page.fill('#reg-email', 'not-an-email');
    await page.fill('#reg-phone', 'abc');
    await page.selectOption('#reg-country', 'India');
    await page.fill('#reg-password', 'short');
    await page.fill('#reg-confirm', 'different');
    await page.check('#reg-terms');
    await page.click('#register-submit');
    let state = await page.evaluate(() => ({
      invalid: ['reg-email', 'reg-phone', 'reg-password', 'reg-confirm']
        .filter((id) => !document.getElementById(id).checkValidity()),
    }));
    expect(state.invalid.length === 4,
      'email/mobile/short-password/mismatch all flagged, got ' + state.invalid.join(','));
    await page.fill('#reg-password', 'Brilliant#12');
    await page.fill('#reg-confirm', 'Brilliant#12');
    state = await page.evaluate(() => ({
      confirmOk: document.getElementById('reg-confirm').checkValidity(),
    }));
    expect(state.confirmOk, 'matching passwords clear the mismatch');
  });

  await scenario('unchecked terms blocks an otherwise valid form', {}, async (page) => {
    await open(page);
    await fillValid(page);
    await page.uncheck('#reg-terms');
    await page.click('#register-submit');
    const state = await page.evaluate(() => ({
      termsInvalid: !document.getElementById('reg-terms').checkValidity(),
      alert: (document.querySelector('#register-alert .ngd-alert') || { textContent: '' }).textContent,
    }));
    expect(state.termsInvalid, 'terms checkbox flagged');
    expect(state.alert === '', 'submission never reached the backend stage');
  });

  await scenario('honest no-backend submit: warning, no fake account, stays put', {}, async (page) => {
    await open(page);
    await fillValid(page);
    await page.click('#register-submit');
    await page.waitForSelector('#register-alert .ngd-alert', { timeout: 5000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#register-alert .ngd-alert').textContent,
      warning: !!document.querySelector('#register-alert .ngd-alert-warning'),
      url: location.pathname,
      emailKept: document.getElementById('reg-email').value,
    }));
    expect(state.warning && /supabase-config\.js/i.test(state.alert),
      'honest not-configured warning, got: ' + state.alert);
    expect(!/account created|verify your email/i.test(state.alert),
      'no fake account-created message');
    expect(/register\.html$/.test(state.url), 'no fake redirect');
    expect(state.emailKept === 'asha@example.com', 'form not fake-reset');
  });

  await scenario('link back to login navigates', {}, async (page) => {
    await open(page);
    await page.click('.ngd-auth-main a[href="login.html"]');
    await page.waitForURL('**/login.html', { timeout: 8000 });
    const ok = await page.evaluate(() => !!document.getElementById('ngd-login-form'));
    expect(ok, 'login form renders');
  });

  await scenario('mobile 390: single column, full-width fields, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const side = document.querySelector('.ngd-auth-side');
      const name = document.getElementById('reg-full-name').getBoundingClientRect();
      const pass = document.getElementById('reg-password').getBoundingClientRect();
      const confirm = document.getElementById('reg-confirm').getBoundingClientRect();
      return {
        sideHidden: getComputedStyle(side).display === 'none',
        nameW: name.width,
        stackedPasswords: pass.bottom <= confirm.top + 1,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(state.sideHidden, 'decorative brand panel hidden on mobile');
    expect(state.nameW > 250, 'full-width inputs');
    expect(state.stackedPasswords, 'password fields stack in one column');
    expect(state.scrollW <= state.clientW + 1, `no overflow s=${state.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'signup-ui-mobile.png') });
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
      sideBySide: (() => {
        const pass = document.getElementById('reg-password').getBoundingClientRect();
        const confirm = document.getElementById('reg-confirm').getBoundingClientRect();
        return confirm.left > pass.right;
      })(),
    }));
    expect(o.split, 'split panel returns at 1440');
    expect(o.sideBySide, 'password + confirm side by side on desktop');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'signup-ui-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} signup-ui scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
