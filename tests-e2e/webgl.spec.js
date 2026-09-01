import { test, expect } from '@playwright/test';

import { openHome, watchErrors, invisibleText } from './ngd.js';
import { resolveChromium } from './browser.js';

const executablePath = resolveChromium();

/**
 * The WebGL layer is an enhancement. These tests assert that the page is whole
 * without it — the condition most visitors on modest hardware are actually in.
 */
// File-level: launchOptions forces a dedicated worker, so Playwright rejects
// it inside a describe block.
test.use({
  launchOptions: {
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-gpu', '--disable-webgl', '--disable-3d-apis'],
  },
});

test.describe('WebGL fallback', () => {
  test('page is complete with WebGL unavailable', async ({ page }) => {
    const errors = watchErrors(page);
    await openHome(page);

    expect(
      await page.evaluate(() => {
        try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
      }),
      'this test is meaningless if WebGL is actually available'
    ).toBe(false);

    expect(await page.locator('canvas').count(), 'no canvas may mount without WebGL').toBe(0);

    // The headline and the real photograph must both still be there.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('From carbon to brilliance');
    const img = page.locator('main img').first();
    await expect(img).toBeVisible();
    expect(await img.getAttribute('src')).toMatch(/ngd-brilliant-macro/);

    expect(errors, `errors without WebGL: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the journey still reads without its particle field', async ({ page }) => {
    await openHome(page);
    await page.evaluate(() => document.getElementById('genesis')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(900);

    // Several headings now: a section heading plus one per chapter panel.
    await expect(page.locator('#genesis').getByRole('heading').first()).toBeAttached();
    const hidden = await invisibleText(page);
    const inGenesis = hidden.filter((h) => h.section === 'genesis');
    expect(inGenesis, `genesis prose hidden without WebGL: ${JSON.stringify(inGenesis)}`).toHaveLength(0);
  });
});
