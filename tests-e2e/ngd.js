/**
 * Shared vocabulary for the NGD visual QA suite.
 *
 * Everything here exists because a raw `page.goto` is not enough for this
 * page: it has a preloader that must clear, GSAP timelines that only fire on
 * scroll, and two pinned sections whose content does not exist in the DOM's
 * resting state. Tests that skip these steps pass against a page nobody can
 * actually see.
 */

export const CHAPTERS = [
  { id: 'genesis',     name: 'Genesis',     heading: /Gas becomes stone/i },
  { id: 'precision',   name: 'Precision',   heading: /Four properties/i },
  { id: 'inventory',   name: 'Inventory',   heading: /Stones we actually hold/i },
  { id: 'manufacture', name: 'Manufacture', heading: /Seven stages/i },
  { id: 'atelier',     name: 'Atelier',     heading: /Once the stone is right/i },
  { id: 'assurance',   name: 'Assurance',   heading: /Verified by someone/i },
  { id: 'ascent',      name: 'Ascent',      heading: /Tell us what you are looking for/i },
];

/** Collects console errors and page exceptions for the life of the page. */
export function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Known-benign noise from the software rasteriser and three's own
    // deprecation notices — neither is a defect in this codebase.
    if (/GL Driver Message|WebGL-0x|THREE\.Clock: This module has been deprecated/.test(t)) return;
    errors.push(t);
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

/** Load the homepage and wait for the preloader to finish and leave. */
export async function openHome(page, { reducedMotion } = {}) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  if (!reducedMotion) {
    // The preloader resolves on real asset progress; it is gone once its
    // status region unmounts.
    await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 20_000 });
  }
  await page.waitForTimeout(600);
}

/**
 * Scroll the whole page in viewport-sized steps.
 *
 * ScrollTrigger only fires for content that has actually passed through the
 * viewport. A full-page screenshot does NOT do this — Playwright captures
 * beyond the viewport without scrolling, so every reveal below the fold stays
 * at its start value and the page looks blank. Walking it is the only way to
 * see what a visitor sees.
 */
export async function walkPage(page, { settle = 260 } = {}) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = Math.floor(page.viewportSize().height * 0.75);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await page.waitForTimeout(settle);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(settle);
}

/** Scroll one chapter to the top of the viewport and let its motion settle. */
export async function gotoChapter(page, id, { settle = 1200 } = {}) {
  await page.evaluate((i) => {
    document.getElementById(i)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, id);
  await page.waitForTimeout(settle);
}

/** Elements wider than the document — the cause of any horizontal scrollbar. */
export async function overflowReport(page) {
  return page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { sel: el.tagName.toLowerCase() + (el.className?.toString ? '.' + el.className.toString().slice(0, 34) : ''), right: Math.round(r.right), left: Math.round(r.left) };
      })
      .filter((o) => o.right > docW + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 6);
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: docW, offenders };
  });
}

/**
 * Text that is actually being cut off.
 *
 * The naive check — scrollHeight > clientHeight — is wrong, and wrong in a way
 * that reports the whole design as broken: with `overflow: visible` (the
 * default) a tight line-height simply paints glyphs outside the padding box
 * and nothing is lost. Real clipping requires something that CLIPS.
 *
 * So: find the nearest ancestor-or-self that actually clips, then ask whether
 * the text escapes it. Elements that opt into clipping as a design device —
 * SplitType's line masks, the horizontal rail — are excluded by name.
 */
