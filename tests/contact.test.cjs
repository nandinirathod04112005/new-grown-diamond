/* ============================================================
   Contact page tests (LIVE enquiries).
   Verifies the hero + intro, the four contact-information cards
   with their CMS slots, the seven-field enquiry form (labels,
   validation, the LIVE guest submit into public.enquiries with
   its ENQ- reference and honest failure handling — mocked at the
   network layer so the real project is never touched — plus the
   silent honeypot), the business-enquiry section with its
   subject shortcut, the map placeholder, the support CTA and
   responsive behaviour at 1440/768/390.
   Run:  node tests/contact.test.cjs
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer, chromiumOptions, installCdnRoutes } = require('./lib.cjs');

const SCREEN_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const SB_HOST = 'https://ngd-test.supabase.co';
const TEST_CONFIG = `window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: '${SB_HOST}',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_1234567890'
};`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' };

function makeMock(opts = {}) {
  const inserts = [];
  async function handler(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, obj) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(obj) });
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: { ...CORS, 'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
        body: '',
      });
    }
    if (url.pathname === '/rest/v1/enquiries' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      inserts.push(Array.isArray(body) ? body[0] : body);
      if (opts.failInsert) return json(500, { code: 'XX000', message: 'internal error' });
      return route.fulfill({ status: 201, headers: CORS, body: '' });
    }
    return json(404, { message: 'mock: unhandled ' + method + ' ' + url.pathname });
  }
  return { handler, inserts };
}

const SECTIONS = ['hero', 'channels', 'form', 'business', 'map', 'cta'];
const FIELD_IDS = ['contact-name', 'contact-company', 'contact-email',
  'contact-mobile', 'contact-country', 'contact-subject', 'contact-message'];

const results = [];
let browser;
let SITE;

function expect(cond, msg) {
  if (!cond) throw new Error('Expectation failed: ' + msg);
}

async function scenario(name, opts, fn) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  const pageErrors = [];
  try {
    await installCdnRoutes(context);
    await context.route('**/assets/js/supabase-config.js', (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: TEST_CONFIG }));
    const backend = makeMock(opts);
    await context.route(SB_HOST + '/**', backend.handler);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await fn(page, backend);
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
  await page.goto(`${SITE}/contact.html${query || ''}`, { waitUntil: 'networkidle' });
}

async function fillValid(page) {
  await page.fill('#contact-name', 'Asha Verma');
  await page.fill('#contact-email', 'asha@example.com');
  await page.fill('#contact-mobile', '+91 90000 00000');
  await page.selectOption('#contact-country', 'India');
  await page.selectOption('#contact-subject', 'diamond');
  await page.fill('#contact-message',
    'I would like to know whether stone NGD-1001 is still available and what its report says.');
}

