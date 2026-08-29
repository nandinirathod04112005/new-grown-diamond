import { test, expect } from '@playwright/test';

import { openHome, watchErrors, viewportContent } from './ngd.js';
import { STAGES } from '../src/lib/genesisStages.js';

/**
 * Diamond Genesis is the centrepiece, so it gets its own coverage: the six
 * stages must all exist, the scrubbed traverse must keep something readable
 * on screen the whole way, and the sequence must remain legible where there
 * is no pin and no WebGL at all.
 */
test.describe('Diamond Genesis', () => {
  test('all six stages are present and named', async ({ page }) => {
    await openHome(page);
    await page.evaluate(() => document.getElementById('genesis')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(900);

    const section = page.locator('#genesis');
    for (const s of STAGES) {
      await expect(
        section.getByText(s.key, { exact: false }).first(),
        `stage "${s.key}" missing`
      ).toBeAttached();
    }
  });

  test('the scrubbed traverse never goes blank and never overflows', async ({ page }) => {
    const errors = watchErrors(page);
    await openHome(page);

    await page.evaluate(() => document.getElementById('genesis')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(900);

    const top = await page.evaluate(() => window.scrollY);
    const vh = page.viewportSize().height;

    // Walk the whole pin in twelve steps — twice the number of stages, so
    // every transition between them is sampled, not just their midpoints.
    for (let i = 0; i <= 12; i += 1) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + i * vh * 0.45);
      await page.waitForTimeout(300);

      const content = await viewportContent(page);
      expect(
        content.count,
        `genesis step ${i}: nothing readable on screen`
      ).toBeGreaterThan(0);

      const w = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      expect(w.s, `genesis step ${i} overflows horizontally`).toBeLessThanOrEqual(w.c + 1);
    }

    expect(errors, `errors during genesis: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('every stage caption is readable where there is no pin', async ({ page }) => {
    // Below the desktop breakpoint the sequence is told as prose, so all six
    // captions must be present and visible at once.
    if (page.viewportSize().width >= 900) {
      test.skip(true, 'pinned traverse is covered by the scrub test above');
    }
    await openHome(page);
    await page.evaluate(() => document.getElementById('genesis')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(700);

    for (const s of STAGES) {
      await expect(
        page.locator('#genesis').getByText(s.blurb.slice(0, 40), { exact: false }),
        `stage "${s.key}" prose not visible without a pin`
      ).toBeVisible();
    }
  });
});
