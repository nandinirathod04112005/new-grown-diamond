import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from '@/lib/supabase/env.js';
import { ENQUIRY_DESK, OFFICES, PAGES } from '@/pages/siteContent.js';

/**
 * The details and copy an administrator can change without a deploy, as the
 * storefront reads them.
 *
 * WHERE THEY LIVE. public.site_content, with its existing policies — there is
 * no settings table and none is added. Two page names are reserved here and
 * nowhere else writes to them:
 *
 *   page = 'settings', section = 'business'   the enquiry desk, WhatsApp
 *        number, the four offices and the social links. One row, so a save is
 *        one write and a visitor never sees half of an edit.
 *   page = 'content',  section = 'announcement'   the announcement bar.
 *   page = 'content',  section = '/about' … '/why-lab-grown'   an editorial
 *        page's eyebrow / title / intro.
 *
 * English sits in the row's plain-text columns; everything else — Hindi,
 * Gujarati, the office list, an end date — sits in the jsonb column, which is
 * named `draft` by the table and carries { v, live, pending } here. `live` is
 * what is published; `pending` is an unpublished edit the storefront never
 * asks for (it selects `draft->live` only).
 *
 * HOW IT IS READ. Not through the Supabase SDK: that would put the SDK on the
 * first page of every visit for the sake of a phone number. One plain fetch to
 * the REST endpoint with the publishable key, sent once per page load after the
 * page has painted and gone idle. What it returns is kept in localStorage, so a
 * returning visitor gets the saved values on the very first paint and the
 * request only revalidates them. When nothing is saved, or the request fails,
 * the built-in values below are what the site shows — exactly what it showed
 * before any of this existed.
 *
 * NOTHING IS TRUSTED. Every value is checked against the same rules the
 * Control Centre enforces before it reaches a page; a field that fails falls
 * back to its built-in value on its own, so one bad field cannot take a
 * section — or a tel: link — down with it.
 */

export const SETTINGS_PAGE = 'settings';
export const SETTINGS_SECTION = 'business';
export const CONTENT_PAGE = 'content';
export const ANNOUNCEMENT_SECTION = 'announcement';

export const LANGS = ['en', 'hi', 'gu'];
/* The editorial routes, in the order siteContent.js declares them. */
export const INTRO_ROUTES = Object.keys(PAGES);
export const INTRO_FIELDS = ['eyebrow', 'title', 'intro'];

export const LIMITS = {
  city: 60,
  address: 240,
  phone: 30,
  email: 254,
  url: 300,
  href: 300,
  lines: 3,
  message: 140,
  linkLabel: 40,
  eyebrow: 80,
  title: 160,
  intro: 600,
};

/* ---------------- the rules, shared with the Control Centre ---------------- */

/** Any control character; tabs and newlines too unless `multiline`. */
export function hasControlChars(value, multiline = false) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 127) return true;
    if (code < 32 && !(multiline && (code === 9 || code === 10 || code === 13))) return true;
  }
  return false;
}

/* A tag, not a stray "<" — "under <1 ct" is text, "<b>" is markup. */
export const looksLikeHtml = (value) => /<\/?[a-z!][^>]*>/i.test(value);

/** Plain text on one line, within `max`. */
export const isPlainLine = (value, max) => typeof value === 'string'
  && value.length <= max && !hasControlChars(value) && !looksLikeHtml(value);

/* The dialled form: E.164, a plus and 7–15 digits. */
export const TEL_PATTERN = /^\+[1-9]\d{6,14}$/;
export const isTel = (value) => typeof value === 'string' && TEL_PATTERN.test(value);

/* The printed form: digits and the punctuation people print numbers with. */
export const isPhoneDisplay = (value) => typeof value === 'string'
  && value.length <= LIMITS.phone
  && /^[+()\-.\s\d]+$/.test(value)
  && value.replace(/\D/g, '').length >= 7;

export const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
export const isEmail = (value) => typeof value === 'string' && value.length <= LIMITS.email && EMAIL_PATTERN.test(value);

export function isHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > LIMITS.url || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/* A path on this site: one leading slash (never "//", which is another host). */
export const isInternalPath = (value) => typeof value === 'string'
  && value.length <= LIMITS.href && /^\/(?![/\\])[^\s\\<>"]*$/.test(value);

/* ---------------- the built-in values ---------------- */

/**
 * The social profiles, in the order the footer shows them. The icon paths stay
 * in SocialLinks.jsx; only the addresses are editable.
 */
export const SOCIAL_NETWORKS = [
  { key: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/newlabgrowndiamond' },
  { key: 'linkedin', name: 'LinkedIn', href: 'https://www.linkedin.com/company/newgrowndiamond/home/' },
  { key: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/newgrowndiamond/' },
  { key: 'x', name: 'X', href: 'https://x.com/newgrowndiamon' },
  { key: 'pinterest', name: 'Pinterest', href: 'https://in.pinterest.com/NewGrownDiamondJewellery/' },
];

/* The two further New York lines the contact page has always listed. */
const NEW_YORK_LINES = [
  { phone: '+1 212 389 5176', tel: '+12123895176' },
  { phone: '+1 212 389 5178', tel: '+12123895178' },
];

/**
 * Today's details, word for word from siteContent.js and the pages that
 * carried them. `lines` are an office's further numbers; `email` may be empty.
 */
export const DEFAULT_SETTINGS = {
  desk: { phone: ENQUIRY_DESK.phone, tel: ENQUIRY_DESK.tel, email: 'newgrowndiamonds@gmail.com' },
  /* WhatsApp has always been the desk line. */
  whatsapp: ENQUIRY_DESK.tel,
  offices: OFFICES.map((office) => ({
    city: office.city,
    address: office.address,
    phone: office.phone,
    tel: office.tel,
    email: office.email ?? '',
    lines: office.city === 'New York' ? NEW_YORK_LINES : [],
  })),
  social: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, n.href])),
};

