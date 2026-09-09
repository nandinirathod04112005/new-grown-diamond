import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of ['/', '/diamonds', '/about']) {
      await page.goto(`http://127.0.0.1:4176${route}`);
      await page.waitForTimeout(1400);
      for (const fraction of [0.2, 0.5, 0.85, 0.1]) {
        await page.evaluate((p) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), fraction);
        await page.waitForTimeout(600);
        const transforms = await page.locator('.u-above-film:not([data-leaving])').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
        assert.ok(transforms.every((value) => value === 'none'), `${route}: document plane should remain stable`);
      }
      await page.waitForFunction(() => Number(document.documentElement.style.getPropertyValue('--vel')) === 0, null, { timeout: 8000 });
      const velocity = await page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--vel')));
      assert.equal(velocity, 0, `${route}: scroll velocity should settle`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed: home, diamonds and about; desktop/mobile full-page scrolling, stable page transforms, velocity settles, no runtime errors.');
} finally {
  await browser.close();
}
