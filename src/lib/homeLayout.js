import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from '@/lib/supabase/env.js';

/**
 * The homepage's section order, as the STOREFRONT reads it.
 *
 * public.homepage_sections (migration 0001) holds one row per section, keyed
 * by `section_key`, written from the Homepage Manager
 * (lib/supabase/queries/homepageSections.js). A visitor may read the rows
 * whose visible = true and nothing else — that is the table's own policy.
 *
 * HOW IT IS READ. Not through the Supabase SDK: Home.jsx is in the first
 * bundle, and neither the SDK nor the admin code may ride along with it. One
 * plain fetch to the REST endpoint with the publishable key, sent after the
 * page has loaded and gone quiet. The answer is kept in localStorage, so a
 * returning visitor gets the saved order on the very first paint and the
 * request only revalidates it (stale-while-revalidate). No table, no network,
 * no rows: the page draws exactly the order it always has.
 *
 * WHY THE HERO ROW CARRIES THE KEY LIST. A visitor can only read VISIBLE rows,
 * so to a visitor "hidden" and "never saved" look the same: both are missing.
 * The hero is always saved and always visible, so on every save its
 * `settings.keys` records every section the page knew about at the time. A key
 * in that list the visitor cannot see was hidden on purpose; a key not in it
 * was added to the code since, and is drawn at its built-in place rather than
 * disappearing.
 */

export const HOMEPAGE_TABLE = 'homepage_sections';
export const HERO_KEY = 'hero';

/**
 * Every section Home.jsx can draw, in the order it has always drawn them.
 * These are stored in the database: never rename one. A new section gets a new
 * key here, a block in Home.jsx and a label in the Homepage Manager.
 */
export const SECTION_KEYS = [
  HERO_KEY, 'trust-strip', 'shapes', 'story', 'lab-grown-story', 'reasons',
  'transparency', 'jewellery', 'credentials', 'client-feedback', 'faq', 'locations',
];

/** The sections after the hero, in their built-in order. */
export const DEFAULT_ORDER = SECTION_KEYS.filter((k) => k !== HERO_KEY);
const MOVABLE = new Set(DEFAULT_ORDER);

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/**
 * Rows (movable keys only) sorted by position, then every key the rows do not
 * mention put at its built-in place — straight after the nearest built-in
 * predecessor that is present, or first — unless `skip` says otherwise.
 */
export function arrangeSections(rows, skip = () => false) {
  const def = (k) => DEFAULT_ORDER.indexOf(k);
  const order = [];
  (Array.isArray(rows) ? rows : [])
    .filter((r) => isPlainObject(r) && MOVABLE.has(r.section_key))
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0) || def(a.section_key) - def(b.section_key))
    .forEach((r) => { if (!order.includes(r.section_key)) order.push(r.section_key); });
  const present = new Set(order);
  DEFAULT_ORDER.forEach((key, index) => {
    if (present.has(key) || skip(key)) return;
    const before = DEFAULT_ORDER.slice(0, index).reverse().find((k) => order.includes(k));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, key);
  });
  return order;
}

/**
 * The sections to draw after the hero, from rows as a visitor reads them.
 *
 * No rows: the built-in order, everything shown. With rows, a key the saved
 * layout knew about (the hero's key list) that is not readable was hidden; a
 * key it did not know about keeps its built-in place. Should the hero row ever
 * be missing, unmentioned keys are drawn — failing open to the page as it has
 * always been.
 */
export function resolveHomeOrder(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_ORDER;
  const hero = rows.find((r) => r?.section_key === HERO_KEY);
  const known = Array.isArray(hero?.settings?.keys) ? new Set(hero.settings.keys) : new Set();
  const inRows = new Set(rows.map((r) => r?.section_key));
  return arrangeSections(rows.filter((r) => r?.visible !== false), (key) => known.has(key) || inRows.has(key));
}

/** Same keys in the same order. */
export function sameOrder(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((k, i) => k === b[i]);
}

/* ------------------------------------------------------------------------ */
/* The read, the cache and the timing                                        */
/* ------------------------------------------------------------------------ */

