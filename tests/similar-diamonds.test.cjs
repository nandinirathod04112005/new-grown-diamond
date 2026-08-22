/* ============================================================
   Similar Diamonds tests (LIVE).
   Drives the shared deterministic engine (assets/js/
   similar-diamonds.js) on diamond-details.html: shape-first
   candidate queries with public/active filters, JavaScript
   ranking (same shape → closer carat → colour/clarity/cut/lab
   closeness) with deterministic tie-breaks, neutral match
   labels, the six-card cap, tier relaxation when the shape has
   no siblings, the honest zero-result state with a Browse All
   path, a failed lookup hiding only the section (the details
   page keeps working), the current/inactive/archived stones
   never appearing, no price columns in any candidate query,
   working Compare + View Details on the cards (favourite and
   the other page actions untouched), responsive markup and
   zero console errors.
   Run:  node tests/similar-diamonds.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://sim-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };

function stone(overrides) {
  return Object.assign({
    shape: 'Round', carat: 1.5, color: 'F', clarity: 'VS1', cut: 'Ideal',
    polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
    laboratory: 'IGI', report_number: 'LG700', certificate_number: 'LG700',
    certificate_url: null, measurements: null, depth_percentage: null,
    table_percentage: null, ratio: null, growth_method: 'CVD',
    availability: 'In Stock', image_path: null, featured: false,
    active: true, archived_at: null, total_price: 18500, price_per_carat: null,
    currency: 'USD', price_visible: false, created_at: '2026-08-01T10:00:00Z',
  }, overrides);
}

/* current: Round 1.50 F VS1 Ideal IGI. Expected ranking:
   A 193 > B 186 > C 175 > D 168 > F 155(diff 0) > E 155(diff 1.1) */
const RANKED = [
  stone({ id: 'u-c', public_id: 'DIA-CURR0001', stock_number: 'NGD-C' }),
  stone({ id: 'u-a', public_id: 'DIA-RANK000A', stock_number: 'NGD-A', carat: 1.52 }),
  stone({ id: 'u-b', public_id: 'DIA-RANK000B', stock_number: 'NGD-B', carat: 1.45, laboratory: 'GIA' }),
  stone({ id: 'u-cc', public_id: 'DIA-RANK000C', stock_number: 'NGD-CC', color: 'G', clarity: 'VS2' }),
  stone({ id: 'u-d', public_id: 'DIA-RANK000D', stock_number: 'NGD-D', carat: 1.9 }),
  stone({ id: 'u-e', public_id: 'DIA-RANK000E', stock_number: 'NGD-E', carat: 2.6 }),
  stone({ id: 'u-f', public_id: 'DIA-RANK000F', stock_number: 'NGD-F', color: 'M', clarity: 'I1' }),
  stone({ id: 'u-x', public_id: 'DIA-INACT00X', stock_number: 'NGD-X', active: false }),
  stone({ id: 'u-y', public_id: 'DIA-ARCHV00Y', stock_number: 'NGD-Y', archived_at: '2026-08-01T00:00:00Z' }),
];

const LONELY = [
  stone({ id: 'u-m', public_id: 'DIA-CURR0002', stock_number: 'NGD-M', shape: 'Marquise', carat: 1.5 }),
  stone({ id: 'u-o', public_id: 'DIA-NEARBY01', stock_number: 'NGD-O1', shape: 'Oval', carat: 1.6 }),
  stone({ id: 'u-p', public_id: 'DIA-NEARBY02', stock_number: 'NGD-P1', shape: 'Pear', carat: 1.4 }),
  stone({ id: 'u-q', public_id: 'DIA-FARAWAY1', stock_number: 'NGD-Q1', shape: 'Emerald', carat: 5.0 }),
];

const results = [];
let browser;
let SITE;
let candidateQueries = [];

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

