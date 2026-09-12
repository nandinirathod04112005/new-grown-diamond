import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const defaultRoutes = [
  '/', '/about', '/diamonds', '/jewellery', '/education', '/shapes',
  '/why-lab-grown', '/cvd-vs-natural', '/price-and-size', '/contact',
  '/faq', '/blogs', '/feedback', '/cart', '/wishlist', '/privacy-policy',
  '/terms-and-conditions', '/login', '/register', '/account', '/qa-not-found',
];
const routes = process.env.QA_ROUTES ? process.env.QA_ROUTES.split(',') : defaultRoutes;
const widths = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : [360, 1440];
const viewports = widths.map((width) => ({ width, height: width < 600 ? 800 : 900 }));
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of routes) {
      const runtime = [];
      const failed = [];
      const onError = (error) => runtime.push(error.message);
      const onFailed = (request) => failed.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
      page.on('pageerror', onError);
      page.on('requestfailed', onFailed);
      const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(700);
      const dom = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
        duplicateIds: [...document.querySelectorAll('[id]')].map((el) => el.id).filter((id, i, all) => all.indexOf(id) !== i),
        emptyLinks: [...document.querySelectorAll('a[href]')].filter((a) => !a.getAttribute('href')?.trim()).length,
        unnamedControls: [...document.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => {
          if (el.matches('input[type="hidden"]')) return false;
          return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.textContent?.trim() || (el.matches('input,textarea') && (el.labels?.length || el.placeholder)));
        }).length,
      }));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      report.push({ route, width: viewport.width, status: response?.status(), ...dom, runtime, failed, axe: axe.violations.map((v) => ({
        id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help,
        samples: v.nodes.slice(0, 3).map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
      })) });
      page.off('pageerror', onError);
      page.off('requestfailed', onFailed);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
