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

  test('the finished diamond is a photograph, never a render', async ({ page }) => {
    await openHome(page);
    await page.waitForTimeout(2500);

    // This used to assert `#hero canvas === 0`. The hero now scrolls over the
    // journey's shared stage, and that stage DOES carry a canvas — showing
    // carbon, plasma and a rough crystal, which generated geometry is allowed
    // to depict.
    //
    // The rule the old assertion actually protected is narrower and more
    // important: no generated geometry may stand in for a FINISHED diamond.
    // So the assertion moves to the thing that matters — the polished stone on
    // screen is the real photograph, and it is present regardless of whether
    // WebGL exists at all.
    const img = page.locator('main img').first();
    await expect(img).toBeAttached();
    expect(await img.getAttribute('src')).toMatch(/ngd-brilliant-macro/);

    // Scroll past the handover, where the stone must be the photograph.
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * 0.34));
    await page.waitForTimeout(1200);

    const shown = await page.evaluate(() => {
      const el = document.querySelector('main img');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { opacity: Number(cs.opacity), width: Math.round(r.width), natural: el.naturalWidth };
    });
    expect(shown, 'no photograph on the stage').not.toBeNull();
    expect(
      shown.opacity,
      'the real photograph must be showing once the stone is cut'
    ).toBeGreaterThan(0.5);

    // The photograph must never be scaled beyond its true resolution, which is
    // what turns a real stone into a soft approximation of one.
    expect(
      shown.width,
      `photograph displayed at ${shown.width}px from a ${shown.natural}px source — upscaled`
    ).toBeLessThanOrEqual(shown.natural);
  });

  test('nothing is composited onto the diamond photograph', async ({ page }) => {
    await openHome(page);
    await page.waitForTimeout(2500);

    // A real, company-owned, graded stone may carry presentation effects around
    // it and none on it. This shipped wrong once: a sparkle layer painted in
    // front of the photograph and drew glowing dots on the crown, on fully
    // opaque pixels, at every viewport.
    //
    // The decorative layers now live on the shared stage, so the assertion
    // follows them there. What is checked is unchanged and is checked by
    // ORDERING, which is the only thing that holds at every scroll position:
    // every decorative layer must paint behind the photograph, where the
    // opaque stone occludes it.
    const verdict = await page.evaluate(() => {
      const img = document.querySelector('main img');
      if (!img) return { skip: true };
      const stage = img.parentElement;
      const zOf = (el) => {
        const z = getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : Number(z);
      };
      const stoneZ = zOf(img);
      const decor = [...stage.children]
        .filter((el) => el !== img)
        .map((el) => ({
          cls: el.className?.toString().slice(0, 40) ?? el.tagName,
          z: zOf(el),
          // A full-bleed gradient is the frame closing in, not decoration
          // drawn on the goods; discrete sparkle is what must stay behind.
          discrete: el.querySelectorAll('span').length > 0,
        }));
      return { stoneZ, decor };
    });

    if (verdict.skip) return;

    const over = verdict.decor.filter((d) => d.discrete && d.z >= verdict.stoneZ);
    expect(
      over.map((d) => `${d.cls} @ z${d.z}`),
      `sparkle layers painting at or above the photograph (z${verdict.stoneZ})`
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
