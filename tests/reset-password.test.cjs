'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');
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
        window.__updates=[]; window.__recoverySession=null;
        window.ngdSupabase={auth:{
          onAuthStateChange:function(cb){setTimeout(function(){if(new URLSearchParams(location.search).has('valid')){window.__recoverySession={user:{id:'user-1'},access_token:'recovery-token',expires_at:Math.floor(Date.now()/1000)+3600};cb('PASSWORD_RECOVERY',window.__recoverySession);}},20);return {data:{subscription:{unsubscribe:function(){}}}}},
          getSession:async function(){return {data:{session:window.__recoverySession},error:null}},
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
  await browser.close(); started.server.close();
  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} reset-password scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (error) => { console.error(error); if (browser) await browser.close(); process.exit(2); });