const CACHE_KEY = 'ngd-home-layout';
/* Within this window a cached answer is used without asking again. The
   Homepage Manager writes the cache on save, so whoever saved sees it at once;
   everyone else within five minutes of their next page load. */
const FRESH_MS = 5 * 60 * 1000;

let memo = null;
let inflight = null;

/** A service_role JWT or an sb_secret_ key must never leave a browser. */
function isSecretKey(key) {
  if (/^sb_secret_/i.test(key)) return true;
  try {
    const payload = key.split('.')[1];
    if (!payload) return false;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role';
  } catch {
    return false;
  }
}

async function fetchVisibleRows() {
  if (!isConfigured || isSecretKey(SUPABASE_KEY)) throw new Error('Supabase is not configured for public reads.');
  /* New-format keys go in `apikey` only; a legacy anon JWT is also the bearer. */
  const headers = { apikey: SUPABASE_KEY, Accept: 'application/json' };
  if (!SUPABASE_KEY.startsWith('sb_')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${HOMEPAGE_TABLE}`
    + '?select=section_key,position,visible,settings&order=position.asc&limit=200';
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
  const res = await fetch(url, { headers, signal, credentials: 'omit' });
  if (!res.ok) throw new Error(`homepage_sections answered ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('homepage_sections answered with something other than a list');
  return data;
}

/* Only what the order needs is kept: the hero's key list, not its settings. */
function slim(rows) {
  return rows
    .filter((r) => isPlainObject(r) && typeof r.section_key === 'string')
    .map((r) => ({
      section_key: r.section_key,
      position: Number(r.position) || 0,
      visible: r.visible !== false,
      ...(r.section_key === HERO_KEY && Array.isArray(r.settings?.keys)
        ? { settings: { keys: r.settings.keys.filter((k) => typeof k === 'string') } }
        : {}),
    }));
}

function readStored() {
  if (memo) return memo;
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null');
    if (isPlainObject(parsed) && Number.isFinite(parsed.at) && Array.isArray(parsed.rows)) {
      memo = { at: parsed.at, rows: slim(parsed.rows) };
    }
  } catch {
    /* Private mode, blocked site data or a corrupt entry: no cache. */
  }
  return memo;
}

function store(rows) {
  memo = { at: Date.now(), rows: slim(rows) };
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(memo));
  } catch {
    /* The answer still holds for this page; only persistence is lost. */
  }
  return memo;
}

/**
 * The order for the FIRST render: the last layout this browser was given, or
 * the built-in order. Synchronous, no network — one small localStorage read.
 */
export function initialHomeOrder() {
  const stored = readStored();
  return stored ? resolveHomeOrder(stored.rows) : DEFAULT_ORDER;
}

/**
 * The current order, revalidated. Null when nothing could be learned (not
 * configured, offline, table missing, refused): keep what is drawn.
 */
export function loadHomeOrder() {
  if (!isConfigured) return Promise.resolve(null);
  const stored = readStored();
  if (stored && Date.now() - stored.at < FRESH_MS) return Promise.resolve(resolveHomeOrder(stored.rows));
  inflight ??= fetchVisibleRows()
    .then((rows) => resolveHomeOrder(store(rows).rows))
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Calls `onOrder` with the revalidated order once the page has loaded and the
 * main thread is idle — never during the first render, never competing with
 * the hero picture. Returns a cancel function for an effect's cleanup.
 */
export function afterHomeSettles(onOrder) {
  if (typeof window === 'undefined') return () => {};
  let idle = 0;
  let alive = true;
  const later = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 4000 })
    : (fn) => window.setTimeout(fn, 1200);
  const run = () => {
    idle = later(() => {
      loadHomeOrder().then((order) => { if (alive && order) onOrder(order); });
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

/**
 * Put a just-saved layout into this browser's cache, so the admin who saved it
 * sees it on the homepage straight away rather than after the cache expires.
 */
export function rememberHomeLayout(rows) {
  if (typeof window === 'undefined' || !Array.isArray(rows)) return;
  store(rows);
}
