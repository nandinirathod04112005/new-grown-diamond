/*
 * Relative imports only, and nothing that touches import.meta.env or the
 * Supabase client: scripts/generate-seo-pages.mjs imports this file in plain
 * Node, where the bundler's '@' alias and import.meta.env do not exist.
 */
import { DEFAULT_OG_IMAGE, normalizePath, PUBLIC_ROUTES, SEO_BY_ROUTE, seoForPath, SITE_URL } from '../config/seo.js';
import { DEFAULT_LOCALE, localePath, splitLocale } from '../i18n/locales.js';

/**
 * Per-route SEO overrides from public.seo_settings (migration 0001), as the
 * SITE and the BUILD read them. The SEO Manager writes them
 * (lib/supabase/queries/seoSettings.js).
 *
 * A row overrides the built-in values in src/config/seo.js for ONE route, and
 * each field falls back on its own: a row with only a description keeps the
 * built-in title. Only published rows are readable without signing in — that
 * is the table's own policy.
 *
 *   SeoHead          — one plain fetch to the REST endpoint with the
 *                      publishable key, after the page has loaded and gone
 *                      quiet; cached in localStorage and revalidated in the
 *                      background. Never the SDK: SeoHead is in the first
 *                      bundle.
 *   the build script — the same fetch, once, to write the published English
 *                      values into the prerendered pages crawlers read.
 *                      Offline or unconfigured, it carries on without them.
 *
 * Title, description and share image reach the prerendered English pages.
 * noindex and a custom canonical are applied by SeoHead only: the site's SEO
 * check (scripts/validate-seo.mjs) requires every public shell to be
 * index,follow with its own address as canonical, and it stays as it is.
 * Hindi and Gujarati pages use an override only when it was written for that
 * exact address (/hi/diamonds, /gu, ...).
 */

export const SEO_TABLE = 'seo_settings';
/* Share images named by a bare path live in this public bucket. */
export const OG_BUCKET = 'site-media';

export const SEO_LIMITS = {
  /* What search results show before truncating, roughly. Guidance, not rules. */
  title: { ideal: [50, 60], max: 120 },
  description: { ideal: [140, 160], max: 320 },
  path: 500,
};

export const PUBLIC_COLUMNS = ['route', 'title', 'description', 'og_image_path', 'canonical', 'noindex'];
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/* ------------------------------------------------------------------------ */
/* Pure helpers                                                              */
/* ------------------------------------------------------------------------ */

/** One line of plain text: control characters and runs of spaces collapsed. */
export function cleanText(value, max = Infinity) {
  const s = String(value ?? '').replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : '';
}

/** Every route the manager edits, in one language. */
export function routesFor(locale = DEFAULT_LOCALE) {
  return PUBLIC_ROUTES.map((base) => ({ base, route: localePath(base, locale), locale }));
}

/** A public route, in English or at its exact /hi or /gu address. */
export function isEditableRoute(route) {
  if (typeof route !== 'string') return false;
  const { locale, path } = splitLocale(route);
  return PUBLIC_ROUTES.includes(path) && localePath(path, locale) === route;
}

export const isEnglishRoute = (route) => PUBLIC_ROUTES.includes(route);

/** What src/config/seo.js gives the route today. */
export function builtInSeo(route) {
  const { locale, path } = splitLocale(route);
  const seo = seoForPath(path);
  return { title: seo.title, description: seo.description, image: seo.image, url: `${SITE_URL}${localePath(path, locale)}` };
}

/**
 * A share image as an absolute https address, or '' when it cannot be one.
 *
 *   https://…              used as given
 *   /og-cover.jpg          a file in the site's public folder
 *   journal/x/cover.jpg    a path in the public site-media bucket
 *
 * Anything else — http:, data:, a protocol-relative address — is refused.
 */
