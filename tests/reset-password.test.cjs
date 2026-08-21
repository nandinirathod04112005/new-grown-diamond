'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');
/* The fragment-template scenario builds a ConfirmationURL on the project
   origin from the committed config; the network itself is always stubbed. */
const SB_ORIGIN = (fs.readFileSync(path.join(__dirname, '..', 'assets/js/supabase-config.js'), 'utf8')
  .match(/SUPABASE_URL:\s*'([^']+)'/) || [])[1] || 'https://example.supabase.co';
const results = [];
let browser;
let SITE;
function expect(condition, message) { if (!condition) throw new Error('Expectation failed: ' + message); }
async function scenario(name, fn) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-client.js', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `window.NGD_SITE_ROOT=new URL('./',location.href).href;
        window.__updates=[]; window.__recoverySession=null; window.__verifies=[];
        window.__initialSearch=location.search; window.__initialHash=location.hash;
        window.ngdSupabase={auth:{
          onAuthStateChange:function(cb){setTimeout(function(){if(new URLSearchParams(location.search).has('valid')){window.__recoverySession={user:{id:'user-1'},access_token:'recovery-token',expires_at:Math.floor(Date.now()/1000)+3600};cb('PASSWORD_RECOVERY',window.__recoverySession);}},20);return {data:{subscription:{unsubscribe:function(){}}}}},
          getSession:async function(){return {data:{session:window.__recoverySession},error:null}},
          verifyOtp:async function(args){window.__verifies.push(args);
            if(args.token_hash!=='th_GOODTOKEN'){return {data:{session:null},error:{message:'Token has expired or is invalid',status:403}}}
            window.__recoverySession={user:{id:'user-1'},access_token:'recovery-token',expires_at:Math.floor(Date.now()/1000)+3600};
            return {data:{session:window.__recoverySession},error:null}},
          updateUser:async function(payload){window.__updates.push(payload);return {data:{user:{id:'user-1'}},error:null}},
          signOut:async function(){return {error:null}}
        }};`,
    }));
    const page = await context.newPage();
    await fn(page);
    results.push({ name, ok: true }); console.log('PASS  ' + name);
  } catch (error) {
    results.push({ name, ok: false }); console.log('FAIL  ' + name + '\n      ' + String(error).split('\n')[0]);
  } finally { await context.close(); }
}
(async () => {
  const started = await startServer(); SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());
  await scenario('invalid or missing recovery session is rejected safely', async (page) => {
    await page.goto(SITE + '/reset-password.html');
    await page.waitForSelector('#reset-invalid:not([hidden])', { timeout: 4000 });
    expect(await page.textContent('#reset-invalid') === null ? false : /invalid or has expired/i.test(await page.textContent('#reset-invalid')), 'safe invalid-link copy');
    expect(await page.getAttribute('#reset-invalid a', 'href') === 'forgot-password.html', 'new-link action returns to forgot page');
    expect(await page.isHidden('#ngd-reset-form'), 'password form remains unavailable');
  });
  await scenario('recovery session enables controls and validates passwords', async (page) => {
    await page.goto(SITE + '/reset-password.html?valid=1');
    await page.waitForSelector('#ngd-reset-form:not([hidden])');
    await page.fill('#reset-password', 'short');
    await page.fill('#reset-confirm', 'different');
    await page.click('#reset-submit');
    expect((await page.evaluate(() => window.__updates.length)) === 0, 'short/mismatched password not submitted');
    expect(await page.getAttribute('#reset-strength', 'data-level') === '1', 'strength meter updates');
    await page.fill('#reset-password', 'NewSecure#123');
    await page.fill('#reset-confirm', 'NewSecure#123');
    await page.click('.ngd-pass-toggle[aria-controls="reset-password"]');
    expect(await page.getAttribute('#reset-password', 'type') === 'text', 'show/hide control works');
    await page.click('#reset-submit');
    await page.waitForFunction(() => window.__updates.length === 1);
    expect(await page.evaluate(() => window.__updates[0].password === 'NewSecure#123'), 'password passed directly to updateUser');
    expect(await page.isHidden('#ngd-reset-form'), 'form hidden following update');
    expect(/updated/i.test(await page.textContent('#reset-alert')), 'success is shown');
  });
  await scenario('expired recovery session cannot update a password', async (page) => {
    await page.goto(SITE + '/reset-password.html?valid=1');
    await page.waitForSelector('#ngd-reset-form:not([hidden])');
    await page.fill('#reset-password', 'NewSecure#123');
    await page.fill('#reset-confirm', 'NewSecure#123');
    await page.evaluate(() => { window.__recoverySession.expires_at = Math.floor(Date.now() / 1000) - 1; });
    await page.click('#reset-submit');
    await page.waitForSelector('#reset-invalid:not([hidden])');
    expect((await page.evaluate(() => window.__updates.length)) === 0, 'expired session never calls updateUser');
  });
  await scenario('scanner-safe link: loading consumes nothing; a real click verifies, then updates', async (page) => {
    await page.goto(SITE + '/reset-password.html?token_hash=th_GOODTOKEN&type=recovery');
    await page.waitForSelector('#reset-confirm-link:not([hidden])', { timeout: 4000 });
    let state = await page.evaluate(() => ({
      verifies: window.__verifies.length,
      hadToken: /token_hash=/.test(window.__initialSearch),
      scrubbed: location.search === '' && location.hash === '',
      formHidden: document.getElementById('ngd-reset-form').hidden,
      checkingHidden: document.getElementById('reset-checking').hidden,
    }));
    expect(state.hadToken, 'link arrived carrying the token hash');
    expect(state.verifies === 0, 'nothing consumed by merely loading the page (scanner-safe)');
    expect(state.scrubbed, 'token scrubbed from the address bar');
    expect(state.formHidden && state.checkingHidden, 'password form waits for the click');
    await page.click('#reset-continue');
    await page.waitForSelector('#ngd-reset-form:not([hidden])', { timeout: 4000 });
    state = await page.evaluate(() => ({ verifies: window.__verifies }));
    expect(state.verifies.length === 1 &&
      state.verifies[0].type === 'recovery' && state.verifies[0].token_hash === 'th_GOODTOKEN',
      'one verifyOtp call with the recovery token hash, got ' + JSON.stringify(state.verifies));
    await page.fill('#reset-password', 'NewSecure#123');
    await page.fill('#reset-confirm', 'NewSecure#123');
    await page.click('#reset-submit');
    await page.waitForFunction(() => window.__updates.length === 1);
    expect(await page.evaluate(() => window.__updates[0].password === 'NewSecure#123'), 'updateUser called after click-verified session');
    expect(/updated/i.test(await page.textContent('#reset-alert')), 'success shown, then sign-out + redirect');
  });
  await scenario('used or expired token hash: honest invalid stage after the click', async (page) => {
    await page.goto(SITE + '/reset-password.html?token_hash=th_ALREADYUSED&type=recovery');
    await page.waitForSelector('#reset-confirm-link:not([hidden])', { timeout: 4000 });
    await page.click('#reset-continue');
    await page.waitForSelector('#reset-invalid:not([hidden])', { timeout: 4000 });
    expect(/invalid or has expired/i.test(await page.textContent('#reset-invalid')), 'exact invalid-link copy');
    expect((await page.evaluate(() => window.__updates.length)) === 0, 'no password change possible');
    expect(await page.isHidden('#ngd-reset-form'), 'form never unlocks');
  });
  await scenario('supabase error redirect (otp_expired) fails cleanly without any token use', async (page) => {
    await page.goto(SITE + '/reset-password.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    await page.waitForSelector('#reset-invalid:not([hidden])', { timeout: 4000 });
    const state = await page.evaluate(() => ({
      verifies: window.__verifies.length,
      scrubbed: location.hash === '',
      hadError: /otp_expired/.test(window.__initialHash),
      link: document.querySelector('#reset-invalid a').getAttribute('href'),
    }));
    expect(state.hadError, 'arrived with the supabase error params');
    expect(state.verifies === 0, 'no verification attempted');
    expect(state.scrubbed, 'error params scrubbed from the address bar');
    expect(state.link === 'forgot-password.html', 'Request New Reset Link action offered');
  });
  await scenario('alternate template: fragment-hidden link follows only on click; foreign origins refused', async (page) => {
    await page.route(SB_ORIGIN + '/**', (route) => route.fulfill({
      status: 200, contentType: 'text/html', body: '<title>supabase-verify</title>ok',
    }));
    const confirmation = SB_ORIGIN + '/auth/v1/verify?token=pkce_test123&type=recovery&redirect_to=' +
      encodeURIComponent(SITE + '/reset-password.html');
    await page.goto(SITE + '/reset-password.html#' + confirmation);
    await page.waitForSelector('#reset-alert button', { timeout: 4000 });
    let state = await page.evaluate(() => ({
      button: document.querySelector('#reset-alert button').textContent.trim(),
      formHidden: document.getElementById('ngd-reset-form').hidden,
      invalidHidden: document.getElementById('reset-invalid').hidden,
      verifies: window.__verifies.length,
    }));
    expect(state.button === 'Continue to Reset Password', 'user-click gate shown, got ' + state.button);
    expect(state.formHidden && state.invalidHidden, 'nothing unlocked before the click');
    expect(state.verifies === 0, 'nothing consumed by loading the page');
    await page.click('#reset-alert button');
    await page.waitForURL(SB_ORIGIN + '/auth/v1/verify**', { timeout: 4000 });
    expect(/supabase-verify/.test(await page.title()), 'one-time link followed only after the click');
    /* a link pointing anywhere else must be refused outright */
    await page.goto(SITE + '/reset-password.html#https://evil.example/auth/v1/verify?token=x&type=recovery');
    await page.waitForSelector('#reset-invalid:not([hidden])', { timeout: 5000 });
    expect(page.url().startsWith(SITE), 'foreign-origin link never followed');
  });
  await browser.close(); started.server.close();
  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} reset-password scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (error) => { console.error(error); if (browser) await browser.close(); process.exit(2); });