function makeMock(opts) {
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
      let rows = (opts.rows || []).slice();
      const pub = url.searchParams.get('public_id') || '';
      const isCandidateQuery = pub.startsWith('neq.');
      if (isCandidateQuery) {
        candidateQueries.push(req.url());
        if (opts.failSimilar) return json(500, { message: 'mock outage' });
      }
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((d) => d.active === true);
      if (url.searchParams.get('archived_at') === 'is.null') rows = rows.filter((d) => !d.archived_at);
      if (pub.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pub.slice(3));
      if (pub.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pub.slice(4));
      const shape = url.searchParams.get('shape') || '';
      if (shape.startsWith('eq.')) rows = rows.filter((d) => d.shape === shape.slice(3));
      const gte = url.searchParams.get('carat');
      /* PostgREST repeats the key for gte+lte — URLSearchParams.getAll covers both */
      url.searchParams.getAll('carat').forEach((cond) => {
        if (cond.startsWith('gte.')) rows = rows.filter((d) => d.carat >= Number(cond.slice(4)));
        if (cond.startsWith('lte.')) rows = rows.filter((d) => d.carat <= Number(cond.slice(4)));
      });
      return json(200, rows);
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []);
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
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ contentType: 'application/javascript', body: TEST_CONFIG }));
    await context.route(SB_HOST + '/**', makeMock(opts));
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

