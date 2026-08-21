/* ============================================================
   Public SEO loader tests (LIVE).
   Verifies assets/js/site-seo.js against the real pages: active
   seo_pages rows drive title / description / canonical / robots /
   OG / Twitter tags with exactly ONE effective tag of each kind;
   missing rows, inactive records and Supabase outages leave the
   built-in head exactly as authored (a page never loses its SEO);
   detail pages generate SEO + Product JSON-LD from the loaded
   product when no saved override exists (and the override wins
   when it does); JSON-LD stays pure escaped JSON and hostile
   values can never execute; hidden prices never enter markup.
   Run:  node tests/site-seo.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://seo-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };

const ABOUT_ROW = {
  key: 'about', page_name: 'About', active: true,
  title: 'Our Atelier Story — New Grown Diamond',
  meta_description: 'The people, plasma reactors and polishing wheels behind every certified stone we grow.',
  meta_keywords: 'lab-grown diamonds, atelier, CVD',
  canonical_url: 'https://newgrowndiamond.example/about.html',
  robots_index: true, robots_follow: false,
  og_title: 'Inside the New Grown Diamond atelier',
  og_description: 'From seed plate to certificate.',
  og_image_url: 'https://newgrowndiamond.example/media/atelier.webp',
  twitter_title: 'Atelier tour', twitter_description: null, twitter_image_url: null,
};

const DIAMOND = {
  id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001',
  shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
  polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
  laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
  measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
  ratio: 1, growth_method: 'CVD', availability: 'In Stock',
  image_path: 'diamonds/DIA-SEED0001/livephoto12345678.png',
  featured: false, active: true, archived_at: null,
  total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: false,
  created_at: '2026-08-10T10:00:00Z',
};

const JEWEL = {
  id: 'uuid-j1', public_id: 'JEW-SEED0001', sku: 'NGD-J-01',
  product_name: 'Aurora Halo Ring', category: 'Rings', subcategory: '',
  short_description: 'A brilliant halo ring, hand-set with certified lab-grown stones.',
  description: '', metal: '18k Gold', metal_karat: '18k', metal_color: 'Yellow',
  diamond_weight: 1.2, diamond_pieces: 17, diamond_quality: 'F VS', diamond_shape: 'Round',
  certificate_number: null, gross_weight: 4.2, size: '52',
  availability: 'available', active: true, archived_at: null,
  price: 2900, currency: 'USD', price_visible: false,
  created_at: '2026-08-10T10:00:00Z',
};

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const results = [];
let browser;
let SITE;
let seoCalls = [];

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
    if (url.pathname === '/rest/v1/seo_pages' && method === 'GET') {
      seoCalls.push(req.url());
      if (opts.seoFail) return json(500, { message: 'mock outage' });
      let rows = (opts.seoRows || []).slice();
      if (url.searchParams.get('active') === 'eq.true') rows = rows.filter((r) => r.active === true);
      const keyEq = url.searchParams.get('key');
      if (keyEq && keyEq.startsWith('eq.')) rows = rows.filter((r) => r.key === keyEq.slice(3));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let rows = (opts.diamonds || []).slice();
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pubEq.slice(4));
      return json(200, rows);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let rows = (opts.jewels || []).slice();
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) rows = rows.filter((d) => d.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) rows = rows.filter((d) => d.public_id !== pubEq.slice(4));
      return json(200, rows);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []); // site_content, jewellery_images, featured queries…
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  };
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
      /* deliberate mock outages surface as failed-resource lines, and headless
         GL sometimes grumbles about WebGL — neither is an application error */
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

