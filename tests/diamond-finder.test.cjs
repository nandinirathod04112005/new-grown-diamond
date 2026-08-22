/* ============================================================
   Smart Diamond Finder tests (LIVE).
   Drives diamond-finder.html end-to-end against a PostgREST-style
   mocked Supabase backend: the guided steps (shape single-select,
   carat presets + range, colour/clarity/cut multi-select, the
   optional budget), the deterministic matching (hard Supabase
   filters for active/non-archived/shape/carat, preference scoring
   with Best Match first), tiered relaxation ("Close alternatives",
   never fake stones), the shared NGDDiamondCard renderer with the
   Compare toggle, shareable URL params (restore + junk ignored),
   Start Over, hidden prices never leaking, the honest empty and
   error states, the analytics event carrying preferences only,
   mobile usability, and the two entry points (homepage mini
   finder GET form + the inventory toolbar CTA).
   Run:  node tests/diamond-finder.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://finder-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };

function seedDiamonds() {
  const base = {
    shape: 'Oval', color: 'E', clarity: 'VS1', cut: 'Excellent',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', availability: 'In Stock', image_path: null,
    featured: false, active: true, archived_at: null,
    total_price: 8000, currency: 'USD', price_visible: false,
  };
  let t = 20;
  const at = () => `2026-08-${String(t--).padStart(2, '0')}T10:00:00Z`;
  return [
    { ...base, id: 'u1', public_id: 'DIA-FIND0001', stock_number: 'NGD-2001', carat: 1.5, created_at: at() },
    { ...base, id: 'u2', public_id: 'DIA-FIND0002', stock_number: 'NGD-2002', carat: 1.2, color: 'F', clarity: 'VS2', cut: 'Very Good', created_at: at() },
    { ...base, id: 'u3', public_id: 'DIA-FIND0003', stock_number: 'NGD-2003', carat: 3.2, color: 'D', clarity: 'IF', cut: 'Ideal', created_at: at() },
    { ...base, id: 'u4', public_id: 'DIA-FIND0004', stock_number: 'NGD-2004', shape: 'Round', carat: 1.5, created_at: at() },
    { ...base, id: 'u5', public_id: 'DIA-FIND0005', stock_number: 'NGD-INACT', carat: 1.5, active: false, created_at: at() },
    { ...base, id: 'u6', public_id: 'DIA-FIND0006', stock_number: 'NGD-ARCHD', carat: 1.5, archived_at: '2026-07-01T00:00:00Z', created_at: at() },
    { ...base, id: 'u7', public_id: 'DIA-FIND0007', stock_number: 'NGD-2007', carat: 1.8, color: 'G', clarity: 'SI1', cut: 'Good', created_at: at() },
    { ...base, id: 'u8', public_id: 'DIA-FIND0008', stock_number: 'NGD-2008', carat: 1.05, created_at: at() },
    { ...base, id: 'u9', public_id: 'DIA-FIND0009', stock_number: 'NGD-2009', carat: 1.6, total_price: 12000, price_visible: true, created_at: at() },
    { ...base, id: 'u10', public_id: 'DIA-FIND0010', stock_number: 'NGD-2010', carat: 1.3, total_price: 99999, price_visible: false, created_at: at() },
  ];
}

function makeMock(opts = {}) {
  const diamonds = seedDiamonds();
  const queries = [];
  const state = { failed: 0 };
  async function handler(route) {
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
      queries.push({
        shape: url.searchParams.get('shape'),
        carat: url.searchParams.getAll('carat'),
        active: url.searchParams.get('active'),
        archived: url.searchParams.get('archived_at'),
        select: url.searchParams.get('select') || '',
      });
      if (opts.failDiamonds === 'once' && state.failed === 0) {
        state.failed++;
        return json(500, { code: 'XX000', message: 'mock backend exploded — permission denied secret detail', details: null, hint: null });
      }
      let rows = opts.emptyInventory ? [] : diamonds.slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      const shape = url.searchParams.get('shape') || '';
      if (shape.startsWith('eq.')) rows = rows.filter((d) => d.shape === shape.slice(3));
      url.searchParams.getAll('carat').forEach((f) => {
        if (f.startsWith('gte.')) rows = rows.filter((d) => d.carat >= parseFloat(f.slice(4)));
        if (f.startsWith('lte.')) rows = rows.filter((d) => d.carat <= parseFloat(f.slice(4)));
      });
      rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const limit = parseInt(url.searchParams.get('limit') || '0', 10);
      if (limit) rows = rows.slice(0, limit);
      return json(200, rows);
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') return json(200, []);
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, diamonds, queries };
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    const backend = makeMock(opts);
    await context.route(SB_HOST + '/**', backend.handler);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|SwiftShader/i.test(m.text())) {
        consoleErrors.push(m.text());
      }
    });
    await fn(page, backend);
    expect(pageErrors.length === 0, 'no uncaught page errors, got: ' + pageErrors.join(' | '));
    if (!opts.skipConsole) {
      expect(consoleErrors.length === 0, 'no console errors, got: ' + consoleErrors.join(' | '));
    }
    results.push({ name, ok: true });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, ok: false });
    console.log('FAIL  ' + name + '\n      ' + String(err).split('\n')[0]);
  } finally {
    await context.close();
  }
}

async function openFinder(page, query) {
  await page.goto(SITE + '/diamond-finder.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDDiamondFinder &&
    document.querySelectorAll('#df-steps .ngd-find-step').length === 6);
}

async function waitResults(page) {
  await page.waitForFunction(() => !document.getElementById('df-results').hidden, null, { timeout: 10000 });
}

function gridStocks(page, gridId) {
  return page.evaluate((id) =>
    [...document.querySelectorAll('#' + id + ' .ngd-stock-no')].map((el) => el.textContent.trim()), gridId);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('the finder page loads: 6 guided steps, shape options, accessible controls', {}, async (page) => {
    await openFinder(page);
    const state = await page.evaluate(() => ({
      title: document.querySelector('#df-app h1').textContent.replace(/\s+/g, ' ').trim(),
      steps: [...document.querySelectorAll('#df-steps .ngd-find-step')].map((c) => c.textContent.trim()),
      activeChip: (document.querySelector('#df-steps [aria-current="step"]') || { textContent: '' }).textContent,
      shapeButtons: [...document.querySelectorAll('#df-opts-shape .ngd-find-opt')].map((b) => b.getAttribute('value')),
      allPressed: [...document.querySelectorAll('#df-opts-shape .ngd-find-opt')].every((b) => b.getAttribute('aria-pressed') === 'false'),
      groups: document.querySelectorAll('#df-app [role="group"]').length,
      reset: !!document.getElementById('df-reset'),
      resultsHidden: document.getElementById('df-results').hidden,
      shapePanelShown: !document.getElementById('df-panel-shape').hidden,
      caratPanelHidden: document.getElementById('df-panel-carat').hidden,
    }));
    expect(/Find your diamond/i.test(state.title), 'finder heading, got ' + state.title);
    expect(state.steps.length === 6 && /Shape/.test(state.steps[0]) && /Budget/.test(state.steps[5]),
      'six guided steps, got ' + state.steps.join(','));
    expect(/Shape/.test(state.activeChip), 'step 1 marked current');
    expect(state.shapeButtons.join(',') === 'Round,Oval,Emerald,Pear,Princess,Cushion,Radiant,Marquise',
      'the supported shapes only, got ' + state.shapeButtons.join(','));
    expect(state.allPressed && state.groups >= 5, 'toggle buttons expose aria-pressed inside labelled groups');
    expect(state.reset && state.resultsHidden, 'Start Over offered, no premature results');
    expect(state.shapePanelShown && state.caratPanelHidden, 'only the first panel shows');
  });

  await scenario('guided flow: shape → carat preset + range → colour → clarity → search with real hard filters', {}, async (page, backend) => {
    await openFinder(page);
    await page.click('#df-opts-shape [value="Oval"]');
    let pressed = await page.evaluate(() =>
      document.querySelector('#df-opts-shape [value="Oval"]').getAttribute('aria-pressed'));
    expect(pressed === 'true', 'Oval selected');
    await page.click('#df-next');
    await page.waitForSelector('#df-panel-carat:not([hidden])');
    await page.click('[data-carat-preset="1"]');
    let preset = await page.evaluate(() => ({
      min: document.getElementById('df-carat-min').value,
      max: document.getElementById('df-carat-max').value,
      on: document.querySelector('[data-carat-preset="1"]').getAttribute('aria-pressed'),
    }));
    expect(preset.min === '1' && preset.max === '1.49' && preset.on === 'true', 'preset fills the range, got ' + JSON.stringify(preset));
    await page.fill('#df-carat-max', '2');
    preset = await page.evaluate(() =>
      document.querySelector('[data-carat-preset="1"]').getAttribute('aria-pressed'));
    expect(preset === 'false', 'a custom range releases the preset');
    await page.click('#df-next');
    await page.click('#df-opts-colour [value="E"]');
    await page.click('#df-next');
    await page.click('#df-opts-clarity [value="VS1"]');
    await page.click('#df-next');
    await page.click('#df-next');
    const budgetNote = await page.evaluate(() =>
      document.getElementById('df-panel-budget').textContent);
    expect(/Applies only where a price is public/.test(budgetNote), 'budget clearly marked optional/public-only');
    await page.click('#df-search');
    await waitResults(page);
    const q = backend.queries[0];
    expect(q.active === 'eq.true' && q.archived === 'is.null', 'active + non-archived enforced in the query');
    expect(q.shape === 'eq.Oval', 'shape is a hard Supabase filter, got ' + q.shape);
    expect(q.carat.indexOf('gte.1') !== -1 && q.carat.indexOf('lte.2') !== -1,
      'carat range is a hard Supabase filter, got ' + q.carat.join(','));
    expect(!/internal_notes|created_by/.test(q.select), 'no internal columns requested');
    expect(backend.queries.length === 1, 'enough exact results → a single focused query, got ' + backend.queries.length);
  });

  await scenario('deterministic ranking: exact stones first as Best Match, near misses as Close Match with reasons', {}, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2&colour=E&clarity=VS1');
    await waitResults(page);
    const best = await gridStocks(page, 'df-best-grid');
    const close = await gridStocks(page, 'df-close-grid');
    expect(best.join(',') === 'NGD-2001,NGD-2009,NGD-2010,NGD-2008',
      'exact matches ranked by carat closeness, got ' + best.join(','));
    expect(close.join(',') === 'NGD-2002,NGD-2007', 'near misses ranked second, got ' + close.join(','));
    const detail = await page.evaluate(() => ({
      bestLabels: [...document.querySelectorAll('#df-best-grid .ngd-find-label')].map((c) => c.textContent),
      closeLabels: [...document.querySelectorAll('#df-close-grid .ngd-find-label')].map((c) => c.textContent),
      cards: document.querySelectorAll('#df-results .ngd-diamond-card').length,
      firstReasons: (document.querySelector('#df-best-grid .ngd-find-reasons') || { textContent: '' }).textContent,
      detailHrefs: [...document.querySelectorAll('#df-best-grid a[href^="diamond-details.html?id="]')].length,
      summary: document.getElementById('df-summary').textContent,
      percentSigns: /\d+\s*%/.test(document.getElementById('df-results').textContent),
      noexactHidden: document.getElementById('df-noexact').hidden,
    }));
    expect(detail.bestLabels.every((l) => l === 'Best Match') && detail.bestLabels.length === 4, 'Best Match labels');
    expect(detail.closeLabels.every((l) => l === 'Close Match'), 'Close Match labels, got ' + detail.closeLabels.join(','));
    expect(detail.cards === 6, 'the shared diamond card renderer is reused for every result');
    expect(/Matches your Oval preference/.test(detail.firstReasons) &&
      /Within your selected carat range/.test(detail.firstReasons),
      'factual neutral reasons, got ' + detail.firstReasons);
    expect(detail.detailHrefs === 4, 'every card links to the existing details page');
    expect(/Showing 6 of \d+ matching stones/.test(detail.summary), 'honest summary, got ' + detail.summary);
    expect(!detail.percentSigns, 'no invented match percentages');
    expect(detail.noexactHidden, 'no relaxation notice when exact matches exist');
  });

  await scenario('inactive and archived stones never appear', {}, async (page) => {
    await openFinder(page, '?shape=Oval');
    await waitResults(page);
    const text = await page.evaluate(() => document.getElementById('df-results').textContent);
    expect(text.indexOf('NGD-INACT') === -1 && text.indexOf('NGD-ARCHD') === -1,
      'inactive/archived stock numbers are absent');
  });

  await scenario('relaxation: no exact match → honest notice + Close alternatives, never fake stones', {}, async (page, backend) => {
    await openFinder(page, '?shape=Oval&minCarat=5');
    await waitResults(page);
    const state = await page.evaluate(() => ({
      noexactShown: !document.getElementById('df-noexact').hidden,
      bestHidden: document.getElementById('df-best').hidden,
      closeTitle: document.getElementById('df-close-title').textContent,
      labels: [...document.querySelectorAll('#df-close-grid .ngd-find-label')].map((c) => c.textContent),
      emptyHidden: document.getElementById('df-empty').hidden,
      browseAll: !!document.querySelector('#df-results a[href="diamonds.html"]'),
    }));
    expect(state.noexactShown && state.bestHidden, 'the no-exact-match notice shows');
    expect(state.closeTitle === 'Close alternatives', 'relaxed heading, got ' + state.closeTitle);
    expect(state.labels.length === 6 && state.labels.every((l) => l === 'Similar Option'),
      'relaxed stones labelled Similar Option, got ' + state.labels.join(','));
    const first = await gridStocks(page, 'df-close-grid');
    expect(first[0] === 'NGD-2003', 'nearest-by-carat Oval first, got ' + first[0]);
    expect(state.emptyHidden && state.browseAll, 'alternatives + View All Diamonds instead of a blank page');
    expect(backend.queries.length === 2, 'one relaxation query, not one per stone — got ' + backend.queries.length);
  });

  await scenario('empty inventory: the honest empty state with View All Diamonds', { emptyInventory: true }, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1');
    await waitResults(page);
    const state = await page.evaluate(() => ({
      emptyShown: !document.getElementById('df-empty').hidden,
      emptyText: document.getElementById('df-empty').textContent,
      browse: !!document.querySelector('#df-empty a[href="diamonds.html"]'),
      cards: document.querySelectorAll('#df-results .ngd-diamond-card').length,
    }));
    expect(state.emptyShown && /don’t currently have an exact match/.test(state.emptyText),
      'the honest empty message shows');
    expect(state.browse && state.cards === 0, 'View All Diamonds offered, no fake inventory');
  });

  await scenario('Compare rides along: the shared toggle works from finder results', {}, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2&colour=E&clarity=VS1');
    await waitResults(page);
    await page.click('#df-best-grid [data-ngd-compare="DIA-FIND0001"]');
    const state = await page.evaluate(() => ({
      pressed: document.querySelector('#df-best-grid [data-ngd-compare="DIA-FIND0001"]').getAttribute('aria-pressed'),
      label: document.querySelector('#df-best-grid [data-ngd-compare="DIA-FIND0001"]').textContent.trim(),
      stored: JSON.parse(localStorage.getItem('ngdDiamondCompare') || '[]'),
      bar: !!document.querySelector('[data-cmp-go]'),
    }));
    expect(state.pressed === 'true' && state.label === '✓ Added', 'the card toggle flips on');
    expect(state.stored.length === 1 && state.stored[0] === 'DIA-FIND0001',
      'the shared ids-only compare state is reused, got ' + JSON.stringify(state.stored));
    expect(state.bar, 'the shared floating compare bar is present');
  });

  await scenario('shareable URL restores every selection; junk values are ignored', {}, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2&colour=E&clarity=VS1,VVS2&cut=Excellent&maxBudget=20000');
    await waitResults(page);
    const state = await page.evaluate(() => ({
      shape: document.querySelector('#df-opts-shape [value="Oval"]').getAttribute('aria-pressed'),
      min: document.getElementById('df-carat-min').value,
      max: document.getElementById('df-carat-max').value,
      colour: document.querySelector('#df-opts-colour [value="E"]').getAttribute('aria-pressed'),
      vs1: document.querySelector('#df-opts-clarity [value="VS1"]').getAttribute('aria-pressed'),
      vvs2: document.querySelector('#df-opts-clarity [value="VVS2"]').getAttribute('aria-pressed'),
      cut: document.querySelector('#df-opts-cut [value="Excellent"]').getAttribute('aria-pressed'),
      budgetMax: document.getElementById('df-budget-max').value,
    }));
    expect(state.shape === 'true' && state.min === '1' && state.max === '2', 'shape + carat restored');
    expect(state.colour === 'true' && state.vs1 === 'true' && state.vvs2 === 'true' && state.cut === 'true' &&
      state.budgetMax === '20000', 'multi-selects + budget restored, got ' + JSON.stringify(state));

    await page.goto(SITE + '/diamond-finder.html?shape=Trillion&clarity=XX&minCarat=junk', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#df-steps .ngd-find-step').length === 6);
    const junk = await page.evaluate(() => ({
      anyPressed: [...document.querySelectorAll('[data-find-key]')].some((b) => b.getAttribute('aria-pressed') === 'true'),
      min: document.getElementById('df-carat-min').value,
      xx: document.body.textContent.indexOf('XX') !== -1,
    }));
    expect(!junk.anyPressed && junk.min === '' && !junk.xx, 'unsupported values are dropped silently');
  });

  await scenario('Start Over clears selections, results and the URL', {}, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2&colour=E');
    await waitResults(page);
    await page.click('#df-reset');
    const state = await page.evaluate(() => ({
      pressed: [...document.querySelectorAll('[data-find-key]')].filter((b) => b.getAttribute('aria-pressed') === 'true').length,
      min: document.getElementById('df-carat-min').value,
      budgetMin: document.getElementById('df-budget-min').value,
      resultsHidden: document.getElementById('df-results').hidden,
      search: window.location.search,
      firstPanel: !document.getElementById('df-panel-shape').hidden,
    }));
    expect(state.pressed === 0 && state.min === '' && state.budgetMin === '', 'every selection cleared');
    expect(state.resultsHidden && state.search === '' && state.firstPanel,
      'results hidden, URL cleaned, back to step one — got "' + state.search + '"');
  });

  await scenario('budget: verified only against PUBLIC prices — hidden amounts never leak or exclude silently', {}, async (page) => {
    await openFinder(page, '?shape=Oval&minBudget=1000&maxBudget=20000');
    await waitResults(page);
    const best = await gridStocks(page, 'df-best-grid');
    const close = await gridStocks(page, 'df-close-grid');
    expect(best.join(',') === 'NGD-2009', 'only the stone with a public in-budget price is a Best Match, got ' + best.join(','));
    expect(close.indexOf('NGD-2010') !== -1, 'hidden-price stones stay listed as close matches');
    const leak = await page.evaluate(() => ({
      hidden: document.documentElement.outerHTML.indexOf('99999') !== -1,
      publicPrice: document.getElementById('df-results').textContent.indexOf('12,000') !== -1 ||
        document.getElementById('df-results').textContent.indexOf('12000') !== -1,
      reasons: [...document.querySelectorAll('#df-best-grid .ngd-find-reasons')].map((r) => r.textContent).join(' '),
    }));
    expect(!leak.hidden, 'a hidden price never reaches the page in any form');
    expect(!leak.publicPrice, 'cards keep their price-free layout');
    expect(/Within your budget/.test(leak.reasons), 'the budget reason stays factual');
  });

  await scenario('network failure: a safe error card with Retry, no raw Supabase internals', { failDiamonds: 'once', skipConsole: true }, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2');
    await page.waitForFunction(() => !document.getElementById('df-error').hidden, null, { timeout: 10000 });
    const err = await page.evaluate(() => ({
      text: document.getElementById('df-error').textContent,
      body: document.body.textContent,
      retry: !!document.getElementById('df-retry'),
    }));
    expect(/couldn’t search the inventory/i.test(err.text) && err.retry, 'friendly error + Retry');
    expect(err.body.indexOf('permission denied') === -1 && err.body.indexOf('exploded') === -1,
      'raw backend internals never reach customers');
    await page.click('#df-retry');
    await waitResults(page);
    const cards = await page.evaluate(() => document.querySelectorAll('#df-results .ngd-diamond-card').length);
    expect(cards > 0, 'Retry recovers into real results');
  });

  await scenario('the analytics event carries preferences only — never identity or tokens', {}, async (page) => {
    await openFinder(page);
    await page.evaluate(() => {
      window.__finderEvents = [];
      window.addEventListener('ngd:diamond-finder-search', (e) => window.__finderEvents.push(e.detail));
    });
    await page.click('#df-opts-shape [value="Oval"]');
    await page.click('#df-next');
    await page.waitForSelector('#df-panel-carat:not([hidden])');
    await page.fill('#df-carat-min', '1');
    await page.click('#df-search');
    await waitResults(page);
    const events = await page.evaluate(() => window.__finderEvents);
    expect(events.length === 1, 'one event per search');
    const detail = events[0];
    expect(detail.shape === 'Oval' && detail.minCarat === 1 && detail.maxCarat === null &&
      detail.hasBudget === false, 'preferences captured, got ' + JSON.stringify(detail));
    expect(Object.keys(detail).sort().join(',') === 'clarities,colours,cuts,hasBudget,maxCarat,minCarat,shape',
      'exactly the documented keys — no identity, email, phone or tokens: ' + JSON.stringify(detail));
  });

  await scenario('mobile 390: large tap targets, no overflow, single-column results', {
    viewport: { width: 390, height: 844 },
  }, async (page) => {
    await openFinder(page, '?shape=Oval&minCarat=1&maxCarat=2');
    await waitResults(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow, 'no horizontal overflow');
    const opt = await page.locator('#df-opts-shape .ngd-find-opt').first().boundingBox();
    expect(opt && opt.height >= 40, 'option buttons stay comfortably tappable, got ' + (opt && opt.height));
    const next = await page.locator('#df-next').boundingBox();
    expect(next && next.height >= 40, 'Next control stays tappable');
    const card = await page.locator('#df-best-grid .ngd-diamond-card').first().boundingBox();
    expect(card && card.width >= 300, 'results use the responsive single-column card layout, got ' + (card && card.width));
  });

  await scenario('entry points: the inventory CTA and the homepage mini finder hand off via URL params', { skipConsole: true }, async (page) => {
    await page.goto(SITE + '/diamonds.html', { waitUntil: 'domcontentloaded' });
    const cta = await page.evaluate(() => {
      const link = document.getElementById('inv-finder-link');
      return link ? { href: link.getAttribute('href'), text: link.textContent.trim() } : null;
    });
    expect(cta && cta.href === 'diamond-finder.html' && cta.text === 'Find Your Diamond',
      'inventory toolbar CTA, got ' + JSON.stringify(cta));

    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#home-mini-finder');
    const mini = await page.evaluate(() => ({
      action: document.getElementById('home-mini-finder').getAttribute('action'),
      method: (document.getElementById('home-mini-finder').getAttribute('method') || '').toLowerCase(),
    }));
    expect(mini.action === 'diamond-finder.html' && mini.method === 'get', 'mini finder is a plain GET form');
    await page.selectOption('#mf-shape', 'Oval');
    await page.fill('#mf-min-carat', '1');
    await page.click('#home-mini-finder button[type="submit"]');
    await page.waitForURL('**/diamond-finder.html?*', { timeout: 10000 });
    await page.waitForFunction(() => !document.getElementById('df-results').hidden, null, { timeout: 10000 });
    const handoff = await page.evaluate(() => ({
      shape: document.querySelector('#df-opts-shape [value="Oval"]').getAttribute('aria-pressed'),
      min: document.getElementById('df-carat-min').value,
      cards: document.querySelectorAll('#df-results .ngd-diamond-card').length,
    }));
    expect(handoff.shape === 'true' && handoff.min === '1' && handoff.cards > 0,
      'homepage choices preselect the full finder and run the search, got ' + JSON.stringify(handoff));
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} diamond-finder scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