export async function clippedText(page) {
  return page.evaluate(() => {
    const CLIPS = /hidden|clip|auto|scroll/;
    const out = [];

    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,a,button')) {
      const text = el.textContent?.trim();
      if (!text) continue;

      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.08) continue;
      if (el.closest('.ngd-visually-hidden, .line, [aria-hidden="true"]')) continue;

      // Parked off-canvas until focused (the skip link). Not clipped — hidden
      // by design, and revealed intact on focus.
      const rect0 = el.getBoundingClientRect();
      if (rect0.bottom < 0 || rect0.right < 0
          || rect0.top > window.innerHeight || rect0.left > window.innerWidth) continue;

      // Concealed by an ancestor (hover-revealed row, cross-fading caption):
      // deliberate, not truncation.
      let concealed = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.display === 'none' || acs.visibility === 'hidden' || Number(acs.opacity) < 0.08) { concealed = true; break; }
      }
      if (concealed) continue;

      // Single-line truncation on the element itself.
      //
      // Only meaningful for elements whose own text is what overflows. A
      // container's scrollWidth also counts absolutely-positioned and block
      // children — the Manufacture stage clips a deliberately oversized plate
      // number, which is the design, not truncation.
      const ownTextOnly = [...el.children].every((c) => {
        const ccs = getComputedStyle(c);
        return ccs.position === 'static' && ccs.display.startsWith('inline');
      });
      if (ownTextOnly && CLIPS.test(cs.overflowX) && el.scrollWidth - el.clientWidth > 2) {
        out.push({ sel: el.tagName.toLowerCase() + '.' + (el.className?.toString?.().slice(0, 28) || ''), text: text.slice(0, 44), reason: 'self overflow-x' });
        continue;
      }

      // Escaping a clipping ancestor.
      let clipper = null;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (CLIPS.test(acs.overflow) || CLIPS.test(acs.overflowY) || CLIPS.test(acs.overflowX)) { clipper = a; break; }
      }
      if (!clipper) continue;
      // A scrollable container is not clipping — the content is reachable.
      const ccs = getComputedStyle(clipper);
      const scrollable = /auto|scroll/.test(ccs.overflowX) || /auto|scroll/.test(ccs.overflowY);
      if (scrollable) continue;

      const r = el.getBoundingClientRect();
      const c = clipper.getBoundingClientRect();
      const lost = Math.max(0, c.top - r.top) + Math.max(0, r.bottom - c.bottom)
                 + Math.max(0, c.left - r.left) + Math.max(0, r.right - c.right);
      if (lost > 3) {
        out.push({
          sel: el.tagName.toLowerCase() + '.' + (el.className?.toString?.().slice(0, 28) || ''),
          text: text.slice(0, 44),
          reason: `cut by ${clipper.tagName.toLowerCase()}.${(clipper.className?.toString?.().slice(0, 22) || '')} by ${Math.round(lost)}px`,
        });
      }
    }
    return out.slice(0, 8);
  });
}

/** Images that failed to decode, plus any that rendered at zero size. */
export async function brokenImages(page) {
  return page.evaluate(() => [...document.images]
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt })));
}

/** Visible text elements still sitting at opacity 0 after their reveal should have run. */
export async function invisibleText(page) {
  return page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p,li,dd,dt')]
    .filter((el) => el.offsetParent !== null && getComputedStyle(el).opacity === '0')
    .map((el) => ({
      sel: el.tagName.toLowerCase() + '.' + (el.className?.toString?.().slice(0, 30) || ''),
      text: (el.textContent || '').trim().slice(0, 44),
      section: el.closest('section')?.id || '-',
    }))
    .slice(0, 10));
}

/**
 * How much readable content currently occupies the viewport.
 *
 * Counting dark pixels does NOT work here: the design is deliberately
 * near-black, so a perfectly good Genesis frame is 98% dark and a naive
 * darkness threshold flags the design itself as a defect.
 *
 * What actually matters for a pinned section is whether a visitor can see
 * anything to read. This measures that directly — text elements intersecting
 * the viewport, with real opacity and real size — and returns both the count
 * and the share of the viewport they cover.
 */
export async function viewportContent(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    let covered = 0;
    const visible = [];

    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,a,button,img,canvas')) {
      if (el.closest('.ngd-visually-hidden')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.08) continue;

      // An ancestor may be doing the hiding.
      let hidden = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.display === 'none' || acs.visibility === 'hidden' || Number(acs.opacity) < 0.08) { hidden = true; break; }
      }
      if (hidden) continue;

      const r = el.getBoundingClientRect();
      const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const w = Math.min(r.right, vw) - Math.max(r.left, 0);
      if (h <= 2 || w <= 2) continue;

      if (el.tagName !== 'CANVAS' && el.tagName !== 'IMG' && !(el.textContent || '').trim()) continue;
      visible.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 30) });
      covered += (h * w) / (vh * vw);
    }

    return { count: visible.length, coverage: Math.min(covered, 1), sample: visible.slice(0, 4) };
  });
}
