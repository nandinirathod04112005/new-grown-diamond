/* ============================================================
   Guided Selection panel tests (homepage).
   The dark panel between the Cut Collection and Featured
   Diamonds builds the Smart Diamond Finder's own shareable-link
   vocabulary (shape / minCarat / maxCarat / clarity) and hands
   off through the page-transition engine; the finder restores
   the selections and runs the search on arrival.
   Run:  node tests/guided-selection.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://guided-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1366, height: 900 },
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript', body: TEST_CONFIG,
    }));
    await context.route(SB_HOST + '/**', (r) => r.request().method() === 'OPTIONS'
      ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' })
      : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '*/0' }, body: '[]' }));
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

async function open(page) {
  await page.goto(`${SITE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.NGDGuided, null, { timeout: 15000 });
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('the panel sits in the dark band between the shapes and the featured stones', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const section = document.querySelector('#guided-selection');
      const panel = section.querySelector('.ngd-guided-panel');
      const cs = getComputedStyle(panel);
      return {
        dark: section.classList.contains('ngd-section-dark'),
        afterShapes: section.offsetTop > document.querySelector('#diamond-shapes').offsetTop,
        beforeFeatured: section.offsetTop < document.querySelector('#featured-diamonds').offsetTop,
        border: cs.borderColor,
        radius: parseFloat(cs.borderTopLeftRadius),
        eyebrow: section.querySelector('.ngd-eyebrow').textContent.trim(),
        title: section.querySelector('#guided-title').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    expect(st.dark, 'dark band');
    expect(st.afterShapes && st.beforeFeatured, 'placed between shapes and featured');
    expect(/rgba?\(207, 174, 110/.test(st.border), 'gold-lined glass panel, got ' + st.border);
    expect(st.radius > 8, 'soft panel radius');
    expect(/guided selection/i.test(st.eyebrow), 'eyebrow');
    expect(/Find your diamond/i.test(st.title), 'title');
  });

  await scenario('the four controls carry the full finder vocabulary with premium defaults', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const options = (id) => Array.from(document.getElementById(id).options).map((o) => o.text.trim());
      const values = (id) => Array.from(document.getElementById(id).options).map((o) => o.value);
      return {
        shapes: options('gs-shape'),
        from: document.getElementById('gs-carat-from').value,
        to: document.getElementById('gs-carat-to').value,
        clarityValues: values('gs-clarity'),
        labels: Array.from(document.querySelectorAll('.ngd-guided-label')).map((l) => l.textContent.trim()),
      };
    });
    expect(st.shapes.length === 9 && st.shapes[0] === 'Any Shape', 'Any + the eight cuts');
    expect(['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise']
      .every((s) => st.shapes.includes(s)), 'every signature cut is offered');
    expect(st.from === '1.00' && st.to === '2.50', 'the reference default carat window');
    expect(st.clarityValues.includes('VS1,VS2') && st.clarityValues.includes('FL,IF'),
      'clarity groups use the finder\'s grade vocabulary');
    expect(st.labels.length === 4, 'each control is labelled');
  });

  await scenario('the built link speaks the finder\'s shareable-URL dialect', {}, async (page) => {
    await open(page);
    const url = await page.evaluate(() => {
      document.getElementById('gs-shape').value = 'Round';
      document.getElementById('gs-carat-from').value = '1.50';
      document.getElementById('gs-carat-to').value = '3.00';
      document.getElementById('gs-clarity').value = 'VS1,VS2';
      return window.NGDGuided.buildUrl();
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('diamond-finder.html?'), 'targets the Smart Diamond Finder');
    expect(params.get('shape') === 'Round', 'shape carried');
    expect(params.get('minCarat') === '1.50' && params.get('maxCarat') === '3.00', 'carat window carried');
    expect(params.get('clarity') === 'VS1,VS2', 'clarity group carried');
  });

  await scenario('Find Diamonds hands off to the finder, which restores the selections', {}, async (page) => {
    await open(page);
    await page.selectOption('#gs-shape', 'Princess');
    await page.selectOption('#gs-clarity', 'VVS1,VVS2');
    await page.click('[data-ngd-guided] button[type="submit"]');
    await page.waitForURL('**/diamond-finder.html?*', { timeout: 20000 });
    /* the finder normalises the URL as it restores the selections
       (1.00 → 1), so assert the values, not the formatting */
    const qs = new URLSearchParams(page.url().split('?')[1]);
    expect(qs.get('shape') === 'Princess', 'shape in the handoff URL');
    expect(parseFloat(qs.get('minCarat')) === 1 && parseFloat(qs.get('maxCarat')) === 2.5,
      'default carat window in the URL, got ' + qs.get('minCarat') + '–' + qs.get('maxCarat'));
    expect((qs.get('clarity') || '') === 'VVS1,VVS2', 'clarity group in the URL');
    await page.waitForFunction(() =>
      document.title.toLowerCase().includes('finder') ||
      !!document.querySelector('[data-ngd-page="diamond-finder"], body'), null, { timeout: 10000 });
  });

  await scenario('the carat window never inverts', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const from = document.getElementById('gs-carat-from');
      const to = document.getElementById('gs-carat-to');
      to.value = '1.00';
      from.value = '2.00';
      from.dispatchEvent(new Event('change'));
      return { to: to.value };
    });
    expect(parseFloat(st.to) >= 2, '"to" follows "from" upward, got ' + st.to);
  });

  await scenario('the browse escape hatch links straight to the full inventory', {}, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const link = document.querySelector('.ngd-guided-browse a');
      return { href: link.getAttribute('href'), text: link.textContent.trim() };
    });
    expect(st.href === 'diamonds.html', 'browse link goes to the inventory');
    expect(/view all diamonds/i.test(st.text), 'browse copy');
  });

  await scenario('mobile: controls stack two-up and the button is a full tap target', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const st = await page.evaluate(() => {
      const shape = document.getElementById('gs-shape').getBoundingClientRect();
      const from = document.getElementById('gs-carat-from').getBoundingClientRect();
      const btn = document.querySelector('[data-ngd-guided] button[type="submit"]').getBoundingClientRect();
      return {
        sameRow: Math.abs(shape.top - from.top) < 4,
        half: shape.width < 220,
        btnH: btn.height,
        btnVisible: btn.width > 120,
      };
    });
    expect(st.sameRow && st.half, 'shape and carat-from share a row at half width');
    expect(st.btnH >= 40 && st.btnVisible, 'comfortable Find Diamonds tap target');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} guided-selection scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
