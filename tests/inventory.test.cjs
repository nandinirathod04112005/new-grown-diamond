/* ============================================================
   Diamond Inventory page tests (STEP 9).
   Verifies search, all filter groups, sorting, grid/table view
   switch, result count, pagination, the details modal, mobile
   offcanvas filters and responsive behaviour at 1440/768/390.
   Run:  node tests/inventory.test.cjs   (see tests/README.md)
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

async function open(page, query) {
  await page.goto(`${SITE}/diamonds.html${query || ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#inv-grid .ngd-diamond-card, #inv-empty:not(.d-none)');
}

async function countText(page) {
  return (await page.textContent('#inv-count')).trim();
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('page loads: intro, toolbar, 9 cards of 28, pagination', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      title: document.querySelector('#inventory h1').textContent.replace(/\s+/g, ' ').trim(),
      intro: document.querySelector('#inventory .ngd-lead').textContent.trim().length,
      search: !!document.getElementById('inv-search'),
      sort: !!document.getElementById('inv-sort'),
      viewBtns: !!document.getElementById('inv-view-grid') && !!document.getElementById('inv-view-table'),
      cards: document.querySelectorAll('#inv-grid .ngd-diamond-card').length,
      total: window.NGD_DEMO_DIAMONDS.length,
      count: document.getElementById('inv-count').textContent.trim(),
      pageBtns: [...document.querySelectorAll('.ngd-page-btn')].map((b) => b.textContent.trim()),
      header: !!document.querySelector('.ngd-navbar'),
      footer: !!document.querySelector('footer.ngd-footer'),
    }));
    expect(/stones/i.test(state.title), 'page title present');
    expect(state.intro > 30, 'short intro present');
    expect(state.search && state.sort && state.viewBtns, 'toolbar controls present');
    expect(state.total === 28, '28 demo stones, got ' + state.total);
    expect(state.cards === 9, '9 cards on page 1, got ' + state.cards);
    expect(state.count === 'Showing 1–9 of 28 stones', 'result count, got "' + state.count + '"');
    expect(state.pageBtns.includes('4'), 'pagination reaches page 4, got ' + state.pageBtns.join(','));
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('cards show every required field + art + tilt', {}, async (page) => {
    await open(page);
    const card = await page.evaluate(() => {
      const c = document.querySelector('#inv-grid .ngd-diamond-card');
      return {
        id: c.getAttribute('data-diamond-id'),
        svg: !!c.querySelector('.ngd-diamond-media svg'),
        tilt: c.hasAttribute('data-ngd-tilt'),
        stock: c.querySelector('.ngd-stock-no').textContent.trim(),
        avail: c.querySelector('.ngd-avail').textContent.trim(),
        labels: [...c.querySelectorAll('.ngd-diamond-specs dt')].map((d) => d.textContent.trim()),
        btn: c.querySelector('.inv-view-details').textContent.trim(),
      };
    });
    expect(/^NGD-\d{4}$/.test(card.stock), 'stock number shown, got ' + card.stock);
    expect(card.svg && card.tilt, 'artwork + 3D tilt present');
    expect(['In Stock', 'On Request'].includes(card.avail), 'availability badge');
    expect(
      JSON.stringify(card.labels) ===
        JSON.stringify(['Shape', 'Carat', 'Colour', 'Clarity', 'Cut', 'Laboratory']),
      'spec labels, got ' + card.labels.join(',')
    );
    expect(card.btn === 'View Details', 'View Details button');
  });

  await scenario('search narrows by stock number and by shape', {}, async (page) => {
    await open(page);
    await page.fill('#inv-search', 'NGD-1003');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.includes('of 1 stone'));
    const only = await page.$eval('#inv-grid .ngd-diamond-card', (c) => c.getAttribute('data-diamond-id'));
    expect(only === 'NGD-1003', 'stock search finds the stone');
    await page.fill('#inv-search', 'oval');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.includes('of 4 stones'));
    await page.fill('#inv-search', '');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.includes('of 28'));
  });

  await scenario('filters narrow correctly and combine (AND)', {}, async (page) => {
    await open(page);
    const expected = await page.evaluate(() => ({
      round: window.NGD_DEMO_DIAMONDS.filter((d) => d.shape === 'Round').length,
      roundBig: window.NGD_DEMO_DIAMONDS.filter((d) => d.shape === 'Round' && d.carat >= 1.5).length,
      roundBigIGI: window.NGD_DEMO_DIAMONDS.filter(
        (d) => d.shape === 'Round' && d.carat >= 1.5 && d.lab === 'IGI').length,
    }));
    await page.check('#inv-f-shape-round');
    await page.waitForFunction((n) =>
      document.getElementById('inv-count').textContent.includes('of ' + n + ' '), expected.round);
    await page.fill('#inv-carat-min', '1.5');
    await page.waitForFunction((n) =>
      document.getElementById('inv-count').textContent.includes('of ' + n + ' '), expected.roundBig);
    await page.check('#inv-f-lab-igi');
    await page.waitForFunction((n) =>
      document.getElementById('inv-count').textContent.includes('of ' + n + ' '), expected.roundBigIGI);
    /* clear resets everything */
    await page.click('#inv-clear');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.includes('of 28'));
    const cleared = await page.$eval('#inv-f-shape-round', (c) => c.checked);
    expect(!cleared, 'checkboxes cleared');
  });

  await scenario('every filter group renders (8 groups incl. carat range)', {}, async (page) => {
    await open(page);
    const groups = await page.$$eval('#inv-filters .ngd-filter-legend', (els) =>
      els.map((e) => e.textContent.trim()));
    expect(JSON.stringify(groups) === JSON.stringify(
      ['Shape', 'Carat range', 'Colour', 'Clarity', 'Cut', 'Laboratory', 'Growth Method', 'Availability']),
      'filter groups, got ' + groups.join(','));
    const availWorks = await page.evaluate(() =>
      window.NGD_DEMO_DIAMONDS.filter((d) => d.availability === 'On Request').length);
    await page.check('#inv-f-availability-on-request');
    await page.waitForFunction((n) =>
      document.getElementById('inv-count').textContent.includes('of ' + n + ' '), availWorks);
  });

  await scenario('sorting reorders by carat both ways', {}, async (page) => {
    await open(page);
    const maxMin = await page.evaluate(() => {
      const carats = window.NGD_DEMO_DIAMONDS.map((d) => d.carat);
      return { max: Math.max(...carats).toFixed(2), min: Math.min(...carats).toFixed(2) };
    });
    await page.selectOption('#inv-sort', 'carat-desc');
    await page.waitForFunction((v) =>
      document.querySelector('#inv-grid .ngd-diamond-carat').textContent.includes(v), maxMin.max);
    await page.selectOption('#inv-sort', 'carat-asc');
    await page.waitForFunction((v) =>
      document.querySelector('#inv-grid .ngd-diamond-carat').textContent.includes(v), maxMin.min);
  });

  await scenario('grid/table switch works; table is complete', {}, async (page) => {
    await open(page);
    await page.click('#inv-view-table');
    await page.waitForSelector('#inv-table-wrap:not(.d-none)');
    const state = await page.evaluate(() => ({
      gridHidden: document.getElementById('inv-grid').classList.contains('d-none'),
      heads: [...document.querySelectorAll('.ngd-table thead th')].map((t) => t.textContent.trim()),
      rows: document.querySelectorAll('#inv-table-body tr').length,
      firstStock: document.querySelector('#inv-table-body .ngd-stock-cell').textContent.trim(),
    }));
    expect(state.gridHidden, 'grid hidden in table view');
    expect(JSON.stringify(state.heads.slice(0, 9)) === JSON.stringify(
      ['Stock No.', 'Shape', 'Carat', 'Colour', 'Clarity', 'Cut', 'Laboratory', 'Growth', 'Availability']),
      'table columns, got ' + state.heads.join(','));
    expect(state.rows === 9, '9 rows per page, got ' + state.rows);
    expect(/^NGD-/.test(state.firstStock), 'stock numbers in table');
    await page.click('#inv-view-grid');
    await page.waitForSelector('#inv-grid:not(.d-none)');
  });

  await scenario('pagination pages through and resets on filter change', {}, async (page) => {
    await open(page);
    await page.click('.ngd-page-btn[data-page="2"]');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.startsWith('Showing 10–18'));
    await page.click('.ngd-page-btn[data-page="4"]');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.startsWith('Showing 28–28'));
    await page.check('#inv-f-shape-round');
    await page.waitForFunction(() =>
      document.getElementById('inv-count').textContent.startsWith('Showing 1–'));
  });

  await scenario('View Details opens the modal with full specs', {}, async (page) => {
    await open(page);
    await page.click('#inv-grid .inv-view-details');
    await page.waitForSelector('#invDetailModal.show', { timeout: 5000 });
    const modal = await page.evaluate(() => ({
      stock: document.querySelector('#inv-modal-body .ngd-stock-no').textContent.trim(),
      dts: [...document.querySelectorAll('#inv-modal-body dt')].map((d) => d.textContent.trim()),
      enquire: !!document.querySelector('#inv-modal-body a[href="contact.html"]'),
    }));
    expect(/^NGD-/.test(modal.stock), 'modal shows stock number');
    expect(modal.dts.includes('Growth') && modal.dts.includes('Availability'),
      'modal shows full specs incl. growth/availability');
    expect(modal.enquire, 'enquire CTA present');
    await page.click('#invDetailModal .btn-close');
    await page.waitForFunction(() =>
      !document.querySelector('#invDetailModal').classList.contains('show'));
  });

  await scenario('?shape=round preselects the filter; legacy ?id opens modal', {}, async (page) => {
    await open(page, '?shape=round');
    const expected = await page.evaluate(() =>
      window.NGD_DEMO_DIAMONDS.filter((d) => d.shape === 'Round').length);
    const checked = await page.$eval('#inv-f-shape-round', (c) => c.checked);
    expect(checked, 'shape checkbox preselected from URL');
    expect((await countText(page)).includes('of ' + expected + ' '), 'results pre-filtered');
    await open(page, '?id=demo-01');
    await page.waitForSelector('#invDetailModal.show', { timeout: 5000 });
    const stock = await page.textContent('#inv-modal-body .ngd-stock-no');
    expect(stock.trim() === 'NGD-1001', 'legacy featured id mapped to NGD-1001');
  });

  await scenario('mobile 390: offcanvas filters work, 1-col grid, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const sidebarHidden = await page.evaluate(() =>
      !document.getElementById('inv-filter-host').offsetParent);
    expect(sidebarHidden, 'desktop sidebar hidden on mobile');
    await page.click('[data-bs-target="#invFilterCanvas"]');
    await page.waitForSelector('#invFilterCanvas.show');
    const formInCanvas = await page.evaluate(() =>
      document.getElementById('inv-filter-host-mobile').contains(document.getElementById('inv-filters')));
    expect(formInCanvas, 'filter form relocated into the offcanvas');
    await page.check('#inv-f-shape-oval');
    await page.click('#invFilterCanvas .btn-close');
    await page.waitForFunction(() =>
      !document.querySelector('#invFilterCanvas').classList.contains('show'));
    const expected = await page.evaluate(() =>
      window.NGD_DEMO_DIAMONDS.filter((d) => d.shape === 'Oval').length);
    expect((await countText(page)).includes('of ' + expected + ' '), 'mobile filter applied');
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#inv-grid .ngd-diamond-card')];
      const tops = [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)))];
      return {
        oneCol: tops.length === cards.length,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    expect(layout.oneCol, 'single column grid on mobile');
    expect(layout.scrollW <= layout.clientW + 1, `no overflow s=${layout.scrollW}`);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'inventory-mobile.png') });
  });

  await scenario('tablet 768: table scrolls inside its card, page never scrolls sideways', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    await page.click('#inv-view-table');
    await page.waitForSelector('#inv-table-wrap:not(.d-none)');
    /* documentElement.scrollWidth is unreliable here (Chromium inflates
       it for a scroll-contained table under body{overflow-x:hidden}),
       so assert what the user experiences instead. */
    const o = await page.evaluate(() => {
      const tr = document.querySelector('.table-responsive');
      window.scrollTo(9999, 0);
      return {
        pageScrollX: window.scrollX,
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
        tableContained: tr.scrollWidth > tr.clientWidth &&
          getComputedStyle(tr).overflowX === 'auto',
      };
    });
    expect(o.pageScrollX === 0, `page cannot scroll sideways, got x=${o.pageScrollX}`);
    expect(o.bodyW <= o.clientW + 1, `body no overflow s=${o.bodyW} c=${o.clientW}`);
    expect(o.tableContained, 'wide table scrolls inside .table-responsive');
  });

  await scenario('desktop screenshot', {}, async (page) => {
    await open(page);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'inventory-desktop.png') });
    await page.click('#inv-view-table');
    await page.waitForSelector('#inv-table-wrap:not(.d-none)');
    await page.screenshot({ path: path.join(SCREEN_DIR, 'inventory-table.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} inventory scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