/* ---------------- saved values over the built-in ones ---------------- */

const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const pick = (value, ok, fallback) => (ok(value) ? value : fallback);
/* '' is a deliberate blank (no email, hide this icon); anything else must pass. */
const optional = (value, ok, fallback) => (value === '' ? '' : ok(value) ? value : fallback);
const required = (max) => (value) => isPlainLine(value, max) && value.trim() !== '';

function mergeOffice(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;
  return {
    city: pick(raw.city, required(LIMITS.city), fallback.city),
    address: pick(raw.address, required(LIMITS.address), fallback.address),
    phone: pick(raw.phone, isPhoneDisplay, fallback.phone),
    tel: pick(raw.tel, isTel, fallback.tel),
    email: optional(raw.email, isEmail, fallback.email),
    lines: Array.isArray(raw.lines)
      ? raw.lines
        .filter((line) => line && isPhoneDisplay(line.phone) && isTel(line.tel))
        .slice(0, LIMITS.lines)
        .map((line) => ({ phone: line.phone, tel: line.tel }))
      : fallback.lines,
  };
}

/** A saved settings object (or nothing) over DEFAULT_SETTINGS, field by field. */
export function mergeSettings(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  const desk = obj(raw.desk);
  const offices = Array.isArray(raw.offices) ? raw.offices : [];
  const social = obj(raw.social);
  return {
    desk: {
      phone: pick(desk.phone, isPhoneDisplay, d.desk.phone),
      tel: pick(desk.tel, isTel, d.desk.tel),
      email: pick(desk.email, isEmail, d.desk.email),
    },
    whatsapp: pick(raw.whatsapp, isTel, d.whatsapp),
    /* Always the four places: the homepage names them by position. */
    offices: d.offices.map((fallback, i) => mergeOffice(offices[i], fallback)),
    social: Object.fromEntries(SOCIAL_NETWORKS.map(({ key }) => [key, optional(social[key], isHttpsUrl, d.social[key])])),
  };
}

/* ---------------- content rows ---------------- */

const cleanLine = (value, max) => (isPlainLine(value, max) ? value.trim() : '');

/** Stable per message, so a dismissal is remembered for THAT message only. */
export function announcementId(a) {
  const text = JSON.stringify([a.message, a.link?.href ?? '', a.link?.label ?? null]);
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `a${h.toString(36)}`;
}

/**
 * A published announcement row, or null when it has nothing to say. `live` is
 * the row's draft->live: { hi: { message, link_label }, gu: {…}, ends_at }.
 */
export function readAnnouncement(row) {
  if (!row) return null;
  const live = obj(row.live);
  const message = { en: cleanLine(row.body, LIMITS.message) };
  if (!message.en) return null;
  const label = { en: cleanLine(row.cta_label, LIMITS.linkLabel) };
  for (const lang of LANGS.slice(1)) {
    message[lang] = cleanLine(obj(live[lang]).message, LIMITS.message);
    label[lang] = cleanLine(obj(live[lang]).link_label, LIMITS.linkLabel);
  }
  const href = typeof row.cta_href === 'string' ? row.cta_href.trim() : '';
  const external = isHttpsUrl(href);
  const link = label.en && (external || isInternalPath(href)) ? { href, label, external } : null;
  const endsAt = Date.parse(live.ends_at ?? '');
  const out = { message, link, endsAt: Number.isFinite(endsAt) ? endsAt : null };
  return { ...out, id: announcementId(out) };
}

/**
 * An editorial page's published override: { en, hi, gu }, each holding only
 * the fields that were set. English is in the columns (subheading = eyebrow,
 * heading = title, body = intro); Hindi and Gujarati are in draft->live.
 */
export function readIntro(row) {
  const live = obj(row.live);
  const out = {};
  let any = false;
  for (const lang of LANGS) {
    const source = lang === 'en' ? { eyebrow: row.subheading, title: row.heading, intro: row.body } : obj(live[lang]);
    const fields = {};
    for (const field of INTRO_FIELDS) {
      const value = cleanLine(source[field], LIMITS[field]);
      if (value) { fields[field] = value; any = true; }
    }
    out[lang] = fields;
  }
  return any ? out : null;
}

