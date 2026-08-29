import { test, expect } from '@playwright/test';

import {
  CHAPTERS, watchErrors, openHome, walkPage, gotoChapter,
  overflowReport, clippedText, brokenImages, invisibleText,
} from './ngd.js';

/**
 * Structural and visual QA of the homepage, run at every specified viewport.
 * The Playwright project name supplies the viewport, so each assertion here
 * runs five times.
 */
test.describe('NGD homepage', () => {
  test('hero renders with real imagery and usable navigation', async ({ page }) => {
    const errors = watchErrors(page);
    await openHome(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('From carbon to brilliance');

    // Navigation must be usable immediately, not after the 3D settles.
    // Its FORM depends on the viewport: the primary nav above 1024px, the
    // drawer toggle below it. Both are valid; the absence of either is not.
    await expect(page.getByRole('link', { name: /The inventory/i })).toBeVisible();
    if (page.viewportSize().width >= 1024) {
      await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    } else {
      await expect(page.locator('button[aria-controls="ngd-drawer"]')).toBeVisible();
    }

    // The hero visual must be the REAL photograph, never a template asset.
    const heroImg = page.locator('main img').first();
    await expect(heroImg).toBeVisible();
    const src = await heroImg.getAttribute('src');
    expect(src, 'hero must use the real NGD stone').toMatch(/ngd-brilliant-macro/);
    expect(src).not.toMatch(/react\.svg|vite\.svg|hero\.png|placeholder|unsplash|stock/i);
    await expect(heroImg).toHaveAttribute('alt', /diamond/i);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the hero stone is a photograph, never a render', async ({ page }) => {
    await openHome(page);
    await page.waitForTimeout(2500);

    // No canvas may exist in the hero at any viewport or capability tier. A
    // generated brilliant is not a photograph of a company-owned stone, and
    // this is the assertion that keeps one from creeping back in.
    //
    // Scoped by id, not `section:first-of-type`: ScrollTrigger wraps a pinned
    // section in a spacer div, which makes the pinned section the first of its
    // type within that wrapper too, so the loose selector matched Genesis's
    // canvas as well as the hero.
    const heroCanvases = await page.locator('#hero canvas').count();
    expect(heroCanvases, 'the hero must contain no WebGL canvas').toBe(0);

    const img = page.locator('#hero img').first();
    await expect(img).toBeVisible();
    expect(await img.getAttribute('src')).toMatch(/ngd-brilliant-macro/);

    // The photograph must never be scaled beyond its true resolution, which
    // is what turns a real stone into a soft approximation of one.
    const box = await img.boundingBox();
    const natural = await img.evaluate((el) => el.naturalWidth);
    expect(
      box.width,
      `hero photograph displayed at ${Math.round(box.width)}px from a ${natural}px source — upscaled`
    ).toBeLessThanOrEqual(natural);
  });

  test('every chapter is present, headed and legible', async ({ page }) => {
    await openHome(page);
    for (const ch of CHAPTERS) {
      await gotoChapter(page, ch.id);
      const section = page.locator(`#${ch.id}`);
      await expect(section, `${ch.name} missing`).toBeAttached();
      await expect(
        section.getByRole('heading', { name: ch.heading }),
        `${ch.name} heading not visible`
      ).toBeVisible();
    }
  });

  test('no console errors across the whole page', async ({ page }) => {
    const errors = watchErrors(page);
    await openHome(page);
    await walkPage(page);
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('no broken images', async ({ page }) => {
    await openHome(page);
    await walkPage(page);
    const broken = await brokenImages(page);
    expect(broken, `broken: ${JSON.stringify(broken)}`).toHaveLength(0);
  });

  test('no horizontal overflow', async ({ page }) => {
    await openHome(page);
    await walkPage(page);
    const r = await overflowReport(page);
    expect(
      r.scrollWidth,
      `document scrolls sideways. offenders: ${JSON.stringify(r.offenders)}`
    ).toBeLessThanOrEqual(r.clientWidth + 1);
  });

  test('no clipped text', async ({ page }) => {
    await openHome(page);
    await walkPage(page);
    const clipped = await clippedText(page);
    expect(clipped, `clipped: ${JSON.stringify(clipped)}`).toHaveLength(0);
  });

  test('no text left invisible by an animation that never ran', async ({ page }) => {
    await openHome(page);
    await walkPage(page);
    const hidden = await invisibleText(page);
    expect(hidden, `stuck at opacity 0: ${JSON.stringify(hidden)}`).toHaveLength(0);
  });
});
