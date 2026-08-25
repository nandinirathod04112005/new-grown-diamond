/* ============================================================
   Site-wide cinematic layer tests.
   The shared atmosphere + scroll-animation architecture rolled
   out across the public pages: the fixed ambient canvas behind
   light pages, scene canvases inside the dark heroes (homepage
   streak variant, manufacturing/about atmosphere), off-screen
   pausing, the [data-anim] reveal engine (about photo clip
   reveals, contact form stagger), dynamic product-grid stagger
   that never touches Supabase logic, the footer entrance, the
   About heritage progress rail, detail-stage light sweeps,
   button/nav micro-interaction styling, cursor glow gating,
   reduced-motion neutrality and the no-WebGL path.
   Run:  node tests/cinematic-site.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://cine-site.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG={SUPABASE_URL:'${SB_HOST}',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_key_1234567890'};`;
const CORS = { 'access-control-allow-origin': '*' };

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
    { ...base, id: 'uuid-c1', public_id: 'DIA-CINE0001', stock_number: 'NGD-7001' },
    { ...base, id: 'uuid-c2', public_id: 'DIA-CINE0002', stock_number: 'NGD-7002', shape: 'Oval', carat: 2.0, created_at: '2026-08-09T10:00:00Z' },
    { ...base, id: 'uuid-c3', public_id: 'DIA-CINE0003', stock_number: 'NGD-7003', shape: 'Pear', carat: 1.2, created_at: '2026-08-08T10:00:00Z' },
  ];
}

function seedJewellery() {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const n = String(i + 1).padStart(2, '0');
    rows.push({
      id: 'uuid-cjw-' + n, public_id: 'JEW-CINE00' + n, sku: 'JW-70' + n,
      product_name: 'Cinematic Piece ' + n,
      category: i % 2 ? 'Rings' : 'Earrings', subcategory: 'Solitaire',
      short_description: 'A quiet piece for the listing card.',
      diamond_weight: 0.5 + i / 10, availability: 'available',
      featured: false, active: true, archived_at: null,
      created_at: `2026-08-${String(18 - i).padStart(2, '0')}T10:00:00Z`,
    });
  }
  return rows;
}

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1366, height: 900 },
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) => r.fulfill({
      contentType: 'application/javascript', body: TEST_CONFIG,
    }));
    await context.route(SB_HOST + '/**', (r) => {
      const req = r.request();
      if (req.method() === 'OPTIONS') {
        return r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: '' });
      }
      const url = new URL(req.url());
      const wantsObject = String(req.headers()['accept'] || '').includes('vnd.pgrst.object');
      if (url.pathname.includes('/rest/v1/diamonds') && req.method() === 'GET') {
        let rows = seedDiamonds();
        const eqId = (url.searchParams.getAll('public_id') || []).find((v) => v.startsWith('eq.'));
        if (eqId) rows = rows.filter((row) => row.public_id === eqId.slice(3));
        const body = wantsObject ? JSON.stringify(rows[0] || null) : JSON.stringify(rows);
        return r.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': `*/${rows.length}` }, body });
      }
      if (url.pathname.includes('/rest/v1/jewellery') && req.method() === 'GET') {
        const rows = seedJewellery();
        return r.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': `*/${rows.length}` }, body: JSON.stringify(rows) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': '*/0' }, body: '[]' });
    });
    const page = await context.newPage();
    if (opts.disableWebgl) {
      await page.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          if (String(type).indexOf('webgl') !== -1) return null;
          return orig.call(this, type, ...rest);
        };
      });
    }
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

async function open(page, file) {
  await page.goto(`${SITE}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.NGDCineBG && !!window.NGDScrollFX);
}

