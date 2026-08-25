/* ============================================================
   Diamond Compare tests (LIVE).
   Drives the customer compare feature end-to-end against a
   mocked PostgREST backend: card toggles on the inventory (add /
   remove / persist across reloads / max 4 with an honest
   rejection), the details-page Add-to-Compare kept in sync
   through localStorage, the floating bar (count, chips, Clear,
   Compare Now gated below 2), and compare-diamonds.html fetching
   the LATEST rows by the stored public ids — inactive/archived/
   deleted ids removed safely, differences highlighted, hidden
   prices never leaking, favourites/quote/details actions intact,
   a readable mobile structure, and localStorage holding nothing
   but public ids.
   Run:  node tests/diamond-compare.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://cmp-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAABAAAAAQCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

function seedDiamonds() {
  const base = {
    shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
    measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
    ratio: 1, growth_method: 'CVD', availability: 'In Stock',
    image_path: null, featured: false, active: true, archived_at: null,
    total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: true,
    created_at: '2026-08-10T10:00:00Z',
  };
  return [
    { ...base, id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001' },
    { ...base, id: 'uuid-d2', public_id: 'DIA-SEED0002', stock_number: 'NGD-1002', shape: 'Oval', carat: 2.02, clarity: 'VS1', price_visible: false, total_price: 7777, created_at: '2026-08-09T10:00:00Z' },
    { ...base, id: 'uuid-d3', public_id: 'DIA-SEED0003', stock_number: 'NGD-1003', active: false, created_at: '2026-08-08T10:00:00Z' },
    { ...base, id: 'uuid-d4', public_id: 'DIA-SEED0004', stock_number: 'NGD-1004', archived_at: '2026-08-01T00:00:00Z', created_at: '2026-08-07T10:00:00Z' },
    { ...base, id: 'uuid-d5', public_id: 'DIA-SEED0005', stock_number: 'NGD-1005', carat: 1.2, created_at: '2026-08-06T10:00:00Z' },
    { ...base, id: 'uuid-d6', public_id: 'DIA-SEED0006', stock_number: 'NGD-1006', shape: 'Pear', created_at: '2026-08-05T10:00:00Z' },
    { ...base, id: 'uuid-d7', public_id: 'DIA-SEED0007', stock_number: 'NGD-1007', carat: 1.8, created_at: '2026-08-04T10:00:00Z' },
    { ...base, id: 'uuid-d8', public_id: 'DIA-SEED0008', stock_number: 'NGD-1008', shape: 'Emerald', created_at: '2026-08-03T10:00:00Z' },
  ];
}

const results = [];
let browser;
let SITE;
let compareFetches = [];

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function makeMock() {
  const diamonds = seedDiamonds();
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, obj) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' }, body: '' });
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      return json(401, { code: 'no_session', error_code: 'no_session', msg: 'no session', message: 'no session' });
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = diamonds.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      const pub = url.searchParams.get('public_id') || '';
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      if (pub.startsWith('in.')) {
        const ids = pub.slice(3).replace(/^\(|\)$/g, '').split(',')
          .map((v) => v.replace(/^"|"$/g, '').trim()).filter(Boolean);
        compareFetches.push(req.url());
        rows = rows.filter((d) => ids.includes(d.public_id));
      }
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/favourites' && method === 'GET') {
      return json(200, []);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []); // seo_pages, site_content, site_settings…
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  };
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  try {
    await installCdnRoutes(context);
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock());
    if (opts.preset) {
      await context.addInitScript(
        `localStorage.setItem('ngdDiamondCompare', ${JSON.stringify(JSON.stringify(opts.preset))});`);
    }
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|SwiftShader/i.test(m.text())) {
        consoleErrors.push(m.text());
      }
    });
    await fn(page);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    expect(consoleErrors.length === 0, 'no console errors, got: ' + consoleErrors.join(' | '));
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

const stored = () => JSON.parse(localStorage.getItem('ngdDiamondCompare') || '[]');

async function openInventory(page) {
  await page.goto(SITE + '/diamonds.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-ngd-compare]').length > 0);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('inventory: every card gets an accessible toggle; first add shows the bar, Compare Now gated', {}, async (page) => {
    await openInventory(page);
    const before = await page.evaluate(() => ({
      cards: document.querySelectorAll('.ngd-diamond-card').length,
      toggles: document.querySelectorAll('.ngd-diamond-card [data-ngd-compare]').length,
      semantics: [...document.querySelectorAll('[data-ngd-compare]')].every((b) =>
        b.tagName === 'BUTTON' && b.getAttribute('aria-pressed') === 'false' && (b.getAttribute('aria-label') || '').includes('Compare')),
      detailsHref: document.querySelector('.ngd-diamond-card a[href^="diamond-details.html?id=DIA-"]') !== null,
      barExists: !!document.getElementById('ngd-compare-bar'),
      barHidden: document.getElementById('ngd-compare-bar').hidden,
    }));
    expect(before.cards > 0 && before.toggles === before.cards, 'a toggle on every card, got ' + before.toggles + '/' + before.cards);
    expect(before.semantics, 'real buttons with aria-pressed and a labelled purpose');
    expect(before.detailsHref, 'View Details links by public_id are untouched');
    expect(before.barExists && before.barHidden, 'bar exists but stays hidden at zero selected');

    await page.click('[data-ngd-compare="DIA-SEED0001"]');
    const one = await page.evaluate(() => ({
      pressed: document.querySelector('[data-ngd-compare="DIA-SEED0001"]').getAttribute('aria-pressed'),
      label: document.querySelector('[data-ngd-compare="DIA-SEED0001"]').textContent.trim(),
      stillHere: location.pathname.endsWith('/diamonds.html'),
      barHidden: document.getElementById('ngd-compare-bar').hidden,
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
      goDisabled: document.querySelector('[data-cmp-go]').getAttribute('aria-disabled'),
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
    }));
    expect(one.pressed === 'true' && one.label === '✓ Added', 'toggle pressed with honest label');
    expect(one.stillHere, 'toggling never navigates away');
    expect(!one.barHidden && one.count === '1 selected', 'bar appears with the count');
    expect(one.goDisabled === 'true', 'Compare Now disabled with fewer than 2');
    expect(JSON.stringify(one.storage) === '["DIA-SEED0001"]', 'localStorage holds only the id');

    /* Playwright refuses to click aria-disabled elements; browsers still
       dispatch the event, which is exactly the guard under test here. */
    await page.click('[data-cmp-go]', { force: true });
    const gated = await page.evaluate(() => ({
      stillHere: location.pathname.endsWith('/diamonds.html'),
      msg: document.querySelector('[data-cmp-msg]').textContent,
      msgShown: !document.querySelector('[data-cmp-msg]').hidden,
    }));
    expect(gated.stillHere && gated.msgShown && /Add at least 2 diamonds/.test(gated.msg),
      'gated Compare Now explains itself instead of navigating');
  });

  await scenario('second diamond enables Compare Now; the selection survives a full reload', {}, async (page) => {
    await openInventory(page);
    await page.click('[data-ngd-compare="DIA-SEED0001"]');
    await page.click('[data-ngd-compare="DIA-SEED0002"]');
    const two = await page.evaluate(() => ({
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
      goDisabled: document.querySelector('[data-cmp-go]').getAttribute('aria-disabled'),
      goHref: document.querySelector('[data-cmp-go]').getAttribute('href'),
      chips: document.querySelectorAll('.ngd-cmp-chip').length,
    }));
    expect(two.count === '2 selected' && two.goDisabled === 'false', 'two selected, Compare Now live');
    expect(/compare-diamonds\.html$/.test(two.goHref), 'Compare Now points at the compare page');
    expect(two.chips === 2, 'a chip per selected stone');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('[data-ngd-compare]').length > 0);
    const after = await page.evaluate(() => ({
      pressed: ['DIA-SEED0001', 'DIA-SEED0002'].map((id) =>
        document.querySelector('[data-ngd-compare="' + id + '"]').getAttribute('aria-pressed')),
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
    }));
    expect(after.pressed.every((p) => p === 'true') && after.count === '2 selected',
      'selected state persists after refresh');
  });

  await scenario('removing works from the card toggle and from a bar chip', {
    preset: ['DIA-SEED0001', 'DIA-SEED0002'],
  }, async (page) => {
    await openInventory(page);
    await page.click('[data-ngd-compare="DIA-SEED0001"]'); // toggle off
    const mid = await page.evaluate(stored);
    expect(JSON.stringify(mid) === '["DIA-SEED0002"]', 'card toggle removes its stone, got ' + JSON.stringify(mid));
    await page.click('[data-cmp-remove="DIA-SEED0002"]');
    const end = await page.evaluate(() => ({
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
      barHidden: document.getElementById('ngd-compare-bar').hidden,
      pressed: document.querySelector('[data-ngd-compare="DIA-SEED0002"]').getAttribute('aria-pressed'),
    }));
    expect(end.storage.length === 0 && end.barHidden && end.pressed === 'false',
      'chip removal empties and hides the bar');
  });

  await scenario('a fifth diamond is refused with the honest limit message', {}, async (page) => {
    await openInventory(page);
    for (const id of ['DIA-SEED0001', 'DIA-SEED0002', 'DIA-SEED0005', 'DIA-SEED0006']) {
      await page.click('[data-ngd-compare="' + id + '"]');
    }
    await page.click('[data-ngd-compare="DIA-SEED0007"]');
    const state = await page.evaluate(() => ({
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
      fifth: document.querySelector('[data-ngd-compare="DIA-SEED0007"]').getAttribute('aria-pressed'),
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
      msg: document.querySelector('[data-cmp-msg]').textContent,
      msgShown: !document.querySelector('[data-cmp-msg]').hidden,
    }));
    expect(state.storage.length === 4 && !state.storage.includes('DIA-SEED0007'),
      'max 4 enforced in storage, got ' + JSON.stringify(state.storage));
    expect(state.fifth === 'false', 'fifth toggle stays unpressed');
    expect(state.count === '4 selected · maximum reached', 'bar says the maximum, got ' + state.count);
    expect(state.msgShown && state.msg === 'You can compare up to 4 diamonds.', 'the exact honest message');
  });

  await scenario('Clear empties the selection everywhere', {
    preset: ['DIA-SEED0001', 'DIA-SEED0002', 'DIA-SEED0005'],
  }, async (page) => {
    await openInventory(page);
    await page.click('[data-cmp-clear]');
    const state = await page.evaluate(() => ({
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
      barHidden: document.getElementById('ngd-compare-bar').hidden,
      pressed: document.querySelectorAll('[data-ngd-compare][aria-pressed="true"]').length,
    }));
    expect(state.storage.length === 0 && state.barHidden && state.pressed === 0, 'cleared everywhere');
  });

  await scenario('details page: Add to Compare syncs with the shared state; favourites stay intact', {
    preset: ['DIA-SEED0002'],
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('dd-compare').hidden);
    const before = await page.evaluate(() => ({
      label: document.getElementById('dd-compare').textContent.trim(),
      pressed: document.getElementById('dd-compare').getAttribute('aria-pressed'),
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
      fav: !!document.getElementById('dd-fav') && document.getElementById('dd-fav').hasAttribute('aria-pressed'),
      quote: !!document.getElementById('dd-quote'),
    }));
    expect(before.label === 'Add to Compare' && before.pressed === 'false', 'not yet selected here');
    expect(before.count === '1 selected', 'bar already reflects the inventory selection');
    expect(before.fav && before.quote, 'favourite and quote actions untouched');
    await page.click('#dd-compare');
    const after = await page.evaluate(() => ({
      label: document.getElementById('dd-compare').textContent.trim(),
      pressed: document.getElementById('dd-compare').getAttribute('aria-pressed'),
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
      count: document.querySelector('[data-cmp-count]').textContent.trim(),
    }));
    expect(after.label === 'Remove from Compare' && after.pressed === 'true', 'button flips honestly');
    expect(JSON.stringify(after.storage) === '["DIA-SEED0002","DIA-SEED0001"]' && after.count === '2 selected',
      'shared state updated, got ' + JSON.stringify(after.storage));
    await page.click('#dd-compare');
    const removed = await page.evaluate(() =>
      document.getElementById('dd-compare').textContent.trim() + '|' +
      JSON.stringify(JSON.parse(localStorage.getItem('ngdDiamondCompare'))));
    expect(removed === 'Add to Compare|["DIA-SEED0002"]', 'removing from details works too, got ' + removed);
  });

  await scenario('compare page fetches the LATEST rows by stored ids and highlights differences', {
    preset: ['DIA-SEED0001', 'DIA-SEED0002'],
  }, async (page) => {
    compareFetches = [];
    await page.goto(SITE + '/compare-diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('cmp-wrap').classList.contains('d-none'));
    expect(compareFetches.length === 1 &&
      /public_id=in\./.test(compareFetches[0]) && /active=eq\.true/.test(compareFetches[0]) &&
      /archived_at=is\.null/.test(compareFetches[0]),
      'one live query by the selected public ids, active + non-archived only: ' + compareFetches[0]);
    const state = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#cmp-rows tr')];
      const row = (label) => rows.find((r) => r.querySelector('th').textContent.includes(label));
      const cells = (label) => [...row(label).querySelectorAll('td')].map((td) => td.textContent.trim());
      return {
        columns: document.querySelectorAll('#cmp-head .ngd-cmp-col').length,
        names: [...document.querySelectorAll('.ngd-cmp-name')].map((n) => n.textContent.trim()),
        carat: cells('Carat'), caratDiff: row('Carat').classList.contains('is-diff'),
        colour: cells('Colour'), colourDiff: row('Colour').classList.contains('is-diff'),
        clarity: cells('Clarity'), clarityDiff: row('Clarity').classList.contains('is-diff'),
        price: cells('Price'),
        leaked: document.documentElement.outerHTML.indexOf('7777') !== -1,
        actions: [...document.querySelectorAll('#cmp-head .ngd-cmp-col')].map((col) => ({
          details: !!col.querySelector('a[href^="diamond-details.html?id=DIA-"]'),
          fav: !!col.querySelector('[data-cmp-fav]'),
          quote: !!col.querySelector('[data-cmp-quote]'),
          remove: !!col.querySelector('[data-cmp-remove-col]'),
        })),
        storageRaw: localStorage.getItem('ngdDiamondCompare'),
      };
    });
    expect(state.columns === 2, 'two comparison columns, got ' + state.columns);
    expect(state.names[0] === 'Round · 1.52 ct' && state.names[1] === 'Oval · 2.02 ct',
      'live DB values render (never stale objects), got ' + state.names.join(' / '));
    expect(state.carat.join('|') === '1.52 ct|2.02 ct' && state.caratDiff, 'carat differs and is marked');
    expect(state.clarity.join('|') === 'VVS1|VS1' && state.clarityDiff, 'clarity differs and is marked');
    expect(state.colour.join('|') === 'D|D' && !state.colourDiff, 'identical colour stays unmarked');
    expect(state.price.join('|') === 'USD 18,500|Price on Request', 'price only where the site exposes it');
    expect(!state.leaked, 'the hidden amount never reaches the HTML');
    expect(state.actions.every((a) => a.details && a.fav && a.quote && a.remove),
      'every column offers View Details / Favourite / Quote / Remove');
    expect(/^\["DIA-[A-Z0-9]{8}","DIA-[A-Z0-9]{8}"\]$/.test(state.storageRaw),
      'localStorage still holds only public ids — no objects, no secrets: ' + state.storageRaw);
  });

  await scenario('inactive, archived and deleted ids are dropped safely with an honest notice', {
    preset: ['DIA-SEED0001', 'DIA-SEED0003', 'DIA-GONE0009'],
  }, async (page) => {
    await page.goto(SITE + '/compare-diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('cmp-wrap').classList.contains('d-none'));
    const state = await page.evaluate(() => ({
      columns: document.querySelectorAll('#cmp-head .ngd-cmp-col').length,
      notice: document.getElementById('cmp-status').textContent,
      note: document.getElementById('cmp-note').textContent.trim(),
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
    }));
    expect(state.columns === 1, 'only the still-available stone renders');
    expect(/2 selected diamonds are no longer available/.test(state.notice), 'honest removal notice, got ' + state.notice);
    expect(state.note === 'Add at least one more diamond to compare.', 'single-stone guidance shown');
    expect(JSON.stringify(state.storage) === '["DIA-SEED0001"]', 'stale ids removed from storage');
  });

  await scenario('empty state invites browsing; column Remove re-renders from cache; Clear ends it', {
    preset: ['DIA-SEED0001', 'DIA-SEED0002'],
  }, async (page) => {
    compareFetches = [];
    await page.goto(SITE + '/compare-diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('cmp-wrap').classList.contains('d-none'));
    await page.click('[data-cmp-remove-col="DIA-SEED0002"]');
    await page.waitForFunction(() => document.querySelectorAll('#cmp-head .ngd-cmp-col').length === 1);
    expect(compareFetches.length === 1, 'column removal re-renders from cache without refetching');
    await page.click('#cmp-clear');
    await page.waitForFunction(() => !document.getElementById('cmp-empty').classList.contains('d-none'));
    const empty = await page.evaluate(() => ({
      copy: document.getElementById('cmp-empty').textContent,
      browse: document.querySelector('#cmp-empty a').getAttribute('href'),
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare')),
    }));
    expect(/Choose diamonds from our inventory to compare\./.test(empty.copy), 'empty-state copy');
    expect(empty.browse === 'diamonds.html' && /Browse Diamonds/.test(empty.copy), 'Browse Diamonds CTA');
    expect(empty.storage.length === 0, 'storage cleared');
  });

  await scenario('mobile 390: sideways scroll with a sticky, readable attribute column — no page overflow', {
    preset: ['DIA-SEED0001', 'DIA-SEED0002', 'DIA-SEED0005', 'DIA-SEED0006'],
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await page.goto(SITE + '/compare-diamonds.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('cmp-wrap').classList.contains('d-none'));
    const state = await page.evaluate(() => {
      const scroll = document.querySelector('.ngd-cmp-scroll');
      const label = document.querySelector('#cmp-rows th[scope="row"]');
      return {
        columns: document.querySelectorAll('#cmp-head .ngd-cmp-col').length,
        overflow: getComputedStyle(scroll).overflowX,
        scrolls: scroll.scrollWidth > scroll.clientWidth + 10,
        sticky: getComputedStyle(label).position === 'sticky',
        labelWidth: label.getBoundingClientRect().width,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    expect(state.columns === 4, 'all four columns render');
    expect(state.overflow === 'auto' && state.scrolls, 'the table scrolls sideways inside its card');
    expect(state.sticky && state.labelWidth > 90, 'attribute labels stay pinned and readable');
    expect(!state.pageOverflow, 'the page itself never scrolls sideways');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} diamond-compare scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
