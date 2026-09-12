import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from '@/lib/supabase/env.js';
import { splitLocale } from '@/i18n/locales.js';

/**
 * First-party visit counting.
 *
 * One small POST per page view (and two for the contact form's funnel) into
 * public.analytics_events. Plain fetch, no SDK: the Supabase client is kept off
 * the storefront's first load, and a counter must never be the reason a page
 * is heavier or slower.
 *
 * WHAT IS SENT is exactly the table's columns and nothing else: the event, the
 * path (pathname only, with its /hi or /gu prefix — never a query string), a
 * coarse viewport bucket, the HOST of an external referrer on the first page
 * of a visit, and a random per-tab id kept in sessionStorage. No cookie, no
 * user id, no user agent, no IP column — the schema has nowhere to put them.
 *
 * WHEN NOTHING IS SENT:
 *   - anywhere but newgrowndiamond.com / www.newgrowndiamond.com, or a host
 *     listed in VITE_ANALYTICS_HOSTS — so local dev, LAN previews and review
 *     tunnels never write a row;
 *   - on /admin (with or without a language prefix);
 *   - when Do Not Track or Global Privacy Control is on;
 *   - for automation and obvious crawlers (navigator.webdriver, bot UAs) — the
 *     UA is read to decide, never sent.
 *
 * Every failure is swallowed. Counting a visit is worth less than the visit.
 */

const PRODUCTION_HOSTS = ['newgrowndiamond.com', 'www.newgrowndiamond.com'];

/** Where rows may be written from. Exported so the console can say so. */
export const ANALYTICS_HOSTS = [
  ...new Set([
    ...PRODUCTION_HOSTS,
    ...String(import.meta.env.VITE_ANALYTICS_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  ]),
];

const EVENTS = new Set(['page_view', 'enquiry_started', 'enquiry_sent']);
const SESSION_KEY = 'ngd-visit';
const LANDED_KEY = 'ngd-visit-landed';
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender/i;
const ENDPOINT = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/analytics_events`;

let session = null;
let landed = false;

/** Pathname only, leading slash, no trailing slash, within the column's 200. */
function cleanPath(input) {
  let p = String(input ?? '').split(/[?#]/)[0].trim();
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return p.slice(0, 200);
}

function allowed(path) {
  if (typeof window === 'undefined' || typeof fetch !== 'function' || !isConfigured) return false;
  if (!ANALYTICS_HOSTS.includes(window.location.hostname.toLowerCase())) return false;
  const nav = window.navigator ?? {};
  if (nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.globalPrivacyControl === true) return false;
  if (nav.webdriver || BOT_UA.test(nav.userAgent ?? '')) return false;
  const route = splitLocale(path).path;
  return route !== '/admin' && !route.startsWith('/admin/');
}

function randomId() {
  const bytes = new Uint8Array(12);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A random id per tab. Held in memory too, so blocked storage still gives one id per page. */
function sessionId() {
  if (session) return session;
  let id = null;
  try { id = window.sessionStorage.getItem(SESSION_KEY); } catch { /* storage blocked */ }
  if (!id || id.length < 8 || id.length > 64) {
    id = randomId();
    try { window.sessionStorage.setItem(SESSION_KEY, id); } catch { /* memory only */ }
  }
  session = id;
  return id;
}

/** True once per tab: the page a visit landed on, the only one that carries a referrer. */
function claimLanding() {
  if (landed) return false;
  landed = true;
  try {
    if (window.sessionStorage.getItem(LANDED_KEY)) return false;
    window.sessionStorage.setItem(LANDED_KEY, '1');
  } catch { /* storage blocked: the first view of this document stands in */ }
  return true;
}

/** The referring site's host, only when it is another site. */
function referrerHost() {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.toLowerCase();
    const bare = (h) => h.replace(/^www\./, '');
    if (!host || bare(host) === bare(window.location.hostname.toLowerCase())) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

function viewport() {
  const w = window.innerWidth || document.documentElement?.clientWidth || 0;
  if (!w) return null;
  return w < 768 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
}

function send(row) {
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).catch(() => {});
  } catch { /* never surfaces */ }
}

/** After the page has settled, and never for a prerender nobody looked at. */
function whenIdle(fn) {
  const go = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => fn(), { timeout: 4000 });
    else window.setTimeout(fn, 1500);
  };
  if (document.prerendering) document.addEventListener('prerenderingchange', go, { once: true });
  else go();
}

function record(event, rawPath) {
  try {
    if (!EVENTS.has(event) || typeof window === 'undefined') return;
    const path = cleanPath(rawPath ?? window.location.pathname);
    if (!allowed(path)) return;
    /* Built now, so the row describes the moment it happened; sent later. */
    const row = {
      event,
      path,
      referrer_host: event === 'page_view' && claimLanding() ? referrerHost() : null,
      viewport: viewport(),
      session: sessionId(),
    };
    whenIdle(() => send(row));
  } catch { /* never surfaces */ }
}

/** One page view. `path` is the full pathname, language prefix included. */
export function trackPageView(path) {
  record('page_view', path);
}

/** 'enquiry_started' or 'enquiry_sent' (or 'page_view'); anything else is ignored. */
export function trackEvent(event, path) {
  record(event, path);
}