(async () => {
  const started = await startServer();
  SITE = started.origin;
  browser = await chromium.launch(chromiumOptions());

  await scenario('hero + intro, all six sections in order, header + footer reused', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      heading: document.querySelector('#contact-hero h1').textContent.replace(/\s+/g, ' ').trim(),
      lead: document.querySelector('#contact-hero .ngd-lead').textContent.trim().length,
      hooks: [...document.querySelectorAll('[data-contact-section]')]
        .map((s) => s.getAttribute('data-contact-section')),
      header: !!document.querySelector('.ngd-navbar'),
      footer: !!document.querySelector('footer.ngd-footer'),
    }));
    expect(/talk/i.test(state.heading) && /diamonds/i.test(state.heading),
      'contact headline, got ' + state.heading);
    expect(state.lead > 60, 'short introduction present');
    expect(JSON.stringify(state.hooks) === JSON.stringify(SECTIONS),
      'sections in order, got ' + state.hooks.join(','));
    expect(state.header && state.footer, 'global header + footer reused');
  });

  await scenario('four contact-information cards with CMS slots — no invented details', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#contact-channels .ngd-card')];
      return {
        count: cards.length,
        icons: cards.filter((c) => c.querySelector('.ngd-icon-tile svg')).length,
        tilt: cards.filter((c) => c.hasAttribute('data-ngd-tilt')).length,
        titles: cards.map((c) => c.querySelector('.ngd-title').textContent.trim()),
        slots: [...document.querySelectorAll('#contact-channels [data-contact-slot]')]
          .map((s) => s.getAttribute('data-contact-slot')),
        text: document.querySelector('#contact-channels').textContent,
      };
    });
    expect(state.count === 4, 'four information cards, got ' + state.count);
    expect(state.icons === 4 && state.tilt === 4, 'icon art + tilt on all cards');
    expect(JSON.stringify(state.slots) === JSON.stringify(['email', 'phone', 'address', 'hours']),
      'email/phone/location/hours slots, got ' + state.slots.join(','));
    expect(state.titles.some((t) => /hours/i.test(t)) && state.titles.some((t) => /location|office/i.test(t)),
      'office + business-hours cards present, got ' + state.titles.join(','));
    /* honesty guard: no concrete phone numbers, addresses or hours invented */
    expect(!/\+\d{2}[\s\d-]{6,}/.test(state.text), 'no invented phone numbers');
    expect(!/\d{1,2}:\d{2}/.test(state.text), 'no invented opening hours');
  });

  await scenario('form: seven labelled fields on the glass card, options, counter', {}, async (page) => {
    await open(page);
    const state = await page.evaluate((ids) => ({
      labelled: ids.every((id) =>
        !!document.querySelector(`label[for="${id}"]`) && !!document.getElementById(id)),
      glass: document.querySelector('#ngd-contact-form').closest('.ngd-card').classList.contains('ngd-glass'),
      novalidate: document.querySelector('#ngd-contact-form').hasAttribute('novalidate'),
      subjects: [...document.querySelectorAll('#contact-subject option')].map((o) => o.textContent.trim()),
      countries: document.querySelectorAll('#contact-country option').length,
      counter: document.querySelector('#contact-message-count').textContent.trim(),
      feedbacks: document.querySelectorAll('#ngd-contact-form .invalid-feedback').length,
      submit: document.querySelector('#contact-submit').textContent.trim(),
    }), FIELD_IDS);
    expect(state.labelled, 'all seven fields have tied labels');
    expect(state.glass, 'form sits on the glass card');
    expect(state.novalidate, 'custom validation (novalidate) in charge');
    expect(state.subjects.length >= 5, 'subject options, got ' + state.subjects.length);
    expect(state.subjects.some((o) => /business|trade/i.test(o)), 'business/trade subject offered');
    expect(state.countries >= 10, 'country choices, got ' + state.countries);
    expect(/^0 \/ 1000$/.test(state.counter), 'live message counter, got ' + state.counter);
    expect(state.feedbacks === 6, 'inline errors for the six validated fields');
    expect(/send enquiry/i.test(state.submit), 'clear submit button, got ' + state.submit);
  });

  await scenario('validation: empty submit flags the required fields, sends nothing', {}, async (page, backend) => {
    await open(page);
    await page.click('#contact-submit');
    const state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-contact-form .is-invalid')].map((f) => f.id),
      companyInvalid: document.getElementById('contact-company').classList.contains('is-invalid'),
      ariaInvalid: document.getElementById('contact-name').getAttribute('aria-invalid'),
      alert: (document.querySelector('#contact-alert .ngd-alert') || { textContent: '' }).textContent,
      alertDanger: !!document.querySelector('#contact-alert .ngd-alert-danger'),
    }));
    expect(JSON.stringify(state.invalid) ===
      JSON.stringify(['contact-name', 'contact-email', 'contact-subject', 'contact-message']),
      'required fields flagged (mobile stays optional), got ' + state.invalid.join(','));
    expect(!state.companyInvalid, 'optional company never flagged');
    expect(state.ariaInvalid === 'true', 'aria-invalid set for assistive tech');
    expect(state.alertDanger && /highlighted required fields/i.test(state.alert), 'error summary shown');
    expect(backend.inserts.length === 0, 'nothing reaches Supabase while invalid');
  });

  await scenario('validation: bad email, bad mobile and short message flagged; typing clears', {}, async (page) => {
    await open(page);
    await page.fill('#contact-name', 'Asha Verma');
    await page.fill('#contact-email', 'not-an-email');
    await page.fill('#contact-mobile', 'abc');
    await page.selectOption('#contact-country', 'India');
    await page.selectOption('#contact-subject', 'general');
    await page.fill('#contact-message', 'Too short.');
    await page.click('#contact-submit');
    let state = await page.evaluate(() => ({
      invalid: [...document.querySelectorAll('#ngd-contact-form .is-invalid')].map((f) => f.id),
    }));
    expect(JSON.stringify(state.invalid) ===
      JSON.stringify(['contact-email', 'contact-mobile', 'contact-message']),
      'email + mobile + message flagged, got ' + state.invalid.join(','));
    await page.fill('#contact-email', 'asha@example.com');
    state = await page.evaluate(() => ({
      emailInvalid: document.getElementById('contact-email').classList.contains('is-invalid'),
    }));
    expect(!state.emailInvalid, 'typing clears the email flag');
  });

  await scenario('live guest submit: enquiry inserted with an ENQ reference, form cleared', {}, async (page, backend) => {
    await open(page);
    await fillValid(page);
    await page.fill('#contact-company', 'Verma Fine Jewels');
    await page.click('#contact-submit');
    await page.waitForSelector('#contact-alert .ngd-alert-success', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#contact-alert .ngd-alert').textContent,
      nameCleared: document.getElementById('contact-name').value,
      counter: document.getElementById('contact-message-count').textContent.trim(),
    }));
    expect(/Thank you — your enquiry ENQ-[A-Z0-9]{8} has been received/.test(state.alert),
      'success names the real reference, got: ' + state.alert);
    expect(state.nameCleared === '' && state.counter === '0 / 1000', 'form cleared after the real insert');
    expect(backend.inserts.length === 1, 'exactly one insert sent');
    const rec = backend.inserts[0];
    expect(rec.full_name === 'Asha Verma' && rec.email === 'asha@example.com' &&
      rec.company_name === 'Verma Fine Jewels' && rec.country === 'India' &&
      /^ENQ-[A-Z0-9]{8}$/.test(rec.public_id) && rec.user_id === null &&
      /NGD-1001/.test(rec.message),
      'guest payload persisted verbatim, got ' + JSON.stringify(rec).slice(0, 200));
    expect(!('status' in rec) && !('admin_note' in rec), 'admin fields never sent from the browser');
    /* the honeypot swallows bot submissions silently */
    await fillValid(page);
    await page.fill('#contact-website', 'https://spam.example');
    await page.click('#contact-submit');
    await page.waitForTimeout(400);
    expect(backend.inserts.length === 1, 'honeypot blocks the insert silently');
  });

  await scenario('failed insert: honest error message, values preserved', { failInsert: true }, async (page, backend) => {
    await open(page);
    await fillValid(page);
    await page.click('#contact-submit');
    await page.waitForSelector('#contact-alert .ngd-alert-danger', { timeout: 8000 });
    const state = await page.evaluate(() => ({
      alert: document.querySelector('#contact-alert .ngd-alert').textContent,
      nameKept: document.getElementById('contact-name').value,
      button: document.getElementById('contact-submit').textContent.trim(),
    }));
    expect(/could not send your enquiry/i.test(state.alert) && !/XX000|internal error/i.test(state.alert),
      'safe failure message, got: ' + state.alert);
    expect(state.nameKept === 'Asha Verma', 'form values preserved for a retry');
    expect(state.button === 'Send enquiry', 'submit button restored');
    expect(backend.inserts.length >= 1, 'the insert genuinely reached the (failing) backend');
  });

  await scenario('business enquiry: dark section, trade points, button preselects the subject', {}, async (page) => {
    await open(page);
    const before = await page.evaluate(() => {
      const s = document.querySelector('#contact-business');
      return {
        dark: s.classList.contains('ngd-section-dark'),
        glassDark: !!s.querySelector('.ngd-glass-dark'),
        points: s.querySelectorAll('ul li').length,
        text: s.textContent,
        subject: document.getElementById('contact-subject').value,
      };
    });
    expect(before.dark, 'business section uses the dark band');
    expect(before.glassDark, 'trade card uses the dark glass surface');
    expect(before.points >= 3, 'trade points listed');
    expect(/IGI\/GIA|IGI/.test(before.text), 'certification mentioned for parcels');
    expect(before.subject === '', 'subject starts unselected');
    await page.click('#contact-business [data-contact-subject]');
    await page.waitForFunction(() =>
      document.getElementById('contact-subject').value === 'partnership', null, { timeout: 4000 });
    const hash = await page.evaluate(() => location.hash);
    expect(hash === '#contact-form-section', 'button jumps to the form, got ' + hash);
  });

  await scenario('?subject= deep link preselects the subject', {}, async (page) => {
    await open(page, '?subject=jewellery');
    const value = await page.evaluate(() => document.getElementById('contact-subject').value);
    expect(value === 'jewellery', 'subject preselected from URL, got ' + (value || '(none)'));
  });

  await scenario('map placeholder: stylised panel, no real map, honest caption', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const s = document.querySelector('#contact-map');
      const panel = s.querySelector('.ngd-map-panel');
      return {
        svg: !!panel.querySelector('svg'),
        slot: panel.getAttribute('data-contact-slot'),
        parallax: panel.hasAttribute('data-ngd-parallax'),
        labelled: (panel.getAttribute('aria-label') || '').length > 10,
        iframes: document.querySelectorAll('iframe').length,
        caption: s.textContent,
        wide: panel.getBoundingClientRect().width / panel.getBoundingClientRect().height > 2,
      };
    });
    expect(state.svg, 'stylised map artwork present');
    expect(state.slot === 'map', 'map CMS slot ready');
    expect(state.parallax, 'subtle parallax depth on the panel');
    expect(state.labelled, 'placeholder is labelled for assistive tech');
    expect(state.iframes === 0, 'no real map embeds anywhere');
    expect(/at launch/i.test(state.caption), 'honest launch caption');
    expect(state.wide, 'wide map strip on desktop');
  });

  await scenario('what-happens-next column + support CTA navigates to the inventory', {}, async (page) => {
    await open(page);
    const state = await page.evaluate(() => ({
      steps: document.querySelectorAll('#contact-form-section .ngd-report-list li').length,
      noteLinks: [...document.querySelectorAll('#contact-form-section .ngd-edu-note a')]
        .map((a) => a.getAttribute('href')),
      ctaLabel: document.querySelector('#contact-cta a.ngd-btn-gold').textContent.trim(),
      eduBtn: !!document.querySelector('#contact-cta a[href="education.html"]'),
    }));
    expect(state.steps === 3, 'three next-steps, got ' + state.steps);
    expect(state.noteLinks.includes('diamonds.html') && state.noteLinks.includes('education.html'),
      'aside cross-links inventory + education');
    expect(state.ctaLabel === 'Explore Our Diamonds', 'CTA label, got ' + state.ctaLabel);
    expect(state.eduBtn, 'support section offers the education guides');
    await page.click('#contact-cta a.ngd-btn-gold');
    await page.waitForURL('**/diamonds.html', { timeout: 8000 });
  });

  await scenario('scroll reveal fires through the page', {}, async (page) => {
    await open(page);
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
    });
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('.ngd-reveal');
      return [...items].every((el) => el.classList.contains('is-visible'));
    }, null, { timeout: 6000 });
  });

  await scenario('mobile 390: stacked layout, 2-across cards, full-width inputs, no overflow', { viewport: { width: 390, height: 844 } }, async (page) => {
    await open(page);
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#contact-channels .ngd-card')];
      const form = document.querySelector('#ngd-contact-form').getBoundingClientRect();
      const aside = document.querySelector('#contact-form-section .ngd-report-list').getBoundingClientRect();
      return {
        cardsPerRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        stacked: form.bottom <= aside.top + 1,
        nameW: document.getElementById('contact-name').getBoundingClientRect().width,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyW: document.body.scrollWidth,
      };
    });
    expect(state.cardsPerRow === 2, 'two info cards per row on mobile, got ' + state.cardsPerRow);
    expect(state.stacked, 'form stacks above the next-steps column');
    expect(state.nameW > 250, 'inputs stretch full width on mobile');
    expect(state.scrollW <= state.clientW + 1 && state.bodyW <= state.clientW + 1,
      `no overflow s=${state.scrollW} b=${state.bodyW} c=${state.clientW}`);
    await page.evaluate(() =>
      document.querySelector('#contact-form-section').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'contact-mobile.png') });
  });

  await scenario('tablet 768 and desktop 1440: 4-across cards, side-by-side form, no overflow', { viewport: { width: 768, height: 1024 } }, async (page) => {
    await open(page);
    let o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s <= o.c + 1, `768 no overflow s=${o.s}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    o = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#contact-channels .ngd-card')];
      const form = document.querySelector('#ngd-contact-form').getBoundingClientRect();
      const aside = document.querySelector('#contact-form-section .ngd-report-list').getBoundingClientRect();
      return {
        cardsPerRow: cards.filter((c) =>
          Math.abs(c.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 4).length,
        sideBySide: aside.left > form.right,
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      };
    });
    expect(o.cardsPerRow === 4, 'four info cards per row at 1440, got ' + o.cardsPerRow);
    expect(o.sideBySide, 'form and next-steps sit side by side at 1440');
    expect(o.s <= o.c + 1, `1440 no overflow s=${o.s}`);
    await page.evaluate(() =>
      document.querySelector('#contact-form-section').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREEN_DIR, 'contact-desktop.png') });
  });

  await browser.close();
  started.server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} contact scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS ERROR', e);
  if (browser) await browser.close();
  process.exit(2);
});