/**
 * The words a visitor sees: the override for their language, field by field,
 * over the page's own (already translated) words. A field without an override
 * keeps the built-in text in that language.
 */
export function applyIntroOverride(page, intro, locale) {
  const over = intro?.[locale];
  if (!over || !page) return page;
  let changed = false;
  const out = { ...page };
  for (const field of INTRO_FIELDS) {
    if (over[field]) { out[field] = over[field]; changed = true; }
  }
  return changed ? out : page;
}

function fromRows(rows, previous) {
  let settings = DEFAULT_SETTINGS;
  let announcement = null;
  const intros = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    if (row.page === SETTINGS_PAGE && row.section === SETTINGS_SECTION) {
      settings = mergeSettings(obj(row.live));
    } else if (row.page === CONTENT_PAGE && row.section === ANNOUNCEMENT_SECTION) {
      announcement = readAnnouncement(row);
    } else if (row.page === CONTENT_PAGE && INTRO_ROUTES.includes(row.section)) {
      const intro = readIntro(row);
      if (intro) intros[row.section] = intro;
    }
  }
  /* Unchanged parts keep their identity, so a component reading only the
     settings does not re-render because the announcement changed. */
  const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  return {
    settings: previous && same(previous.settings, settings) ? previous.settings : settings,
    announcement: previous && same(previous.announcement, announcement) ? previous.announcement : announcement,
    intros: previous && same(previous.intros, intros) ? previous.intros : intros,
  };
}

/* ---------------- the cache ---------------- */

const CACHE_KEY = 'ngd-site-content';
const CACHE_VERSION = 1;
const browser = typeof window !== 'undefined';

function readCache(text) {
  try {
    const parsed = JSON.parse(text ?? 'null');
    return parsed && parsed.v === CACHE_VERSION && Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

function storedRows() {
  if (!browser) return null;
  try {
    return readCache(window.localStorage.getItem(CACHE_KEY));
  } catch {
    // Private mode and blocked site data both throw on read; the built-in
    // values stand, which is what the site showed before this existed.
    return null;
  }
}

function writeCache(rows) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, at: Date.now(), rows }));
  } catch {
    // Only the next visit's head start is lost.
  }
}

/* ---------------- the store ---------------- */

const initialRows = storedRows();
let rowsKey = JSON.stringify(initialRows);
let state = fromRows(initialRows, null);
const listeners = new Set();

function apply(rows) {
  const key = JSON.stringify(rows);
  if (key === rowsKey) return false;
  rowsKey = key;
  state = fromRows(rows, state);
  listeners.forEach((listener) => listener());
  return true;
}

const SELECT = 'page,section,heading,subheading,body,cta_label,cta_href,live:draft->live';

async function fetchRows() {
  const base = SUPABASE_URL.replace(/\/+$/, '');
  const query = `select=${encodeURIComponent(SELECT)}&page=in.(${SETTINGS_PAGE},${CONTENT_PAGE})&published=eq.true&limit=50`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    /* The publishable key on the apikey header only: a publishable key is not
       a JWT, and sent as a Bearer token it is refused. */
    const res = await fetch(`${base}/rest/v1/site_content?${query}`, {
      headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`site_content answered ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('site_content answered with something other than a list');
    return rows;
  } finally {
    clearTimeout(timer);
  }
}

let inflight = null;

/**
 * Ask again now. The storefront calls it once per page load, after idle; the
 * Control Centre calls it after a save so the same browser shows the change
 * without waiting for its next visit. Resolves true when anything changed.
 */
export function refreshSiteContent() {
  if (!browser || !isConfigured) return Promise.resolve(false);
  inflight ??= fetchRows()
    .then((rows) => {
      writeCache(rows);
      return apply(rows);
    })
    .catch((error) => {
      if (import.meta.env.DEV) console.warn('[NGD] site content not refreshed; keeping what is shown:', error?.message || error);
      return false;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

let scheduled = false;

/* After the first paint and once the main thread is quiet — never ahead of
   anything the page needs to render. */
function scheduleLoad() {
  if (scheduled || !browser || !isConfigured) return;
  scheduled = true;
  const later = () => {
    const idle = window.requestIdleCallback;
    if (idle) idle(() => refreshSiteContent(), { timeout: 4000 });
    else window.setTimeout(() => refreshSiteContent(), 1200);
  };
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

if (browser) {
  /* Another tab refreshed the cache (or the Control Centre saved): follow it. */
  window.addEventListener('storage', (event) => {
    if (event.key !== CACHE_KEY) return;
    const rows = readCache(event.newValue);
    if (rows) apply(rows);
  });
}

/** For useSyncExternalStore. Subscribing is what starts the one request. */
export function subscribeSiteContent(listener) {
  listeners.add(listener);
  scheduleLoad();
  return () => listeners.delete(listener);
}

/** { settings, announcement, intros } — the same object until something changes. */
export const getSiteContent = () => state;

/** Merged settings, outside React (whatsapp.js builds its links from this). */
export const getSiteSettings = () => state.settings;