export function resolveOgImage(value, supabaseUrl) {
  const p = String(value ?? '').trim();
  if (!p || p.length > SEO_LIMITS.path || /[\n\r\t]/.test(p) || p.includes('..')) return '';
  /* The URL parser does the encoding (spaces become %20, an existing %20
     stays), and the origin checks catch "//elsewhere" and "/\elsewhere". */
  try {
    if (/^https:\/\//i.test(p)) return new URL(p).href;
    if (p.startsWith('/')) {
      const url = new URL(p, SITE_URL);
      return url.origin === new URL(SITE_URL).origin ? url.href : '';
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(p) || /[?#\\]/.test(p) || !supabaseUrl) return '';
    /* A path pasted with the bucket name in front still means the same file. */
    const bare = p.startsWith(`${OG_BUCKET}/`) ? p.slice(OG_BUCKET.length + 1) : p;
    const base = new URL(`${String(supabaseUrl).replace(/\/+$/, '')}/storage/v1/object/public/${OG_BUCKET}/`);
    const url = new URL(bare.replace(/^\/+/, ''), base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * A canonical address on this site, or ''.
 *
 * Deliberately narrow: https, this host, no query and no fragment. A wrong
 * canonical tells a search engine to drop the page, which is worse than none.
 */
export function cleanCanonical(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  let url;
  try { url = new URL(s); } catch { return ''; }
  const site = new URL(SITE_URL);
  if (url.protocol !== 'https:' || url.host !== site.host || url.search || url.hash || url.username || url.password) return '';
  return url.href;
}

/** A published row as the site applies it, or null when it changes nothing. */
export function normalizeOverride(row, supabaseUrl) {
  if (!isPlainObject(row)) return null;
  const title = cleanText(row.title, SEO_LIMITS.title.max);
  const description = cleanText(row.description, SEO_LIMITS.description.max);
  /* The house card named explicitly is no change, and keeps its size and alt. */
  const resolved = resolveOgImage(row.og_image_path, supabaseUrl);
  const image = resolved === DEFAULT_OG_IMAGE ? '' : resolved;
  const canonical = cleanCanonical(row.canonical);
  const noindex = row.noindex === true;
  if (!title && !description && !image && !canonical && !noindex) return null;
  return { title, description, image, canonical, noindex };
}

const sameText = (a, b) => {
  const x = cleanText(a).toLowerCase();
  return x !== '' && x === cleanText(b).toLowerCase();
};

/**
 * The other English route whose title (or description) this would repeat —
 * its built-in text, or a live override in `liveRows` — or null.
 *
 * Every public page needs its own title and description; the prerender check
 * fails the build on a repeat. Checked against the OTHER routes' built-in text
 * even where those routes have overrides of their own, which is stricter than
 * the check needs and is what keeps every result unique whatever is published.
 */
export function duplicateOf(field, value, route, liveRows = []) {
  if (!cleanText(value)) return null;
  for (const other of PUBLIC_ROUTES) {
    if (other !== route && sameText(SEO_BY_ROUTE[other]?.[field], value)) return other;
  }
  for (const row of liveRows) {
    if (row && row.route !== route && isEnglishRoute(row.route) && sameText(row[field], value)) return row.route;
  }
  return null;
}

/**
 * Published rows → the overrides to apply, by route.
 *
 * Only public routes. On an English route a title or description that repeats
 * another page's is dropped (with a warning) and the built-in one kept, so the
 * prerendered pages and the live site agree and the build never fails over it.
 */
export function applicableOverrides(rows, supabaseUrl, warn = () => {}) {
  const live = (Array.isArray(rows) ? rows : []).filter((r) => isPlainObject(r) && isEditableRoute(r.route));
  const out = new Map();
  [...live].sort((a, b) => a.route.localeCompare(b.route)).forEach((row) => {
    const o = normalizeOverride(row, supabaseUrl);
    if (!o) return;
    if (isEnglishRoute(row.route)) {
      ['title', 'description'].forEach((field) => {
        const clash = o[field] && duplicateOf(field, o[field], row.route, live);
        if (clash) {
          warn(`${row.route}: its ${field} repeats ${clash}'s, so the built-in ${field} is kept.`);
          o[field] = '';
        }
      });
    }
    if (o.title || o.description || o.image || o.canonical || o.noindex) out.set(row.route, o);
  });
  return out;
}

/** The override for the page being shown, or null. */
export function overrideForRoute(state, path, locale = DEFAULT_LOCALE) {
  const base = normalizePath(path);
  if (!PUBLIC_ROUTES.includes(base)) return null;
  return state?.byRoute?.[localePath(base, locale)] ?? null;
}

/**
 * The page's JSON-LD with an overridden title and description written in, so
 * the structured data does not contradict the page it describes.
 */
export function patchSchemas(schemas, { title, description }) {
  return schemas.map((schema) => {
    if (schema['@type'] === 'WebPage') return { ...schema, name: title, description };
    if (schema['@type'] === 'BlogPosting') return { ...schema, description };
    /* A two-step trail names the page by its title's first part; an article's
       three-step trail names the article, which an override does not change. */
    if (schema['@type'] === 'BreadcrumbList' && schema.itemListElement?.length === 2) {
      const [home, page] = schema.itemListElement;
      return { ...schema, itemListElement: [home, { ...page, name: title.split(' | ')[0] }] };
    }
    return schema;
  });
}

/* Only the public columns, whatever arrived. */
function publicRow(row) {
  return Object.fromEntries(PUBLIC_COLUMNS.map((c) => [c, row?.[c] ?? null]));
}

/* ------------------------------------------------------------------------ */
/* Reading published rows without the SDK (site and build script)            */
/* ------------------------------------------------------------------------ */

/** A service_role JWT or an sb_secret_ key: never to be sent from here. */
export function isSecretKey(key) {
  const k = String(key ?? '');
  if (/^sb_secret_/i.test(k)) return true;
  try {
    const payload = k.split('.')[1];
    if (!payload) return false;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role';
  } catch {
    return false;
  }
}

/** Every published row, through PostgREST with the publishable key. */
export async function fetchPublishedSeoRows({ url, key, timeoutMs = 8000 }) {
  if (!url || !key) throw new Error('Supabase is not configured.');
  if (isSecretKey(key)) throw new Error('Refusing to send a secret or service_role key.');
  /* New-format keys go in `apikey` only; a legacy anon JWT is also the bearer. */
  const headers = { apikey: key, Accept: 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  const endpoint = `${String(url).replace(/\/+$/, '')}/rest/v1/${SEO_TABLE}`
    + `?select=${PUBLIC_COLUMNS.join(',')}&published=eq.true&order=route.asc&limit=1000`;
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const res = await fetch(endpoint, { headers, signal, credentials: 'omit' });
  if (!res.ok) throw new Error(`seo_settings answered ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('seo_settings answered with something other than a list');
  return data.map(publicRow);
}

/*
 * The record a prerendered page carries: the published row it was built with,
 * and when. SeoHead reads it on the first render, so a visitor with no cache
 * (and a crawler that runs scripts) keeps the published values from the start
 * instead of seeing the built-in ones until the background read returns.
 */
const RECORD_SELECTOR = 'script[type="application/json"][data-ngd-seo-override]';

export function shellRecordTag(row, at) {
  const json = JSON.stringify({ at, row: publicRow(row) }).replace(/</g, '\\u003c');
  return `<script type="application/json" data-ngd-seo-override>${json}</script>`;
}

function readShellRecord() {
  try {
    const node = document.querySelector(RECORD_SELECTOR);
    if (!node) return null;
    const parsed = JSON.parse(node.textContent);
    if (isPlainObject(parsed) && Number.isFinite(parsed.at) && isPlainObject(parsed.row) && isEditableRoute(parsed.row.route)) {
      return { at: parsed.at, row: publicRow(parsed.row) };
    }
  } catch {
    /* A malformed record is ignored; the built-in values stand. */
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* The site's cache: stale-while-revalidate in localStorage                  */
/* ------------------------------------------------------------------------ */

const CACHE_KEY = 'ngd-seo-overrides';
const FRESH_MS = 5 * 60 * 1000;

/** `{ at, sig, byRoute }`; `sig` lets a caller skip an update that changes nothing. */
export const NO_OVERRIDES = Object.freeze({ at: 0, sig: '{}', byRoute: Object.freeze({}) });

let memo = null;
let inflight = null;

function stateFrom(at, rows, supabaseUrl) {
  const byRoute = Object.fromEntries(applicableOverrides(rows, supabaseUrl));
  return { at, sig: JSON.stringify(byRoute), byRoute };
}

function readStored() {
  if (memo) return memo;
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null');
    if (isPlainObject(parsed) && Number.isFinite(parsed.at) && Array.isArray(parsed.rows)) {
      memo = { at: parsed.at, rows: parsed.rows.map(publicRow) };
    }
  } catch {
    /* Private mode, blocked site data or a corrupt entry: no cache. */
  }
  return memo;
}

function store(rows) {
  memo = { at: Date.now(), rows: rows.map(publicRow) };
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(memo));
  } catch {
    /* Holds for this page; only persistence is lost. */
  }
  return memo;
}

/**
 * The overrides for the FIRST render, without the network: this browser's
 * cache, or the record the prerendered page was built with, whichever is newer.
 */
export function initialSeoOverrides(supabaseUrl) {
  if (typeof window === 'undefined') return NO_OVERRIDES;
  const stored = readStored();
  const shell = readShellRecord();
  if (shell && (!stored || shell.at > stored.at)) {
    const rows = [...(stored?.rows ?? []).filter((r) => r.route !== shell.row.route), shell.row];
    return stateFrom(shell.at, rows, supabaseUrl);
  }
  return stored ? stateFrom(stored.at, stored.rows, supabaseUrl) : NO_OVERRIDES;
}

/** The published overrides, revalidated; null when nothing could be learned. */
export function loadSeoOverrides({ url, key }) {
  const stored = readStored();
  if (stored && Date.now() - stored.at < FRESH_MS) return Promise.resolve(stateFrom(stored.at, stored.rows, url));
  inflight ??= fetchPublishedSeoRows({ url, key })
    .then((rows) => { const s = store(rows); return stateFrom(s.at, s.rows, url); })
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Calls `onState` with the revalidated overrides once the page has loaded and
 * the main thread is idle. Returns a cancel function for an effect's cleanup.
 */
export function afterSeoSettles({ url, key }, onState) {
  if (typeof window === 'undefined') return () => {};
  let idle = 0;
  let alive = true;
  const later = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 3000 })
    : (fn) => window.setTimeout(fn, 1200);
  const run = () => {
    idle = later(() => {
      loadSeoOverrides({ url, key }).then((state) => { if (alive && state) onState(state); });
    });
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    alive = false;
    window.removeEventListener('load', run);
    (window.cancelIdleCallback || window.clearTimeout)(idle);
  };
}

/** Drop this browser's cache, so the next page load reads the published rows afresh. */
export function forgetSeoCache() {
  memo = null;
  try { window.localStorage.removeItem(CACHE_KEY); } catch { /* nothing cached */ }
}
