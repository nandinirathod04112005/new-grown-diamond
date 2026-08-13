/* ============================================================
   Responsive smoke test for the global design system
   (styleguide.html) at desktop / tablet / mobile widths.
   Run:  node tests/design-system.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const { server, origin } = await startServer();
  const browser = await chromium.launch(chromiumOptions());
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await installCdnRoutes(context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(`${origin}/styleguide.html`, { waitUntil: 'networkidle' });

    record(`[${vp.name}] no JS errors on load`, pageErrors.length === 0, pageErrors.join('; '));

    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    record(
      `[${vp.name}] no horizontal overflow`,
      overflow.scrollW <= overflow.clientW + 1,
      `scrollWidth=${overflow.scrollW} clientWidth=${overflow.clientW}`
    );

    const beforeScroll = await page.$eval('.ngd-navbar', (n) => n.classList.contains('is-scrolled'));
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(250);
    const afterScroll = await page.$eval('.ngd-navbar', (n) => n.classList.contains('is-scrolled'));
    record(`[${vp.name}] navbar glass toggles on scroll`, !beforeScroll && afterScroll);

    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(400);
    const reveal = await page.evaluate(() => ({
      all: document.querySelectorAll('.ngd-reveal').length,
      visible: document.querySelectorAll('.ngd-reveal.is-visible').length,
    }));
    record(
      `[${vp.name}] scroll reveal fires (${reveal.visible}/${reveal.all})`,
      reveal.all > 0 && reveal.visible === reveal.all
    );

    if (vp.name === 'mobile') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('.navbar-toggler');
      await page.waitForTimeout(500);
      const open = await page.$eval('#sgNav', (n) => n.classList.contains('show'));
      record('[mobile] navbar collapse opens', open);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREEN_DIR, `styleguide-${vp.name}.png`), fullPage: true });
    record(`[${vp.name}] no JS errors after full scroll`, pageErrors.length === 0, pageErrors.join('; '));
    await context.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(2);
});
