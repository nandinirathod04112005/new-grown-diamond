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

  test('nothing is composited onto the diamond photograph', async ({ page }) => {
    await openHome(page);
    await page.waitForTimeout(2500);

    // A real, company-owned, graded stone may carry presentation effects around
    // it and none on it. This shipped wrong once: the mote layer sat at
    // z-index 14 against the plate's 12 and drew glowing sparkles directly on
    // the crown — on fully opaque pixels of the photograph, at every one of the
    // five viewports.
    //
    // What makes a mote a defect is being PAINTED OVER the stone, not merely
    // positioned there: behind an opaque photograph it is occluded and harmless.
    // So a mote counts against us only when its layer paints at or above the
    // plate AND its centre maps to an opaque pixel of the source WebP.
    //
    // Both halves are asserted. Ordering alone is the mechanism, and the pixel
    // check is what actually caught this — keeping both means restoring either
    // half of the old bug fails the suite.
    //
    // Scoped to discrete sparkle. The vignette is a full-bleed gradient, which
    // is the frame closing in, not decoration drawn on the goods.
    const check = async () => page.evaluate(() => {
      const hero = document.querySelector('#hero');
      const img = hero.querySelector('img');
      const motes = [...hero.querySelectorAll('[data-o]')];
      if (!img || motes.length === 0) return { skip: true };

      const zOf = (el) => {
        const z = getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : Number(z);
      };
      const plateZ = zOf(img.closest('figure'));
      const moteZ = zOf(motes[0].parentElement);

      const r = img.getBoundingClientRect();
      if (r.width === 0) return { plateZ, moteZ, drawnOnStone: [] };

      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);

      const drawnOnStone = [];
      motes.forEach((m, i) => {
        const b = m.getBoundingClientRect();
        if (b.width === 0 || getComputedStyle(m).display === 'none') return;
        if (zOf(m.parentElement) < plateZ) return; // occluded by the photograph
        const px = Math.round(((b.left + b.width / 2 - r.left) / r.width) * c.width);
        const py = Math.round(((b.top + b.height / 2 - r.top) / r.height) * c.height);
        if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
        if (cx.getImageData(px, py, 1, 1).data[3] > 250) {
          drawnOnStone.push(`mote ${i} at source px (${px},${py}), opacity ${m.dataset.o}`);
        }
      });
      return { plateZ, moteZ, drawnOnStone };
    });

    const atRest = await check();
    if (atRest.skip) return;

    expect(
      atRest.moteZ,
      `sparkle layer paints at z-index ${atRest.moteZ} against the photograph's `
        + `${atRest.plateZ} — it must sit behind`
    ).toBeLessThan(atRest.plateZ);
    expect(
      atRest.drawnOnStone,
      `decoration drawn on the stone: ${atRest.drawnOnStone.join(' | ')}`
    ).toEqual([]);

    // Again mid push-in, where the stone grows to 1.55x and covers far more of
    // the frame than it does at rest.
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await page.waitForTimeout(1200);
    const pushedIn = await check();
    expect(
      pushedIn.drawnOnStone,
      `decoration drawn on the stone mid push-in: ${pushedIn.drawnOnStone.join(' | ')}`
    ).toEqual([]);
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
