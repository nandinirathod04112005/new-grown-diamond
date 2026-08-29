import { test, expect } from '@playwright/test';

import { CHAPTERS, openHome, gotoChapter, viewportContent } from './ngd.js';

/**
 * Scroll-behaviour QA: the failures that only exist while the page is moving.
 * None of these are visible to a DOM assertion on a resting page.
 */
test.describe('scroll integrity', () => {
  test('scrolling is monotonic — no ScrollTrigger jumps', async ({ page }) => {
    await openHome(page);

    // Step down the page and record where we actually land. A pin that
    // mis-measures, or a refresh mid-scroll, shows up as the position going
    // BACKWARDS between two forward steps.
    const positions = [];
    const height = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.floor(page.viewportSize().height * 0.5);

    for (let y = 0; y < height; y += step) {
      await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
      await page.waitForTimeout(220);
      positions.push(await page.evaluate(() => Math.round(window.scrollY)));
    }

    const regressions = positions
      .map((p, i) => ({ i, p, prev: positions[i - 1] }))
      .filter((o) => o.i > 0 && o.p < o.prev - 4);

    expect(
      regressions,
      `scroll position moved backwards while scrolling down: ${JSON.stringify(regressions)}`
    ).toHaveLength(0);
  });

  test('pinned sections never leave a blank viewport', async ({ page }) => {
    await openHome(page);

    // Genesis and Manufacture are the two pinned chapters. Traverse each in
    // small increments and assert something is on screen the whole way — a
    // pin whose content has scrolled out leaves a correct DOM and an empty
    // screen, which only pixels can catch.
    for (const id of ['genesis', 'manufacture']) {
      await gotoChapter(page, id);
      const top = await page.evaluate(() => window.scrollY);
      const vh = page.viewportSize().height;

      for (let i = 0; i <= 6; i += 1) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + i * vh * 0.4);
        await page.waitForTimeout(360);

        const content = await viewportContent(page);
        expect(
          content.count,
          `${id} step ${i}: nothing readable on screen — pinned section left a blank viewport. sample=${JSON.stringify(content.sample)}`
        ).toBeGreaterThan(0);
      }
    }
  });

  test('chapter rail navigates to each chapter', async ({ page }) => {
    await openHome(page);
    const rail = page.getByRole('navigation', { name: 'Chapters' });

    // The rail is a desktop affordance; below its breakpoint it is hidden by
    // design, and that is a pass, not a skip.
    if (!(await rail.isVisible().catch(() => false))) {
      expect(page.viewportSize().width).toBeLessThan(1100);
      return;
    }

    for (const ch of CHAPTERS.slice(0, 3)) {
      await rail.getByRole('button', { name: new RegExp(ch.name, 'i') }).click();
      await page.waitForTimeout(1400);
      const box = await page.locator(`#${ch.id}`).boundingBox();
      expect(box, `${ch.name} has no box after rail navigation`).not.toBeNull();
      expect(
        Math.abs(box.y),
        `rail did not bring ${ch.name} near the top (y=${box?.y})`
      ).toBeLessThan(page.viewportSize().height * 0.9);
    }
  });
});
