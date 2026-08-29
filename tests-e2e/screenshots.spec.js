import { test } from '@playwright/test';

import { CHAPTERS, openHome, gotoChapter } from './ngd.js';

/**
 * Capture pass. Produces the artefacts a human (or I) actually look at —
 * assertions catch what can be described, screenshots catch what cannot.
 *
 * Deliberately assertion-free: a capture run should never fail the suite,
 * it should produce evidence.
 */
test('capture every chapter', async ({ page }, testInfo) => {
  const vp = testInfo.project.name;
  await openHome(page);

  // The hero timeline runs ~2.2s after the preloader leaves. Capturing before
  // it settles produces a shot missing the lede and the calls to action —
  // which looks exactly like a rendering bug and is not one.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `tests-e2e/screenshots/${vp}/00-hero.png` });

  for (const ch of CHAPTERS) {
    await gotoChapter(page, ch.id);
    await page.screenshot({ path: `tests-e2e/screenshots/${vp}/${ch.id}.png` });
  }
});
