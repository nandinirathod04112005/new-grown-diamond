/* ============================================================
   Public site-settings loader tests (LIVE).
   Verifies assets/js/site-settings.js against the real pages:
   saved settings drive header/footer branding (name, logo,
   favicon, language), the footer © line and social icons, the
   contact page's email / phone / WhatsApp / address cards, the
   announcement bar and the maintenance holding screen; business
   feature toggles hide quote / hold / inspection / enquiry
   actions without deleting anything; missing rows and Supabase
   outages leave the designed pages exactly as authored; hostile
   values stay inert text and unsafe URLs never bind.
   Run:  node tests/site-settings.test.cjs
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SB_HOST = 'https://set-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAABAAAAAQCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const rows = (obj) => Object.keys(obj).map((key) => ({ key, value: obj[key] }));

const DIAMOND = {
  id: 'uuid-d1', public_id: 'DIA-SEED0001', stock_number: 'NGD-1001',
  shape: 'Round', carat: 1.52, color: 'D', clarity: 'VVS1', cut: 'Ideal',
  polish: 'Excellent', symmetry: 'Very Good', fluorescence: 'None',
  laboratory: 'IGI', report_number: 'LG77110001', certificate_number: 'LG77110001',
  measurements: '7.3 × 7.3 × 4.5 mm', depth_percentage: 62.1, table_percentage: 57,
  ratio: 1, growth_method: 'CVD', availability: 'In Stock', image_path: null,
  featured: false, active: true, archived_at: null,
  total_price: 18500, price_per_carat: 12171, currency: 'USD', price_visible: false,
  created_at: '2026-08-10T10:00:00Z',
};
const JEWEL = {
  id: 'uuid-j1', public_id: 'JEW-SEED0001', sku: 'NGD-J-01',
  product_name: 'Aurora Halo Ring', category: 'Rings', subcategory: '',
  short_description: 'A brilliant halo ring.', description: '', metal: '18k Gold',
  metal_karat: '18k', metal_color: 'Yellow', diamond_weight: 1.2, diamond_pieces: 17,
  diamond_quality: 'F VS', diamond_shape: 'Round', certificate_number: null,
  gross_weight: 4.2, size: '52', availability: 'available', active: true,
  archived_at: null, price: 2900, currency: 'USD', price_visible: false,
  created_at: '2026-08-10T10:00:00Z',
};

const results = [];
let browser;
let SITE;

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
    if (url.pathname === '/rest/v1/site_settings' && method === 'GET') {
      if (opts.fail) return json(500, { message: 'mock outage' });
      return json(200, opts.settings || []);
    }
    if (url.pathname === '/rest/v1/diamonds' && method === 'GET') {
      let list = (opts.diamonds || []).slice();
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) list = list.filter((d) => d.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) list = list.filter((d) => d.public_id !== pubEq.slice(4));
      return json(200, list);
    }
    if (url.pathname === '/rest/v1/jewellery' && method === 'GET') {
      let list = (opts.jewels || []).slice();
      const pubEq = url.searchParams.get('public_id');
      if (pubEq && pubEq.startsWith('eq.')) list = list.filter((d) => d.public_id === pubEq.slice(3));
      if (pubEq && pubEq.startsWith('neq.')) list = list.filter((d) => d.public_id !== pubEq.slice(4));
      return json(200, list);
    }
    if (url.pathname.startsWith('/storage/v1/object/public/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1PX });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': '0-0/0' }, body: '' });
    }
    if (url.pathname.startsWith('/rest/v1/') && method === 'GET') {
      return json(200, []); // seo_pages, site_content, featured, jewellery_images…
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
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ngd-auto-explore', 'off'); } catch (e) { /* ok */ }
    });
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

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('branding: name, logo, favicon and language flow from settings (socials untouched)', {
    settings: rows({
      company_name: 'New Grown Diamond Pvt Ltd',
      brand_short_name: 'NGD Atelier',
      logo_url: SB_HOST + '/storage/v1/object/public/site-media/homepage/logo.webp',
      favicon_url: SB_HOST + '/storage/v1/object/public/site-media/homepage/favicon.png',
      site_language: 'en-IN',
    }),
  }, async (page) => {
    await page.goto(SITE + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.textContent.includes('NGD Atelier'));
    const state = await page.evaluate(() => {
      const brands = [...document.querySelectorAll('.ngd-brand')];
      return {
        brandCount: brands.length,
        names: brands.map((b) => b.querySelector('.ngd-brand-mark').nextElementSibling.textContent.trim()),
        logos: brands.filter((b) => b.querySelector('.ngd-brand-mark img.ngd-brand-logo')).length,
        favicon: document.querySelector('link[rel="icon"]').getAttribute('href'),
        lang: document.documentElement.getAttribute('lang'),
        socials: [...document.querySelectorAll('[data-ngd-social]')].map((a) => a.getAttribute('href')),
      };
    });
    expect(state.brandCount >= 3, 'header, mobile menu and footer brands found, got ' + state.brandCount);
    expect(state.names.every((n) => n === 'NGD Atelier'), 'short brand name everywhere, got ' + state.names.join(','));
    expect(state.logos === state.brandCount, 'every brand mark carries the configured logo');
    expect(/favicon\.png$/.test(state.favicon), 'favicon swapped, got ' + state.favicon);
    expect(state.lang === 'en-IN', 'document language from settings, got ' + state.lang);
    expect(state.socials.every((h) => h === '#'), 'no social configured — designed placeholders stay');
  });

  await scenario('footer: © line bound; configured socials go live, the rest hide', {
    settings: rows({
      footer_copyright: '© 2026 NGD Atelier LLP — crafted with patience.',
      social_instagram: 'https://instagram.com/ngdatelier',
      social_linkedin: 'https://linkedin.com/company/ngdatelier',
    }),
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelector('[data-ngd-copyright]').textContent.includes('NGD Atelier LLP'));
    const state = await page.evaluate(() => {
      const icon = (type) => document.querySelector('[data-ngd-social="' + type + '"]');
      const info = (type) => ({
        href: icon(type).getAttribute('href'),
        target: icon(type).getAttribute('target'),
        rel: icon(type).getAttribute('rel'),
        label: icon(type).getAttribute('aria-label'),
        shown: getComputedStyle(icon(type)).display !== 'none',
      });
      return {
        copyright: document.querySelector('[data-ngd-copyright]').textContent.trim(),
        instagram: info('instagram'), linkedin: info('linkedin'),
        facebook: info('facebook'), twitter: info('twitter'),
      };
    });
    expect(state.copyright === '© 2026 NGD Atelier LLP — crafted with patience.', 'copyright bound verbatim');
    expect(state.instagram.href === 'https://instagram.com/ngdatelier' && state.instagram.shown &&
      state.instagram.target === '_blank' && state.instagram.rel === 'noopener' &&
      state.instagram.label === 'Instagram', 'Instagram live with a safe new-tab link');
    expect(state.linkedin.href === 'https://linkedin.com/company/ngdatelier' && state.linkedin.shown,
      'LinkedIn live');
    expect(!state.facebook.shown && !state.twitter.shown, 'unconfigured icons hide');
  });

  await scenario('contact page: email, phone, WhatsApp and address cards fill from settings', {
    settings: rows({
      contact_email: 'hello@ngd.example',
      support_email: 'care@ngd.example',
      contact_phone: '+91 98765 43210',
      whatsapp_number: '+91 91234 56789',
      address_line: '4 Facet Lane', address_city: 'Surat', address_state: 'Gujarat',
      address_country: 'India', address_postal_code: '395003',
    }),
  }, async (page) => {
    await page.goto(SITE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelector('[data-contact-slot="email"]').textContent.includes('hello@ngd.example'));
    const state = await page.evaluate(() => ({
      emails: [...document.querySelectorAll('[data-contact-slot="email"] a')].map((a) => a.getAttribute('href')),
      tel: (document.querySelector('[data-contact-slot="phone"] a[href^="tel:"]') || { getAttribute: () => null }).getAttribute('href'),
      wa: (document.querySelector('[data-ngd-whatsapp]') || { getAttribute: () => null, textContent: '' }).getAttribute('href'),
      address: document.querySelector('[data-contact-slot="address"]').textContent.trim(),
    }));
    expect(state.emails.length === 2 && state.emails[0] === 'mailto:hello@ngd.example' &&
      state.emails[1] === 'mailto:care@ngd.example', 'primary + support mailto links, got ' + state.emails.join(','));
    expect(state.tel === 'tel:+919876543210', 'tel link built from the phone, got ' + state.tel);
    expect(state.wa === 'https://wa.me/919123456789', 'WhatsApp link from digits only, got ' + state.wa);
    expect(state.address === '4 Facet Lane, Surat, Gujarat, India, 395003', 'address joined, got ' + state.address);
  });

  await scenario('feature toggles hide quote/hold/inspection/enquiry actions — nothing is deleted', {
    settings: rows({
      feature_quotes: 'false', feature_holds: 'false', feature_inspections: 'false',
      feature_diamond_enquiry: 'false', feature_jewellery_enquiry: 'false',
    }),
    diamonds: [DIAMOND], jewels: [JEWEL],
  }, async (page) => {
    await page.goto(SITE + '/diamond-details.html?id=DIA-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('dd-quote')).display === 'none');
    const dd = await page.evaluate(() => ({
      quote: getComputedStyle(document.getElementById('dd-quote')).display,
      hold: getComputedStyle(document.getElementById('dd-hold')).display,
      inspect: getComputedStyle(document.getElementById('dd-inspect')).display,
      stickyQuote: getComputedStyle(document.getElementById('dd-sticky-quote')).display,
      stickyHold: getComputedStyle(document.getElementById('dd-sticky-hold')).display,
      stillInDom: !!document.getElementById('dd-quote'),
    }));
    expect(dd.quote === 'none' && dd.hold === 'none' && dd.inspect === 'none' &&
      dd.stickyQuote === 'none' && dd.stickyHold === 'none', 'diamond actions hidden');
    expect(dd.stillInDom, 'hidden, not deleted');
    await page.goto(SITE + '/jewellery-details.html?id=JEW-SEED0001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('jd-enquire')).display === 'none');
    const jd = await page.evaluate(() => ({
      quote: getComputedStyle(document.getElementById('jd-quote')).display,
      hold: getComputedStyle(document.getElementById('jd-hold')).display,
      enquire: getComputedStyle(document.getElementById('jd-enquire')).display,
    }));
    expect(jd.quote === 'none' && jd.hold === 'none' && jd.enquire === 'none', 'jewellery actions hidden');
    await page.goto(SITE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('#contact-subject option[value="diamond"]'));
    const subjects = await page.evaluate(() =>
      [...document.querySelectorAll('#contact-subject option')].map((o) => o.value));
    expect(!subjects.includes('diamond') && !subjects.includes('jewellery') && subjects.includes('general'),
      'enquiry subjects trimmed to enabled ones, got ' + subjects.join(','));
  });

  await scenario('announcement bar renders above the header only when enabled', {
    settings: rows({
      announcement_enabled: 'true',
      announcement_text: 'Complimentary certification on every stone this month.',
      announcement_url: 'education.html',
    }),
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ngd-announce');
    const state = await page.evaluate(() => ({
      first: document.body.firstElementChild.id,
      text: document.getElementById('ngd-announce').textContent,
      link: document.querySelector('#ngd-announce a').getAttribute('href'),
    }));
    expect(state.first === 'ngd-announce', 'bar sits above everything');
    expect(/Complimentary certification/.test(state.text), 'announcement text bound');
    expect(state.link === 'education.html', 'Learn more link bound');
  });

  await scenario('announcement stays off when disabled, even with text saved', {
    settings: rows({ announcement_enabled: 'false', announcement_text: 'Should not appear.' }),
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('[data-ngd-copyright]'));
    await page.waitForTimeout(400);
    const bar = await page.evaluate(() => !!document.getElementById('ngd-announce'));
    expect(!bar, 'no announcement bar');
  });

  await scenario('maintenance mode shows the holding screen with an admin way in', {
    settings: rows({ maintenance_mode: 'true', company_name: 'New Grown Diamond' }),
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ngd-maintenance');
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#ngd-maintenance h1').textContent,
      note: document.querySelector('#ngd-maintenance p').textContent,
      admin: document.querySelector('#ngd-maintenance .ngd-maintenance-admin').getAttribute('href'),
      locked: document.body.classList.contains('ngd-maintenance-on'),
      covers: (() => {
        const r = document.getElementById('ngd-maintenance').getBoundingClientRect();
        return r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      })(),
    }));
    expect(/polishing things up/.test(state.heading), 'holding headline');
    expect(/New Grown Diamond/.test(state.note) && /check back soon/.test(state.note), 'honest note');
    expect(state.admin === 'login.html', 'admins keep a way in via the login page');
    expect(state.locked && state.covers, 'overlay covers the page');
  });

  await scenario('no rows / outage: the designed pages stay exactly as authored', {
    settings: [],
  }, async (page) => {
    await page.goto(SITE + '/contact.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('[data-contact-slot="email"]'));
    await page.waitForTimeout(400);
    const empty = await page.evaluate(() => ({
      brand: document.querySelector('.ngd-brand .ngd-brand-mark').nextElementSibling.textContent.trim(),
      emailSlot: document.querySelector('[data-contact-slot="email"]').textContent,
      socials: [...document.querySelectorAll('[data-ngd-social]')].every(
        (a) => a.getAttribute('href') === '#' && getComputedStyle(a).display !== 'none'),
      bar: !!document.getElementById('ngd-announce'),
      overlay: !!document.getElementById('ngd-maintenance'),
      subjects: document.querySelectorAll('#contact-subject option').length,
    }));
    expect(empty.brand === 'New Grown Diamond', 'built-in brand name kept');
    expect(/fastest route/.test(empty.emailSlot), 'built-in contact copy kept');
    expect(empty.socials, 'placeholder social icons untouched');
    expect(!empty.bar && !empty.overlay, 'no bar, no overlay');
    expect(empty.subjects === 6, 'all enquiry subjects present, got ' + empty.subjects);
  });

  await scenario('a Supabase outage leaves the page whole and calm', { fail: true }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('[data-ngd-copyright]'));
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      brand: document.querySelector('.ngd-brand .ngd-brand-mark').nextElementSibling.textContent.trim(),
      footer: !!document.querySelector('footer'),
      overlay: !!document.getElementById('ngd-maintenance'),
    }));
    expect(state.brand === 'New Grown Diamond' && state.footer && !state.overlay,
      'designed page unaffected by the outage');
  });

  await scenario('hostile values stay inert text; unsafe URLs never bind', {
    settings: rows({
      brand_short_name: '</script><b>Pwn</b>',
      announcement_enabled: 'true',
      announcement_text: 'Deal! <img src=x onerror="window.__setpwn=1">',
      announcement_url: 'javascript:alert(1)',
      social_instagram: 'javascript:alert(2)',
      footer_copyright: '<script>window.__setpwn=2</script> honest line',
    }),
  }, async (page) => {
    await page.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ngd-announce');
    const state = await page.evaluate(() => ({
      brand: document.querySelector('.ngd-brand .ngd-brand-mark').nextElementSibling.textContent,
      brandHasEl: !!document.querySelector('.ngd-brand b'),
      barText: document.getElementById('ngd-announce').textContent,
      barImgs: document.querySelectorAll('#ngd-announce img').length,
      barLink: !!document.querySelector('#ngd-announce a'),
      copyright: document.querySelector('[data-ngd-copyright]').textContent,
      instagram: document.querySelector('[data-ngd-social="instagram"]').getAttribute('href'),
      pwn: window.__setpwn,
    }));
    expect(state.brand.includes('<b>Pwn</b>') && !state.brandHasEl, 'brand markup stays literal text');
    expect(/onerror/.test(state.barText) && state.barImgs === 0, 'announcement markup stays literal text');
    expect(!state.barLink, 'javascript: announcement link refused');
    expect(state.copyright.includes('<script>'), 'copyright markup stays literal text');
    expect(state.instagram === '#', 'javascript: social URL never binds');
    expect(state.pwn === undefined, 'nothing executed');
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} site-settings scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