/* Everything the head currently says, read in one go. */
const headState = () => ({
  title: document.title,
  titleTags: document.querySelectorAll('title').length,
  description: (document.querySelector('meta[name="description"]') || {}).content || null,
  descriptionTags: document.querySelectorAll('meta[name="description"]').length,
  keywords: (document.querySelector('meta[name="keywords"]') || {}).content || null,
  robots: (document.querySelector('meta[name="robots"]') || {}).content || null,
  robotsTags: document.querySelectorAll('meta[name="robots"]').length,
  canonical: (document.querySelector('link[rel="canonical"]') || { getAttribute: () => null }).getAttribute('href'),
  canonicalTags: document.querySelectorAll('link[rel="canonical"]').length,
  ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || null,
  ogTitleTags: document.querySelectorAll('meta[property="og:title"]').length,
  ogDescription: (document.querySelector('meta[property="og:description"]') || {}).content || null,
  ogUrl: (document.querySelector('meta[property="og:url"]') || {}).content || null,
  ogType: (document.querySelector('meta[property="og:type"]') || {}).content || null,
  ogSite: (document.querySelector('meta[property="og:site_name"]') || {}).content || null,
  ogImage: (document.querySelector('meta[property="og:image"]') || {}).content || null,
  twCard: (document.querySelector('meta[name="twitter:card"]') || {}).content || null,
  twTitle: (document.querySelector('meta[name="twitter:title"]') || {}).content || null,
  twDescription: (document.querySelector('meta[name="twitter:description"]') || {}).content || null,
  twImage: (document.querySelector('meta[name="twitter:image"]') || {}).content || null,
  jsonLdTags: document.querySelectorAll('script[type="application/ld+json"]').length,
  jsonLdRaw: (document.getElementById('ngd-jsonld') || {}).textContent || '',
  headImgs: document.head.querySelectorAll('img').length,
});

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('an active row drives title, description, canonical, robots, OG and Twitter on About', {
    seoRows: [ABOUT_ROW],
  }, async (page) => {
    seoCalls = [];
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Our Atelier Story'));
    const s = await page.evaluate(headState);
    expect(s.title === ABOUT_ROW.title, 'saved title applied, got ' + s.title);
    expect(s.description === ABOUT_ROW.meta_description, 'saved description applied');
    expect(s.keywords === ABOUT_ROW.meta_keywords, 'saved keywords applied');
    expect(s.canonical === ABOUT_ROW.canonical_url, 'saved canonical applied, got ' + s.canonical);
    expect(s.robots === 'index, nofollow', 'robots honours the saved switches, got ' + s.robots);
    expect(s.ogTitle === ABOUT_ROW.og_title && s.ogDescription === ABOUT_ROW.og_description,
      'OG title/description from the row');
    expect(s.ogUrl === ABOUT_ROW.canonical_url && s.ogType === 'website' && s.ogSite === 'New Grown Diamond',
      'OG url/type/site_name set');
    expect(s.ogImage === ABOUT_ROW.og_image_url, 'OG image from the row');
    expect(s.twTitle === 'Atelier tour' && s.twDescription === ABOUT_ROW.og_description &&
      s.twImage === ABOUT_ROW.og_image_url && s.twCard === 'summary_large_image',
      'Twitter tags fall back through OG values');
    expect(seoCalls.length === 1 && seoCalls[0].includes('key=eq.about') && seoCalls[0].includes('active=eq.true'),
      'one query, by stable key, active only: ' + seoCalls[0]);
  });

  await scenario('exactly one effective tag of each kind — never duplicates', {
    seoRows: [ABOUT_ROW],
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Our Atelier Story'));
    const s = await page.evaluate(headState);
    expect(s.titleTags === 1 && s.descriptionTags === 1 && s.canonicalTags === 1 &&
      s.robotsTags === 1 && s.ogTitleTags === 1 && s.jsonLdTags === 1,
      'one of each: ' + JSON.stringify({ t: s.titleTags, d: s.descriptionTags, c: s.canonicalTags, r: s.robotsTags, og: s.ogTitleTags, ld: s.jsonLdTags }));
  });

  await scenario('no saved row: built-in tags stay, self-canonical and social baseline appear', {
    seoRows: [],
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'));
    const s = await page.evaluate(headState);
    expect(s.title === 'About — New Grown Diamond', 'built-in title kept, got ' + s.title);
    expect(/our story, mission and vision/.test(s.description), 'built-in description kept');
    expect(s.canonical === SITE + '/about.html', 'self-canonical derived, got ' + s.canonical);
    expect(s.robots === null, 'no robots tag invented without a saved record');
    expect(s.ogTitle === 'About — New Grown Diamond' && s.twCard === 'summary',
      'social baseline derived from the built-in head');
    const ld = await page.evaluate(() => JSON.parse(document.getElementById('ngd-jsonld').textContent));
    const types = ld['@graph'].map((n) => n['@type']);
    expect(types.length === 1 && types[0] === 'BreadcrumbList', 'About emits only Breadcrumb JSON-LD, got ' + types.join(','));
    expect(ld['@graph'][0].itemListElement.length === 2 &&
      ld['@graph'][0].itemListElement[1].name === 'About', 'Home → About breadcrumb');
  });

  await scenario('an inactive record falls back to the built-in tags', {
    seoRows: [{ ...ABOUT_ROW, active: false }],
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'));
    const s = await page.evaluate(headState);
    expect(s.title === 'About — New Grown Diamond', 'inactive row never applied');
    expect(s.robots === null, 'inactive robots never applied');
  });

  await scenario('a Supabase outage leaves the built-in SEO whole and calm', {
    seoFail: true,
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'));
    const s = await page.evaluate(headState);
    expect(s.title === 'About — New Grown Diamond' && /our story/.test(s.description),
      'built-in tags untouched on outage');
    expect(s.canonical === SITE + '/about.html', 'baseline canonical still present');
    const alive = await page.evaluate(() => !!document.querySelector('footer'));
    expect(alive, 'the page itself is unaffected');
  });

  await scenario('the homepage emits Organization + WebSite JSON-LD', {
    seoRows: [],
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.getElementById('ngd-jsonld'));
    const state = await page.evaluate(() => ({
      ld: JSON.parse(document.getElementById('ngd-jsonld').textContent),
      count: document.querySelectorAll('script[type="application/ld+json"]').length,
    }));
    const types = state.ld['@graph'].map((n) => n['@type']);
    expect(state.count === 1, 'exactly one JSON-LD block, got ' + state.count);
    expect(types.includes('Organization') && types.includes('WebSite'),
      'Organization + WebSite present, got ' + types.join(','));
    expect(state.ld['@context'] === 'https://schema.org', 'schema.org context');
  });

  await scenario('diamond details without an override generates SEO from the stone (no price anywhere)', {
    seoRows: [], diamonds: [DIAMOND],
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Lab-Grown Diamond'));
    const s = await page.evaluate(headState);
    expect(s.title === '1.52 ct Round Lab-Grown Diamond · D VVS1 — New Grown Diamond',
      'product-generated title, got ' + s.title);
    expect(/IGI-certified CVD-grown round diamond/.test(s.description) &&
      /1\.52 carat, D colour, VVS1 clarity, Ideal cut/.test(s.description) &&
      /DIA-SEED0001/.test(s.description),
      'product-generated description, got ' + s.description);
    expect(s.canonical === SITE + '/diamond-details.html?id=DIA-SEED0001',
      'canonical keeps only the public id, got ' + s.canonical);
    expect(s.ogType === 'product', 'og:type product');
    expect(/\/storage\/v1\/object\/public\/diamond-images\/diamonds\/DIA-SEED0001\//.test(s.ogImage || ''),
      'the storage photo becomes the share image, got ' + s.ogImage);
    const ld = await page.evaluate(() => JSON.parse(document.getElementById('ngd-jsonld').textContent));
    const product = ld['@graph'].find((n) => n['@type'] === 'Product');
    const crumbs = ld['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
    expect(product && product.sku === 'DIA-SEED0001' && product.brand.name === 'New Grown Diamond',
      'Product schema from the stone');
    expect(crumbs && crumbs.itemListElement.length === 3 &&
      /1\.52 ct Round Lab-Grown Diamond/.test(crumbs.itemListElement[2].name),
      'Home → Diamond Details → stone breadcrumb');
    const raw = await page.evaluate(() => document.getElementById('ngd-jsonld').textContent);
    expect(!/price|18500|offers/i.test(raw), 'no price, amount or offers in the structured data');
  });

  await scenario('a saved override on Diamond Details wins over product generation', {
    seoRows: [{
      key: 'diamond_details', active: true,
      title: 'Signature Stones — Hand-Picked Lab Diamonds',
      meta_description: 'Every certificate verified in-house before a stone is listed.',
      meta_keywords: null, canonical_url: null, robots_index: true, robots_follow: true,
      og_title: null, og_description: null, og_image_url: null,
      twitter_title: null, twitter_description: null, twitter_image_url: null,
    }],
    diamonds: [DIAMOND],
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Signature Stones'));
    const s = await page.evaluate(headState);
    expect(s.title === 'Signature Stones — Hand-Picked Lab Diamonds', 'override title wins');
    expect(s.description === 'Every certificate verified in-house before a stone is listed.', 'override description wins');
    const ld = await page.evaluate(() => JSON.parse(document.getElementById('ngd-jsonld').textContent));
    const product = ld['@graph'].find((n) => n['@type'] === 'Product');
    expect(product && product.sku === 'DIA-SEED0001', 'Product schema still generated from the stone');
  });

  await scenario('jewellery details without an override generates SEO from the piece', {
    seoRows: [], jewels: [JEWEL],
  }, async (page) => {
    await page.goto(SITE + '/jewellery-details.html?id=JEW-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Aurora Halo Ring —'));
    const s = await page.evaluate(headState);
    expect(s.title === 'Aurora Halo Ring — Lab-Grown Diamond Rings | New Grown Diamond',
      'piece-generated title, got ' + s.title);
    expect(s.description === JEWEL.short_description, 'the public short description becomes the meta description');
    expect(s.canonical === SITE + '/jewellery-details.html?id=JEW-SEED0001', 'canonical by public id');
    const ld = await page.evaluate(() => JSON.parse(document.getElementById('ngd-jsonld').textContent));
    const product = ld['@graph'].find((n) => n['@type'] === 'Product');
    expect(product && product.name === 'Aurora Halo Ring' && product.sku === 'JEW-SEED0001',
      'Product schema from the piece');
    const raw = await page.evaluate(() => document.getElementById('ngd-jsonld').textContent);
    expect(!/2900|price|offers/i.test(raw), 'no price in the structured data');
  });

  await scenario('hostile saved values stay inert text — nothing executes, nothing injects', {
    seoRows: [{
      ...ABOUT_ROW,
      title: '</title><script>window.__seopwn=1</script>Pwn — New Grown Diamond',
      meta_description: '"><img src=x onerror="window.__seopwn=2"> honest description',
      og_image_url: 'javascript:alert(1)',
      canonical_url: 'javascript:alert(2)',
    }],
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.includes('Pwn'));
    const s = await page.evaluate(headState);
    expect(s.title.includes('<script>') && s.headImgs === 0,
      'markup stays literal text inside title/meta — no elements appear in the head');
    expect(s.description.includes('onerror'), 'description stored as inert attribute text');
    const pwn = await page.evaluate(() => window.__seopwn);
    expect(pwn === undefined, 'nothing executed');
    expect(s.ogImage === null, 'javascript: image URL refused');
    expect(s.canonical === SITE + '/about.html', 'javascript: canonical refused — self-canonical used');
  });

  await scenario('hostile product data cannot break out of the JSON-LD block', {
    seoRows: [],
    diamonds: [{ ...DIAMOND, shape: '</script><script>window.__seopwn=3</script>', laboratory: 'IGI' }],
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.getElementById('ngd-jsonld') &&
      document.getElementById('ngd-jsonld').textContent.includes('Product'));
    const state = await page.evaluate(() => ({
      raw: document.getElementById('ngd-jsonld').textContent,
      pwn: window.__seopwn,
      scripts: document.querySelectorAll('script[type="application/ld+json"]').length,
    }));
    expect(state.raw.includes('\\u003c') && !state.raw.includes('</script>'),
      '"<" is escaped — the block cannot be closed early');
    expect(state.pwn === undefined, 'nothing executed');
    expect(state.scripts === 1, 'still exactly one JSON-LD block');
    const parsed = await page.evaluate(() => JSON.parse(document.getElementById('ngd-jsonld').textContent));
    const product = parsed['@graph'].find((n) => n['@type'] === 'Product');
    expect(product && product.name.includes('<script>'), 'the hostile text survives only as data');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} site-seo scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
