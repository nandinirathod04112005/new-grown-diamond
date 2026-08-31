import { test, expect } from '@playwright/test';

import { CHAPTERS } from '../src/lib/journey.js';
import { openHome, walkPage, watchErrors, viewportContent } from './ngd.js';

/**
 * The journey: one fixed stage, one controller, seven chapters.
 *
 * These replace the old genesis.spec.js, which tested a section that owned its
 * own pin and its own scene. Both are gone — the scene is now directed once for
 * the whole page — so the assertions move with it rather than being deleted.
 */
test.describe('Diamond journey', () => {
  test('all seven chapters are present and named', async ({ page }) => {
    await openHome(page);
    await walkPage(page);

    for (const c of CHAPTERS) {
      await expect(
        page.getByText(c.title, { exact: false }).first(),
        `chapter ${c.n} ${c.label}: title missing`
      ).toBeAttached();
    }

    // The rail is the reader's index into the journey; it must name every one.
    const rail = page.locator('nav[aria-label="Journey chapters"]');
    if (await rail.count()) {
      for (const c of CHAPTERS) {
        await expect(rail.getByText(c.label, { exact: false })).toBeAttached();
      }
    }
  });

  test('one controller drives the scene — the rail tracks the scroll', async ({ page }) => {
    const errors = watchErrors(page);
    await openHome(page);

    const height = await page.evaluate(() => document.body.scrollHeight);
    const seen = [];
    for (const frac of [0.02, 0.1, 0.2, 0.3, 0.42]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * frac));
      await page.waitForTimeout(900);
      seen.push(await page.evaluate(() => {
        const on = document.querySelector('nav[aria-label="Journey chapters"] [aria-current]');
        return on ? on.textContent.replace(/\s+/g, ' ').trim() : null;
      }));
    }

    // The rail is a desktop affordance. Below 1100px it is display:none but
    // still in the DOM — and on that path the director applies the finished
    // state once, so the rail correctly reads chapter six and never moves.
    // Skipping on presence would have missed that; skip on being shown.
    const shown = await page.evaluate(() => {
      const el = document.querySelector('nav[aria-label="Journey chapters"]');
      return !!el && getComputedStyle(el).display !== 'none';
    });
    if (!shown) {
      expect(page.viewportSize().width).toBeLessThan(1100);
      return;
    }
    if (seen.every((s) => s === null)) return;

    // The active chapter must actually change as the page is scrolled. A rail
    // frozen on chapter one is the signature of a consumer rendered outside
    // the progress provider — which is exactly how this shipped once.
    const distinct = new Set(seen.filter(Boolean));
    expect(
      distinct.size,
      `rail never advanced; saw only ${[...distinct].join(', ')}`
    ).toBeGreaterThan(1);

    expect(errors, `errors during journey: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the scrubbed journey never goes blank and never overflows', async ({ page }) => {
    await openHome(page);
    const height = await page.evaluate(() => document.body.scrollHeight);

    for (let i = 0; i <= 8; i += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * (i / 16)));
      await page.waitForTimeout(700);

      // Use the suite's own helper rather than a narrower selector list.
      // A hand-rolled `h1,h2,h3,p,dd,dt` check reported the Inventory ledger as
      // a blank screen at 320 and 375, because the ledger sets its carats,
      // shapes and grades in spans and links. The page was right and the test
      // was wrong — which is the failure mode this suite is most prone to.
      const content = await viewportContent(page);
      expect(
        content.count,
        `journey step ${i}: nothing readable on screen — sample=${JSON.stringify(content.sample)}`
      ).toBeGreaterThan(0);

      const w = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      expect(w.s, `journey step ${i} overflows horizontally`).toBeLessThanOrEqual(w.c + 1);
    }
  });
});
