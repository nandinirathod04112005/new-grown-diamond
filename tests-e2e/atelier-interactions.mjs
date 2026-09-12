import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch();
const base = 'http://127.0.0.1:4182';
const folder = 'tests-e2e/atelier-review/interactions';
await fs.mkdir(folder, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await page.goto(`${base}/contact`, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').waitFor();
  assert.equal(await page.locator('#site-menu').evaluate(el => getComputedStyle(el).display), 'none');
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
  await toggle.click();
  assert.equal(await page.evaluate(() => document.activeElement.closest('#site-menu') !== null), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.closest('#site-menu') !== null), true);
  await page.screenshot({ path: `${folder}/mobile-menu.png` });
  await page.keyboard.press('Escape');
  assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#site-menu').evaluate(el => getComputedStyle(el).display), 'none');
  console.log('PASS: closed menu excluded, focus wraps through close control, Escape restores focus/scroll, desktop resize closes menu.');

  await page.locator('form').evaluate(form => form.requestSubmit());
  assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), false);
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  assert.ok(await page.locator('[aria-invalid="true"]').count() > 0);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-invalid')), 'true');
  console.log('PASS: empty contact and sign-in forms reject submission; sign-in focuses the invalid field.');

  // Read-only component inspection with explicitly labelled test data; no stock is published.
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: Viewer } = await import('/src/components/product/StoneViewer.jsx');
    const host = document.createElement('div'); document.body.append(host);
    const root = ReactDOM.createRoot(host);
    root.render(React.createElement(Viewer, { stone: { stockNumber: 'QA-ONLY', shape: 'Round', carat: 1 }, onClose: () => { root.unmount(); host.remove(); } }));
  });
  await page.getByRole('dialog').waitFor();
  await page.getByRole('tab', { name: 'Certificate' }).click();
  assert.ok((await page.getByRole('dialog').innerText()).includes('QA-ONLY'));
  await page.screenshot({ path: `${folder}/viewer-missing-certificate.png` });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  console.log('PASS: viewer opens, missing certificate state retains reference, Escape closes.');
  await page.close();

  for (const width of [390, 1440]) for (const theme of ['dark', 'light']) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    await p.addInitScript(t => localStorage.setItem('ngd-theme', t), theme);
    await p.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    for (const path of ['/education', '/cvd-vs-natural', '/price-and-size', '/shapes', '/why-lab-grown', '/jewellery', '/contact', '/faq', '/blogs', '/diamonds', '/qa-not-found']) {
      await p.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
      await p.locator('h1').first().waitFor();
      await p.keyboard.press('Escape');
      const name = `${path.slice(1)}-${width}-${theme}`;
      await p.screenshot({ path: `${folder}/${name}-initial.png` });
      await p.waitForTimeout(1000);
      await p.screenshot({ path: `${folder}/${name}-settled.png` });
      await p.evaluate(() => window.scrollTo(0, 300));
      await p.waitForTimeout(200);
      await p.screenshot({ path: `${folder}/${name}-scroll.png` });
      await p.emulateMedia({ reducedMotion: 'reduce' });
      const image = p.locator('img[fetchpriority="high"]').first();
      if (await image.count()) assert.equal(await image.evaluate(el => getComputedStyle(el).animationName), 'none');
      await p.emulateMedia({ reducedMotion: 'no-preference' });
    }
    await p.close();
    console.log(`PASS: banner initial/settled/scroll captures and reduced motion ${width}px ${theme}.`);
  }
} finally { await browser.close(); }