async function openStone(page, id, expectSimilar) {
  await page.goto(SITE + '/diamond-details.html?id=' + id, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('dd-stock').textContent.trim().length > 0);
  if (expectSimilar) {
    await page.waitForFunction(() =>
      document.querySelectorAll('#dd-similar .ngd-diamond-card').length > 0, null, { timeout: 10000 });
  }
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('deterministic ranking: shape first, then carat closeness, then grade closeness', {
    rows: RANKED,
  }, async (page) => {
    candidateQueries = [];
    await openStone(page, 'DIA-CURR0001', true);
    const state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#dd-similar .ngd-diamond-card .ngd-stock-no')].map((s) => s.textContent.trim()),
      labels: [...document.querySelectorAll('#dd-similar .ngd-sim-label')].map((l) => l.textContent),
      hrefs: [...document.querySelectorAll('#dd-similar a.ngd-btn[href^="diamond-details"]')].map((a) => a.getAttribute('href')),
      emptyHidden: document.getElementById('dd-similar-empty').hidden,
      heading: document.querySelector('#dd-similar-wrap h2').textContent.trim(),
      subtitle: document.querySelector('#dd-similar-wrap p.ngd-text-muted').textContent,
      leaked: document.documentElement.outerHTML.indexOf('18500') !== -1,
    }));
    expect(state.heading === 'Similar Diamonds' && /comparable stones/.test(state.subtitle),
      'section heading + subtitle, got ' + state.heading);
    expect(state.ids.join(',') === 'NGD-A,NGD-B,NGD-CC,NGD-D,NGD-F,NGD-E',
      'deterministic rank order (same shape > closer carat > closer grades, ties by carat distance), got ' + state.ids.join(','));
    expect(!state.ids.includes('NGD-C'), 'the current stone never recommends itself');
    expect(!state.ids.includes('NGD-X') && !state.ids.includes('NGD-Y'), 'inactive + archived stones excluded');
    expect(state.labels.every((l) => l === 'Same Shape'), 'neutral labels only, got ' + state.labels.join(','));
    expect(state.hrefs.every((h) => /diamond-details\.html\?id=DIA-RANK000[A-F]$/.test(h)),
      'cards link to the correct details pages, got ' + state.hrefs.join(','));
    expect(state.emptyHidden && !state.leaked, 'no empty state, no hidden price anywhere in the page');
    /* enough same-shape stones — a single focused candidate query */
    expect(candidateQueries.length === 1 && /shape=eq\.Round/.test(candidateQueries[0]) &&
      /active=eq\.true/.test(candidateQueries[0]) && /archived_at=is\.null/.test(candidateQueries[0]),
      'one shape-first candidate query with public filters: ' + candidateQueries.join(' | '));
    const select = new URL(candidateQueries[0]).searchParams.get('select');
    expect(!/price|internal|created_by|supplier/i.test(select),
      'candidate query selects public columns only, got ' + select);
  });

  await scenario('a lonely shape relaxes tiers and still offers close-carat alternatives', {
    rows: LONELY,
  }, async (page) => {
    candidateQueries = [];
    await openStone(page, 'DIA-CURR0002', true);
    const state = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#dd-similar .ngd-diamond-card .ngd-stock-no')].map((s) => s.textContent.trim()),
      labels: [...document.querySelectorAll('#dd-similar .ngd-sim-label')].map((l) => l.textContent),
    }));
    expect(state.ids.length === 3, 'alternatives still offered, got ' + state.ids.join(','));
    expect(state.ids[0] === 'NGD-P1' || state.ids[0] === 'NGD-O1', 'closest carats lead');
    expect(state.ids[2] === 'NGD-Q1', 'the far stone ranks last');
    expect(state.labels[0] === 'Similar Carat' && state.labels[2] === 'Alternative',
      'labels stay honest per tier, got ' + state.labels.join(','));
    expect(candidateQueries.length >= 2, 'relaxation widened the search, got ' + candidateQueries.length + ' queries');
  });

  await scenario('zero candidates: honest message + Browse All Diamonds, page unharmed', {
    rows: [stone({ id: 'u-solo', public_id: 'DIA-CURR0001', stock_number: 'NGD-C' })],
  }, async (page) => {
    await openStone(page, 'DIA-CURR0001', false);
    await page.waitForFunction(() => !document.getElementById('dd-similar-empty').hidden);
    const state = await page.evaluate(() => ({
      copy: document.getElementById('dd-similar-empty').textContent,
      browse: document.querySelector('#dd-similar-empty a').getAttribute('href'),
      cards: document.querySelectorAll('#dd-similar .ngd-diamond-card').length,
      title: document.getElementById('dd-title').textContent.trim().length > 0,
    }));
    expect(/No similar diamonds are currently available\./.test(state.copy), 'honest empty copy');
    expect(state.browse === 'diamonds.html' && /Browse All Diamonds/.test(state.copy), 'Browse All path offered');
    expect(state.cards === 0 && state.title, 'no fake products; the main page is whole');
  });

  await scenario('a failed recommendation lookup hides only the section — details keep working', {
    rows: RANKED, failSimilar: true,
  }, async (page) => {
    await openStone(page, 'DIA-CURR0001', false);
    await page.waitForFunction(() => document.getElementById('dd-similar-wrap').hidden);
    const state = await page.evaluate(() => ({
      title: document.getElementById('dd-title').textContent.trim().length > 0,
      specs: document.querySelectorAll('#dd-spec-table dt').length > 0,
      whatsapp: !document.getElementById('dd-whatsapp').hidden,
      compare: !document.getElementById('dd-compare').hidden,
    }));
    expect(state.title && state.specs, 'the main details render normally');
    expect(state.whatsapp && state.compare, 'the other actions keep working');
  });

  await scenario('Compare rides the shared state on similar cards; favourite stays intact', {
    rows: RANKED,
  }, async (page) => {
    await openStone(page, 'DIA-CURR0001', true);
    await page.click('#dd-similar [data-ngd-compare="DIA-RANK000A"]');
    const state = await page.evaluate(() => ({
      storage: JSON.parse(localStorage.getItem('ngdDiamondCompare') || '[]'),
      pressed: document.querySelector('#dd-similar [data-ngd-compare="DIA-RANK000A"]').getAttribute('aria-pressed'),
      barCount: document.querySelector('[data-cmp-count]').textContent.trim(),
      fav: document.getElementById('dd-fav').hasAttribute('aria-pressed'),
    }));
    expect(JSON.stringify(state.storage) === '["DIA-RANK000A"]' && state.pressed === 'true',
      'the ONE shared compare state records the similar stone');
    expect(state.barCount === '1 selected', 'the shared compare bar reflects it');
    expect(state.fav, 'the details favourite button is untouched');
  });

  await scenario('mobile 390: cards keep full width, no sideways page scroll', {
    rows: RANKED, viewport: { width: 390, height: 844 },
  }, async (page) => {
    await openStone(page, 'DIA-CURR0001', true);
    const state = await page.evaluate(() => {
      const card = document.querySelector('#dd-similar .ngd-diamond-card');
      return {
        cardWidth: card.getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    expect(state.cardWidth > 300, 'cards stay readable on phones, got ' + state.cardWidth);
    expect(!state.overflow, 'no horizontal page scroll');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} similar-diamonds scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
