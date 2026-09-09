import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4176/diamonds');
    const section = page.locator('section[aria-labelledby="cvd-process"]');
    await section.waitFor();
    await page.waitForTimeout(1200);
    const range = await page.evaluate(async () => {
      const { ScrollTrigger } = await import('/src/lib/motion/gsap.js');
      const trigger = ScrollTrigger.getAll().find((item) => item.pin?.closest('[aria-labelledby="cvd-process"]'));
      return { start: trigger.start, end: trigger.end };
    });
    for (const [name, progress] of [['growth', 0.13], ['stage', 0.55], ['reverse', 0.06]]) {
      await page.evaluate((y) => window.scrollTo(0, y), range.start + (range.end - range.start) * progress);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `tests-e2e/cvd-${name}-${width}-updated.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
    }
    assert.deepEqual(errors, [], 'Runtime errors');
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4176/diamonds');
  const section = page.locator('section[aria-labelledby="cvd-process"]');
  await section.waitFor();
  assert.equal(await section.locator('ol > li').count(), 12);
  assert.equal(await section.locator('svg').count(), 0);
  const positions = await section.locator('ol > li').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  assert.ok(positions.every((top, i) => i === 0 || top > positions[i - 1]), 'Reduced motion stages must form a normal list');
  console.log('Passed: desktop, mobile, reverse scroll, no overflow/runtime errors, reduced motion.');
} finally {
  await browser.close();
}
