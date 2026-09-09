import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4176/diamonds');
  await page.locator('#cvd-process').waitFor();
  const budget = await page.evaluate(async () => {
    const router = await import('/src/lib/router.js');
    document.querySelector('header a[href="/"]').click();
    return { out: router.COVER_OUT_MS, in: router.COVER_IN_MS };
  });
  for (const phase of ['out', 'in']) {
    const cover = page.locator(`[data-phase="${phase}"][aria-hidden="true"]`).first();
    await cover.waitFor();
    const ends = await cover.evaluate((el) => el.getAnimations({ subtree: true }).map((animation) => animation.effect.getComputedTiming().endTime));
    assert.ok(ends.length > 0);
    assert.ok(ends.every((end) => end <= budget[phase] + 1), `${phase} animation exceeds navigation timer`);
  }
  await page.waitForTimeout(800);
  assert.equal(new URL(page.url()).pathname, '/');
  assert.equal(await page.locator('[data-phase="in"][aria-hidden="true"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Passed: navigation animations finish within route timers; cover removed; no runtime errors.');
} finally {
  await browser.close();
}
