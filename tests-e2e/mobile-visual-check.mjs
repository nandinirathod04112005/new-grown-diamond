import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
try {
  for (const width of [320, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const initialResources = await page.evaluate(() => performance.getEntriesByType('resource').map((item) => ({ name: item.name, size: item.transferSize || 0 })).sort((a, b) => b.size - a.size));
    const initialTransfer = initialResources.reduce((sum, item) => sum + item.size, 0);
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 500) {
      await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
      await page.waitForTimeout(35);
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `tests-e2e/mobile-home-${width}.png`, fullPage: true });
    const timing = await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      heading: document.querySelector('h1')?.getBoundingClientRect().toJSON(),
      image: document.querySelector('main img')?.getBoundingClientRect().toJSON(),
      nav: document.querySelector('header')?.getBoundingClientRect().toJSON(),
      resources: performance.getEntriesByType('resource').length,
      transferAfterFullScroll: performance.getEntriesByType('resource').reduce((sum, item) => sum + (item.transferSize || 0), 0),
    }));
    timing.initialTransfer = initialTransfer;
    console.log(width, JSON.stringify(timing));
    console.log('largest', initialResources.slice(0, 8));
    await context.close();
  }
} finally {
  await browser.close();
}
