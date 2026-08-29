import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

/**
 * Resolve a Chromium that exists on this machine.
 *
 * Playwright pins one browser build per release; some environments ship a
 * pre-installed Chromium at a different revision under
 * PLAYWRIGHT_BROWSERS_PATH, so the pinned path is absent and every launch
 * fails. Shared by the config AND by any spec that overrides launchOptions —
 * a file-level `test.use({ launchOptions })` REPLACES the config's object
 * wholesale, so executablePath has to be re-supplied there or the override
 * silently loses it.
 */
export function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  const pinned = (() => {
    try { return chromium.executablePath(); } catch { return null; }
  })();
  if (pinned && existsSync(pinned)) return undefined;

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && existsSync(root)) {
    const dir = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().pop();
    if (dir) {
      for (const rel of [
        'chrome-linux/chrome',
        'chrome-linux64/chrome',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      ]) {
        const p = join(root, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  return undefined;
}
