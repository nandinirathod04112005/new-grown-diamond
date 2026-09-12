import { supabase } from '../client.js';
import { LOCALES, splitLocale } from '@/i18n/locales.js';

/**
 * Website analytics, read back from public.analytics_events.
 *
 * The rows are written by lib/analytics.js from the storefront (page views,
 * and the contact form's enquiry_started / enquiry_sent). Only an active admin
 * may SELECT them (policy analytics_admin_read, migration 0002).
 *
 * AGGREGATED HERE, NOT IN THE DATABASE. PostgREST has no GROUP BY and this
 * console adds no SQL functions, so the window is read row by row — narrow
 * columns, newest first, in pages — and counted in the browser. The read is
 * BOUNDED: at most ANALYTICS_CAP rows. When a window holds more than that, the
 * result says so (`capped`, and the oldest timestamp that made it in), and the
 * screens print it rather than presenting a partial count as a whole one.
 *
 * DAYS ARE LOCAL CALENDAR DAYS. A 30-day window is today and the 29 days
 * before it, midnight to midnight in the viewer's time zone — so "today" on
 * the chart is today in Surat, not in UTC.
 */

export const ANALYTICS_CAP = 20000;
const PAGE = 1000;
const BATCH = 4;

/**
 * "This table is not there" arrives in more than one shape; read it as a calm
 * state, not a fault. Same test as queries/adminInsights.js.
 */
export function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

const pad = (n) => String(n).padStart(2, '0');

/** "2026-09-11" for a Date, in local time. */
export const localDayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local midnight at the start of a window of `days` calendar days that ends today. */
export function windowStart(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** Every day of that window, oldest first. */
export function dayKeys(days) {
  const start = windowStart(days);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return localDayKey(d);
  });
}

/**
 * The window, newest first, up to the cap.
 *
 * The first page asks for an exact count, which is what makes `capped` a fact
 * rather than a guess. The page size follows what the server actually returned
 * — a project with max-rows below 1,000 would otherwise have every other page
 * silently skipped. Rows inserted while this runs push older ones down a page,
 * which can only duplicate a row across a boundary, never lose one; the ids
 * are de-duplicated at the end.
 */
async function readWindow({ since, columns, event }) {
  const page = (from, to, count) => {
    let q = supabase
      .from('analytics_events')
      .select(columns, count ? { count: 'exact' } : undefined)
      .gte('created_at', since.toISOString());
    if (event) q = q.eq('event', event);
    return q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
  };

  const first = await page(0, PAGE - 1, true);
  if (first.error) return { ok: false, error: first.error };

  const got = first.data ?? [];
  const total = first.count ?? got.length;
  const want = Math.min(total, ANALYTICS_CAP);
  const size = got.length > 0 && got.length < PAGE && total > got.length ? got.length : PAGE;
  const rows = [...got];

  const starts = [];
  for (let from = got.length; from < want; from += size) starts.push(from);
  for (let i = 0; i < starts.length; i += BATCH) {
    const results = await Promise.all(
      starts.slice(i, i + BATCH).map((from) => page(from, Math.min(from + size, want) - 1, false)),
    );
    for (const r of results) {
      if (r.error) return { ok: false, error: r.error };
      rows.push(...(r.data ?? []));
    }
  }

  const seen = new Set();
  const unique = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  return { ok: true, rows: unique, total, capped: total > ANALYTICS_CAP };
}

/** Whether a single row has ever been recorded — the difference between "none this week" and "not started". */
async function anyRecorded() {
  const { data, error } = await supabase.from('analytics_events').select('id').limit(1);
  if (error) return null;
  return (data ?? []).length > 0;
}

function failure(error, what) {
  const missing = isMissingTable(error);
  if (!missing) console.error(`[NGD Admin] ${what} unavailable:`, error);
  return {
    ok: false,
    missing,
    error: missing
      ? 'The analytics_events table is not in this database.'
      : error?.message || 'Visits could not be read.',
  };
}

const DEVICES = [['phone', 'Phone'], ['tablet', 'Tablet'], ['desktop', 'Desktop']];

/**
 * Everything the Website Analytics screen shows, for one window.
 *
 * Never throws for a database answer: a refusal comes back as `{ ok: false }`
 * with `missing` telling a table that is not there from one that refused.
 */