function instantScroll(page, expr) {
  return page.evaluate((code) => {
    const top = eval(code); // eslint-disable-line no-eval
    window.scrollTo({ top, behavior: 'instant' });
  }, expr);
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('ambient atmosphere mounts behind the light pages', {}, async (page) => {
    for (const file of ['diamonds.html', 'contact.html']) {
      await open(page, file);
      const st = await page.evaluate(() => {
        const wrap = document.querySelector('.ngd-cinebg-fixed');
        const canvas = wrap && wrap.querySelector('canvas');
        return {
          ambient: window.NGDCineBG.state.ambient,
          running: window.NGDCineBG.state.running(),
          aria: wrap && wrap.getAttribute('aria-hidden'),
          z: wrap && getComputedStyle(wrap).zIndex,
          pe: wrap && getComputedStyle(wrap).pointerEvents,
          hasCanvas: !!canvas,
          rooted: document.documentElement.classList.contains('ngd-cine-root'),
        };
      });
      expect(st.ambient && st.hasCanvas, file + ' ambient canvas mounted');
      expect(st.running, file + ' atmosphere loop running');
      expect(st.aria === 'true', file + ' canvas is aria-hidden');
      expect(st.z === '-1' && st.pe === 'none', file + ' canvas sits behind content and ignores the pointer');
      expect(st.rooted, file + ' page base moved to the root element');
    }
  });

  await scenario('dark heroes carry their own scene layer (streak on home, atmosphere on story pages)', {}, async (page) => {
    const cases = [
      ['index.html', 'streak'],
      ['manufacturing.html', 'atmosphere'],
      ['about.html', 'atmosphere'],
    ];
    for (const [file, variant] of cases) {
      await open(page, file);
      const st = await page.evaluate(() => {
        const hero = document.querySelector('.ngd-hero');
        const scene = hero && hero.querySelector('.ngd-cinebg-scene canvas');
        return {
          scenes: window.NGDCineBG.state.scenes,
          inHero: !!scene,
          variant: hero && hero.getAttribute('data-ngd-cinebg-scene'),
          copyRaised: hero && getComputedStyle(hero.querySelector(':scope > .container')).zIndex,
        };
      });
      expect(st.scenes === 1 && st.inHero, file + ' hero scene canvas mounted');
      expect(st.variant === variant, file + ' uses the ' + variant + ' variant');
      expect(st.copyRaised === '1', file + ' hero copy stays above the scene layer');
    }
  });

  await scenario('the atmosphere actually paints light onto the scene canvas', {}, async (page) => {
    await open(page, 'manufacturing.html');
    await page.waitForTimeout(500);
    const ink = await page.evaluate(() => {
      const canvas = document.querySelector('.ngd-cinebg-scene canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 160) sum += data[i];
      return sum;
    });
    expect(ink > 50, 'scene canvas painted visible light, ink=' + ink);
  });

  await scenario('scene drawing pauses once the hero leaves the viewport', {}, async (page) => {
    await open(page, 'manufacturing.html');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => window.NGDCineBG.layers
      .find((l) => l.host.classList.contains('ngd-cinebg-scene')).visible);
    expect(before === true, 'scene visible at the top of the page');
    await instantScroll(page, 'document.body.scrollHeight');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.NGDCineBG.layers
      .find((l) => l.host.classList.contains('ngd-cinebg-scene')).visible);
    expect(after === false, 'scene paused off-screen');
    await instantScroll(page, '0');
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => window.NGDCineBG.layers
      .find((l) => l.host.classList.contains('ngd-cinebg-scene')).visible);
    expect(back === true, 'scene resumes when scrolled back');
  });

  await scenario('reduced motion: no atmosphere, no arming — the page is simply itself', { reducedMotion: 'reduce' }, async (page) => {
    await open(page, 'index.html');
    const st = await page.evaluate(() => ({
      reduced: window.NGDCineBG.state.reduced && window.NGDScrollFX.state.reduced,
      canvases: document.querySelectorAll('.ngd-cinebg-fixed, .ngd-cinebg-scene, .ngd-cursor-glow').length,
      armed: document.documentElement.classList.contains('ngd-fx-ready'),
      h1: (document.querySelector('.ngd-hero h1') || {}).textContent || '',
      footerOpacity: getComputedStyle(document.querySelector('.ngd-footer [class*="col-"]')).opacity,
    }));
    expect(st.reduced, 'both modules report reduced motion');
    expect(st.canvases === 0, 'no decorative canvases or cursor glow mounted');
    expect(!st.armed, 'reveal engine never arms');
    expect(st.h1.includes('Diamonds grown by science'), 'hero content intact');
    expect(st.footerOpacity === '1', 'footer fully visible without scroll effects');
  });

  await scenario('about: CMS photos clip-reveal and the footer cascades in', {}, async (page) => {
    await open(page, 'about.html');
    const armed = await page.evaluate(() => ({
      ready: document.documentElement.classList.contains('ngd-fx-ready'),
      clips: document.querySelectorAll('img[data-anim="clip"]').length,
      masks: document.querySelectorAll('h2[data-anim="mask"]').length,
    }));
    expect(armed.ready, 'scroll-fx armed');
    expect(armed.clips === 5, 'five about photos carry clip reveals, got ' + armed.clips);
    expect(armed.masks === 10, 'ten editorial headings carry masked reveals, got ' + armed.masks);
    await instantScroll(page, 'document.body.scrollHeight');
    await page.waitForFunction(() =>
      document.querySelector('.ngd-footer').classList.contains('is-inview'), null, { timeout: 4000 });
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('.ngd-footer [class*="col-"]')).opacity === '1',
      null, { timeout: 4000 });
  });

  await scenario('about heritage rail: five labelled beats, progress fills with scroll', {}, async (page) => {
    await open(page, 'about.html');
    const rail = await page.evaluate(() => {
      const el = document.getElementById('about-story-progress');
      return {
        exists: !!el,
        dots: el ? el.querySelectorAll('.ngd-abt-dot').length : 0,
        labels: el ? Array.from(el.querySelectorAll('.ngd-abt-dot')).map((d) => d.getAttribute('aria-label')) : [],
      };
    });
    expect(rail.exists && rail.dots === 5, 'rail mounted with five dots');
    expect(rail.labels[2].includes('2012'), 'the 2012 transition is one of the beats');

    await instantScroll(page, "document.getElementById('about-transition').getBoundingClientRect().top + window.scrollY - innerHeight * 0.3");
    await page.waitForTimeout(450);
    const mid = await page.evaluate(() => {
      const el = document.getElementById('about-story-progress');
      return {
        shown: el.classList.contains('is-shown'),
        p: parseFloat(getComputedStyle(el).getPropertyValue('--ngd-abt-p')) || 0,
        active: el.querySelectorAll('.ngd-abt-dot.is-active').length,
        maskIn: document.querySelector('#about-transition h2').classList.contains('is-inview'),
      };
    });
    expect(mid.shown, 'rail visible mid-story');
    expect(mid.p > 0.05 && mid.p < 0.98, 'progress line part-filled mid-story, p=' + mid.p);
    expect(mid.active === 1, 'exactly one active beat');
    expect(mid.maskIn, 'the 2012 heading unmasks as its section arrives');

    await instantScroll(page, '0');
    await page.waitForTimeout(450);
    const top = await page.evaluate(() => {
      const el = document.getElementById('about-story-progress');
      return { shown: el.classList.contains('is-shown'), p: parseFloat(getComputedStyle(el).getPropertyValue('--ngd-abt-p')) || 0 };
    });
    expect(!top.shown && top.p < 0.05, 'rail retires above the story');
  });

  await scenario('inventory cards cascade in with a capped stagger and stay fully usable', {}, async (page) => {
    await open(page, 'diamonds.html');
    await page.waitForSelector('#inv-grid .ngd-diamond-card', { timeout: 8000 });
    await page.waitForFunction(() => {
      const cols = document.querySelectorAll('#inv-grid > *');
      return cols.length >= 3 &&
        Array.from(cols).every((c) => c.classList.contains('ngd-anim-in'));
    }, null, { timeout: 4000 });
    const st = await page.evaluate(() => {
      const cols = Array.from(document.querySelectorAll('#inv-grid > *'));
      const delays = cols.map((c) => parseInt(c.style.getPropertyValue('--ngd-d')) || 0);
      return {
        delays,
        staged: cols.every((c) => c.classList.contains('ngd-stagger-card')),
        opacity: getComputedStyle(cols[0]).opacity,
        cta: !!document.querySelector('#inv-grid .ngd-diamond-card a.ngd-btn'),
      };
    });
    expect(st.staged, 'cards tagged for the cascade');
    expect(st.delays[1] > st.delays[0] && st.delays[2] > st.delays[1], 'delays increase across the row: ' + st.delays.join(','));
    expect(Math.max(...st.delays) <= 420, 'stagger is capped');
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('#inv-grid > *')).opacity === '1', null, { timeout: 3000 });
    expect(st.cta, 'card call-to-action intact');
  });

  await scenario('jewellery: cards cascade and re-cascade through a category filter', {}, async (page) => {
    await open(page, 'jewellery.html');
    await page.waitForSelector('#jw-grid .ngd-jewel-card, #jw-grid > *', { timeout: 8000 });
    await page.waitForFunction(() => document.querySelectorAll('#jw-grid > *').length >= 6, null, { timeout: 6000 });
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('#jw-grid > *')).every((c) => c.classList.contains('ngd-anim-in')),
      null, { timeout: 4000 });
    await page.click('#jw-chips button:nth-child(2)');
    await page.waitForFunction(() => {
      const cols = Array.from(document.querySelectorAll('#jw-grid > *'));
      return cols.length >= 1 && cols.length < 6 &&
        cols.every((c) => c.classList.contains('ngd-stagger-card') && c.classList.contains('ngd-anim-in'));
    }, null, { timeout: 5000 });
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('#jw-grid > *')).opacity === '1', null, { timeout: 3000 });
  });

  await scenario('diamond details: one light sweep over the stage, specs cascade in readable', {}, async (page) => {
    await open(page, 'diamond-details.html?id=DIA-CINE0001');
    await page.waitForFunction(() => {
      const stage = document.getElementById('dd-stage');
      return stage && stage.classList.contains('ngd-sweep-run');
    }, null, { timeout: 8000 });
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('#dd-specs > *');
      return rows.length >= 6 &&
        Array.from(rows).every((el) => el.classList.contains('ngd-anim-in'));
    }, null, { timeout: 8000 });
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('#dd-specs > *')).opacity === '1', null, { timeout: 3000 });
    const text = await page.evaluate(() => document.getElementById('dd-specs').textContent);
    expect(/Round/.test(text) && /1\.52/.test(text), 'spec content present under the animation');
  });

  await scenario('buttons and nav links carry the premium micro-interaction styling', {}, async (page) => {
    await open(page, 'index.html');
    const st = await page.evaluate(() => {
      const btn = document.querySelector('.ngd-btn');
      const link = document.querySelector('.ngd-nav .nav-link');
      return {
        sweep: getComputedStyle(btn, '::after').content !== 'none',
        overflow: getComputedStyle(btn).overflow,
        underline: link ? getComputedStyle(link, '::after').height : null,
      };
    });
    expect(st.sweep, 'button light-sweep layer armed');
    expect(st.overflow === 'hidden', 'sweep clipped inside the button');
    expect(st.underline === '1px', 'nav underline present, got ' + st.underline);
  });

  await scenario('cursor glow lives only over the hero, and only on fine pointers', {}, async (page) => {
    await open(page, 'index.html');
    await page.waitForSelector('.ngd-cursor-glow', { state: 'attached', timeout: 3000 });
    const hero = await page.evaluate(() => {
      const rect = document.querySelector('.ngd-hero').getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: Math.max(rect.top + rect.height / 2, 100) };
    });
    await page.mouse.move(hero.x, hero.y);
    await page.waitForFunction(() =>
      document.querySelector('.ngd-cursor-glow').classList.contains('is-on'), null, { timeout: 2000 });
    await instantScroll(page, 'document.body.scrollHeight');
    await page.mouse.move(640, 500);
    await page.waitForFunction(() =>
      !document.querySelector('.ngd-cursor-glow').classList.contains('is-on'), null, { timeout: 2000 });
  });

  await scenario('small viewports skip the cursor glow but keep the (lighter) atmosphere', { viewport: { width: 390, height: 780 } }, async (page) => {
    await open(page, 'index.html');
    const st = await page.evaluate(() => ({
      glow: !!document.querySelector('.ngd-cursor-glow'),
      ambient: window.NGDCineBG.state.ambient,
      scenes: window.NGDCineBG.state.scenes,
      particles: window.NGDCineBG.layers[0].particles.length,
    }));
    expect(!st.glow, 'no cursor glow on the mobile profile');
    expect(st.ambient && st.scenes === 1, 'atmosphere still present on mobile');
    expect(st.particles <= 14, 'reduced particle budget on mobile, got ' + st.particles);
  });

  await scenario('with WebGL unavailable the 2D atmosphere still runs alongside the hero fallback', { disableWebgl: true }, async (page) => {
    await open(page, 'index.html');
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({
      fallbackVisible: getComputedStyle(document.querySelector('.ngd-hero-fallback')).display !== 'none',
      ambient: window.NGDCineBG.state.ambient,
      running: window.NGDCineBG.state.running(),
    }));
    expect(st.fallbackVisible, 'static hero fallback shown');
    expect(st.ambient && st.running, '2D atmosphere unaffected by the missing WebGL');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} cinematic-site scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
