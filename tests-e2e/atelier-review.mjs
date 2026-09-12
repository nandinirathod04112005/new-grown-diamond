import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const phase = process.argv[2] || 'before';
const base = process.env.QA_URL || 'http://127.0.0.1:4182';
const folder = `tests-e2e/atelier-review/${phase === 'refresh' ? 'after' : phase}`;
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const width of (phase !== 'after' ? [390, 1440] : [320, 375, 390, 768, 1440, 1920])) {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(theme => localStorage.setItem('ngd-theme', theme), theme);
      // Read-only review: never submit to a backend, even accidentally.
      await page.route('**/*', route => {
        const req = route.request();
        return !req.url().startsWith(base) && !req.url().startsWith('data:')
          ? route.abort() : route.continue();
      });
      for (const path of (phase !== 'after' ? ['/', '/education', '/jewellery', '/contact', '/blogs', '/diamonds'] : ['/', '/about', '/education', '/shapes', '/why-lab-grown', '/jewellery', '/contact', '/faq', '/blogs', '/blogs/qa-unavailable', '/diamonds', '/login', '/register', '/account', '/admin'])) {
        await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
        await page.locator('h1').first().waitFor({ timeout: 20000 });
        await page.waitForTimeout(250);
        const result = await page.evaluate(() => ({
          h1: [...document.querySelectorAll('h1')].map(el => el.textContent),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          offenders: [...document.querySelectorAll('main *')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width && (r.right > innerWidth + 2 || r.left < -2) && getComputedStyle(el).position !== 'absolute';
          }).slice(0, 8).map(el => `${el.tagName}.${el.className}`),
        }));
        report.push({ width, theme, path, ...result });
        if ([390, 1440].includes(width) && ['/', '/education', '/contact', '/blogs', '/diamonds', '/jewellery'].includes(path)) {
          await page.screenshot({ path: `${folder}/${path.slice(1) || 'home'}-${width}-${theme}.png` });
          if (path === '/blogs') await page.screenshot({ path: `${folder}/blogs-full-${width}-${theme}.png`, fullPage: true });
        }
      }
      await page.close();
      console.log(`Reviewed ${width}px ${theme}`);
    }
  }
} finally {
  await fs.writeFile(`${folder}/${phase === 'refresh' ? 'refresh-report' : 'report'}.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report.filter(r => r.overflow || r.h1.length !== 1), null, 2));