export async function loadAnalytics(days = 30) {
  if (!supabase) return { ok: false, missing: false, error: 'Not connected to the database.' };

  const read = await readWindow({
    since: windowStart(days),
    columns: 'id,event,path,referrer_host,viewport,session,created_at',
  });
  if (!read.ok) return failure(read.error, 'analytics');

  const rows = read.rows;
  const everRecorded = rows.length > 0 ? true : await anyRecorded();

  const keys = dayKeys(days);
  const perDay = new Map(keys.map((k) => [k, { views: 0, sessions: new Set() }]));
  const sessions = new Set();
  const routes = new Map();
  const languages = new Map(Object.keys(LOCALES).map((code) => [code, 0]));
  const devices = new Map(DEVICES.map(([k]) => [k, 0]));
  let unknownDevice = 0;
  const referrers = new Map();
  const started = new Set();
  const sent = new Set();
  let startedEvents = 0;
  let sentEvents = 0;
  let views = 0;

  for (const r of rows) {
    if (r.event === 'enquiry_started') { startedEvents += 1; started.add(r.session); continue; }
    if (r.event === 'enquiry_sent') { sentEvents += 1; sent.add(r.session); continue; }
    if (r.event !== 'page_view') continue;

    views += 1;
    sessions.add(r.session);
    const day = perDay.get(localDayKey(new Date(r.created_at)));
    if (day) { day.views += 1; day.sessions.add(r.session); }

    const { locale, path } = splitLocale(r.path || '/');
    languages.set(locale, (languages.get(locale) ?? 0) + 1);
    const route = routes.get(path) ?? { total: 0, by: new Map() };
    route.total += 1;
    route.by.set(locale, (route.by.get(locale) ?? 0) + 1);
    routes.set(path, route);

    if (devices.has(r.viewport)) devices.set(r.viewport, devices.get(r.viewport) + 1);
    else unknownDevice += 1;

    if (r.referrer_host) referrers.set(r.referrer_host, (referrers.get(r.referrer_host) ?? 0) + 1);
  }

  let converted = 0;
  for (const id of sent) if (started.has(id)) converted += 1;

  const localeLabel = (code) => LOCALES[code]?.label ?? code;

  return {
    ok: true,
    missing: false,
    error: null,
    days,
    everRecorded,
    events: rows.length,
    total: read.total,
    capped: read.capped,
    /* When capped, the oldest event that made it in: days before it are partial. */
    oldest: read.capped ? rows[rows.length - 1]?.created_at ?? null : null,
    views: {
      total: views,
      sessions: sessions.size,
      perDay: keys.map((date) => ({ date, views: perDay.get(date).views, sessions: perDay.get(date).sessions.size })),
    },
    pages: [...routes.entries()]
      .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
      .map(([path, r]) => ({
        key: path,
        label: path === '/' ? '/ (home)' : path,
        value: r.total,
        note: [...r.by.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([code, n]) => `${localeLabel(code)} ${n.toLocaleString()}`)
          .join(' · '),
      })),
    languages: [...languages.entries()].map(([code, value]) => ({ key: code, label: localeLabel(code), value })),
    devices: [
      ...DEVICES.map(([key, label]) => ({ key, label, value: devices.get(key) })),
      ...(unknownDevice ? [{ key: 'unknown', label: 'Not recorded', value: unknownDevice, slot: 0 }] : []),
    ],
    referrers: [...referrers.entries()].map(([host, value]) => ({ key: host, label: host, value })),
    funnel: {
      startedEvents,
      sentEvents,
      started: started.size,
      sent: sent.size,
      converted,
      rate: started.size ? converted / started.size : null,
    },
  };
}

/**
 * Page views per day for the Overview: the total, unique sessions and a
 * daily series, read the same bounded way. `total` is the server's exact
 * count; the series is drawn from the rows read, which `capped` qualifies.
 */
export async function pageViewSeries(days = 30) {
  if (!supabase) return { ok: false, missing: false, error: 'Not connected to the database.' };

  const read = await readWindow({ since: windowStart(days), columns: 'id,session,created_at', event: 'page_view' });
  if (!read.ok) return failure(read.error, 'page views');

  const rows = read.rows;
  const everRecorded = rows.length > 0 ? true : await anyRecorded();
  const counts = new Map(dayKeys(days).map((k) => [k, 0]));
  for (const r of rows) {
    const k = localDayKey(new Date(r.created_at));
    if (counts.has(k)) counts.set(k, counts.get(k) + 1);
  }

  return {
    ok: true,
    missing: false,
    error: null,
    days,
    everRecorded,
    total: read.total,
    sessions: new Set(rows.map((r) => r.session)).size,
    capped: read.capped,
    series: [...counts.entries()].map(([date, value]) => ({ date, value })),
  };
}
