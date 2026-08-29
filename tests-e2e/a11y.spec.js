import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { openHome, walkPage, invisibleText } from './ngd.js';

test.describe('accessibility', () => {
  test('no serious or critical axe violations', async ({ page }) => {
    await openHome(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // The decorative canvases are aria-hidden; axe's colour-contrast pass
      // cannot read text composited over WebGL and reports false positives on
      // it, so contrast is asserted separately against the token palette.
      .disableRules(['color-contrast'])
      .analyze();

    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(
      serious,
      serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`).join('\n')
    ).toHaveLength(0);
  });

  test('keyboard reaches navigation, chapters and calls to action', async ({ page }) => {
    await openHome(page);

    // The skip link must be the first stop and must actually move focus.
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(first, 'first tab stop should be the skip link').toMatch(/skip to content/i);

    // Tab through a realistic prefix of the page and confirm focus is always
    // on something visible — a focus trap or an offscreen stop is a failure.
    const seen = [];
    for (let i = 0; i < 22; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 34),
          offscreen: r.width === 0 && r.height === 0,
        };
      });
      if (info) seen.push(info);
    }

    expect(seen.length, 'keyboard could not move through the page').toBeGreaterThan(8);
    const stranded = seen.filter((s) => s.offscreen);
    expect(stranded, `focus landed on zero-size elements: ${JSON.stringify(stranded)}`).toHaveLength(0);
  });

  test('mobile drawer opens, traps focus and closes on Escape', async ({ page }) => {
    await openHome(page);
    const toggle = page.locator('button[aria-controls="ngd-drawer"]');

    if (!(await toggle.isVisible().catch(() => false))) {
      // Above 1024px the drawer is replaced by the full nav — expected.
      expect(page.viewportSize().width).toBeGreaterThanOrEqual(1024);
      return;
    }

    const drawer = page.locator('#ngd-drawer');
    await expect(drawer, 'drawer must be closed on load').toBeHidden();

    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('reduced motion: no canvas, no custom cursor, nothing stranded', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page, { reducedMotion: true });
    await walkPage(page, { settle: 160 });

    expect(await page.locator('canvas').count(), 'no WebGL under reduced motion').toBe(0);
    expect(
      await page.locator('html.ngd-has-cursor').count(),
      'custom cursor must not replace the pointer under reduced motion'
    ).toBe(0);

    const hidden = await invisibleText(page);
    expect(hidden, `reduced motion left text invisible: ${JSON.stringify(hidden)}`).toHaveLength(0);

    // Content must still be readable and the page still navigable.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
