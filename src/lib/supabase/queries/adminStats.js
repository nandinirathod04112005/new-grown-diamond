import { supabase } from '../client.js';
import { dayKeys, isMissingTable, localDayKey, windowStart } from './adminAnalytics.js';
import { parseFeedbackSubject } from './feedback.js';
import { ARTICLE_PREFIX } from './submissions.js';

/**
 * Everything the Overview shows, read from the database that actually holds it.
 *
 * THREE RULES SHAPE THIS FILE.
 *
 * First: a number is either real or absent. Every table is fetched
 * independently and each result carries its own `ok`, so a table an admin
 * cannot read comes back unavailable and the card says so. The alternative —
 * catching the error and rendering 0 — is the one failure mode a dashboard
 * must never have, because "no pending enquiries" and "we could not ask" look
 * identical on screen and lead to opposite actions.
 *
 * Second: vocabulary comes from the database, not from a guess. Status
 * breakdowns are read off the rows and counted as found. The open / handled
 * split per queue uses the values the live tables' CHECK constraints allow
 * (read from the project on 11 September 2026 — see STATES); anything outside
 * both lists is counted as `other` and shown, never folded silently into one
 * side.
 *
 * Third: reads are complete or say they are not. PostgREST answers an
 * unbounded select with at most max-rows (1,000 by default) and says nothing
 * about the rest, so every table is paged until its exact count is reached.
 *
 * COLUMNS ARE NARROW ON PURPOSE. PostgREST has no SUM, so a total carat weight
 * genuinely requires the carat of every stone — but it does not require the
 * internal notes, the certificate number or the price beside it. Each query
 * below names only what a tile actually consumes. `subject` is read from
 * enquiries only to sort them into kinds; it is never rendered here.
 */

/** Tables this dashboard reads, and the short column list each one needs. */
const SOURCES = {
  diamonds: 'id,carat,availability,active,archived_at,featured,shape,laboratory,growth_method,image_path,certificate_url,created_at',
  jewellery: 'id,created_at,active,archived_at,featured',
  profiles: 'id,created_at,account_status,role',
  favourites: 'id,user_id',
  enquiries: 'id,created_at,status,subject',
  quotes: 'id,created_at,status',
  holds: 'id,created_at,status,expires_at',
  inspections: 'id,created_at,status,scheduled_at',
  orders: 'id,created_at,status,currency,total_amount',
  order_items: 'id,order_id,quantity',
};

/*
 * Open and handled, per queue, exactly as the CHECK constraints on the live
 * tables define the allowed statuses:
 *
 *   enquiries    new · in_progress | responded · closed
 *   quotes       pending · reviewed | responded · closed
 *   holds        pending · active   | released · expired · rejected
 *   inspections  pending · scheduled | completed · cancelled · rejected
 */
const STATES = {
  enquiries: { open: ['new', 'in_progress'], done: ['responded', 'closed'] },
  quotes: { open: ['pending', 'reviewed'], done: ['responded', 'closed'] },
  holds: { open: ['pending', 'active'], done: ['released', 'expired', 'rejected'] },
  inspections: { open: ['pending', 'scheduled'], done: ['completed', 'cancelled', 'rejected'] },
};

/** The four values the diamond form offers, in the order they are shown. */
const AVAILABILITY = ['In Stock', 'On Request', 'Reserved', 'Sold'];
const GROWTH = ['CVD', 'HPHT'];

/*
 * What arrives in public.enquiries, told apart by subject the same way the
 * screens that own each kind do it: feedback by parseFeedbackSubject
 * (queries/feedback.js), submissions by their "Article submission · " prefix
 * (queries/submissions.js), and the fixed subject DeleteAccount.jsx sends.
 */
export const ENQUIRY_KINDS = [
  ['enquiry', 'Enquiry'],
  ['feedback', 'Feedback'],
  ['article', 'Article submission'],
  ['deletion', 'Account deletion request'],
];

function enquiryKind(subject) {
  const s = String(subject ?? '').trim();
  if (parseFeedbackSubject(s)) return 'feedback';
  if (s.startsWith(`${ARTICLE_PREFIX} · `)) return 'article';
  if (/^account deletion request/i.test(s)) return 'deletion';
  return 'enquiry';
}

const PAGE = 1000;
const ROW_CAP = 50000;

/**
 * One table, complete, and never a thrown error.
 *
 * A rejected promise here would take the whole dashboard down over a single
 * unreadable table, so the failure is returned as a value and rendered as a
 * state. The message is kept for the retry UI; it is a PostgREST message, not
 * a credential, so it is safe to show an admin. Ordered by id so the pages are
 * stable; the first page carries the exact count the loop reads up to.
 */
async function pull(table, columns) {
  if (!supabase) return { ok: false, rows: [], error: 'Not connected to the database.' };
  const rows = [];
  let total = null;
  try {
    while (rows.length < ROW_CAP) {
      const from = rows.length;
      const { data, error, count } = await supabase
        .from(table)
        .select(columns, from === 0 ? { count: 'exact' } : undefined)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        const missing = isMissingTable(error);
        if (!missing) console.error(`[NGD Admin] ${table} unavailable:`, error);
        return {
          ok: false,
          rows: [],
          missing,
          error: missing ? `The ${table} table is not in this database.` : error.message || 'Could not be read.',
        };
      }
      if (from === 0) total = count ?? null;
      const got = data ?? [];
      rows.push(...got);
      if (!got.length || (total != null ? rows.length >= total : got.length < PAGE)) break;
    }
  } catch (err) {
    console.error(`[NGD Admin] ${table} unavailable:`, err);
    return { ok: false, rows: [], error: err?.message || 'Could not be read.' };
  }
  return { ok: true, rows, error: null, capped: total != null && total > rows.length };
}

const at = (row) => (row.created_at ? new Date(row.created_at) : null);

/** Rows created inside a window. Rows with no timestamp are counted in none. */
function inWindow(rows, from, to) {
  return rows.filter((r) => {
    const t = at(r);
    return t && t >= from && (!to || t < to);
  });
}

/**
 * Counts by whatever the column actually contains.
 *
 * Returns a Map so ordering follows the data rather than an assumed list, and
 * so a value nobody expected still appears instead of being dropped into an
 * "other" bucket that hides it.
 */
function tally(rows, key) {
  const out = new Map();
  for (const r of rows) {
    const v = String(r[key] ?? '').trim() || 'Unspecified';
    out.set(v, (out.get(v) ?? 0) + 1);
  }
  return out;
}

/**
 * A day-by-day series across the window: local calendar days, today last.
 *
 * Buckets are pre-created for every day so a quiet Tuesday is a zero in the
 * line rather than a missing point the chart would smooth straight over.
 * Local days, like the window the counts use, so the chart and the figure
 * beside it always add up to the same number.
 */
function daily(rows, days) {
  const buckets = new Map(dayKeys(days).map((k) => [k, 0]));
  for (const r of rows) {
    const t = at(r);
    if (!t) continue;
    const k = localDayKey(t);
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + 1);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

/** A metric plus how it moved, or an explicit "we could not read this". */
function metric(source, { now, prev, extra } = {}) {
  if (!source.ok) return { ok: false, error: source.error };
  return { ok: true, value: now, previous: prev, ...extra };
}

/** A split for a chart, or the reason there is none. */
function split(source, items) {
  return source.ok ? { ok: true, items } : { ok: false, error: source.error };
}

/**
 * Known values first, in their own order and colour slot, zeros included; then
 * anything else the column holds, so an unexpected value is shown, not lost.
 */
function fixedSplit(rows, key, known) {
  const counts = tally(rows, key);
  const items = known.map((v, i) => ({ key: v, label: v, value: counts.get(v) ?? 0, slot: i + 1 }));
  let slot = known.length;
  for (const [v, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    if (known.includes(v)) continue;
    if (v !== 'Unspecified') slot += 1;
    items.push({ key: v, label: v, value: n, slot: v === 'Unspecified' ? 0 : slot });
  }
  return items;
}

/** Most first; for ranked lists. */
const ranked = (rows, key) => [...tally(rows, key).entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([label, value]) => ({ key: label, label, value }));

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** This month and the five before it, oldest first. */
function lastMonths(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: monthKey(d),
      start: d,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      title: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  });
}

/** Totals per currency. Currencies are never converted or added together. */
function revenueByCurrency(orders) {
  const out = new Map();
  for (const o of orders) {
    const currency = o.currency || '—';
    const row = out.get(currency) ?? { currency, value: 0, orders: 0 };
    row.value += Number(o.total_amount) || 0;
    row.orders += 1;
    out.set(currency, row);
  }
  return [...out.values()].sort((a, b) => b.orders - a.orders || b.value - a.value);
}

/**
 * The whole dashboard in one call.
 *
 * Fired in parallel: independent tables have no reason to wait on each other,
 * and the slowest one sets the dashboard's speed rather than the sum.
 *
 * Windows are calendar days ending today — `days` of them — and the previous
 * period is the `days` before that, so "vs previous 30d" compares like with
 * like and every in-range figure matches the daily chart beside it.
 */
export async function overviewStats(days = 30) {
  const names = Object.keys(SOURCES);
  const results = await Promise.all(names.map((t) => pull(t, SOURCES[t])));
  const src = Object.fromEntries(names.map((n, i) => [n, results[i]]));

  const from = windowStart(days);
  const prevFrom = windowStart(days * 2);

  /* ---- diamonds ---- */
  const stones = src.diamonds.rows;
  /* "Active" is what the storefront shows: active and not archived — the
     same two filters listDiamonds() applies. Everything else is inactive. */
  const live = stones.filter((d) => d.active && !d.archived_at);
  const hidden = stones.filter((d) => !d.active && !d.archived_at);
  const archivedStones = stones.filter((d) => d.archived_at);
  /* Current stock for the breakdowns: live and hidden, archived excluded. */
  const stock = stones.filter((d) => !d.archived_at);

  const diamonds = {
    /*
     * A LEVEL, so it carries no period comparison.
     *
     * This first read a previous value of "live stones created in the window
     * before this one", and rendered 3 live stones as "+200% vs previous 30d".
     * That is a stock level being divided by an intake count — two different
     * quantities — and the percentage it produced was not wrong so much as
     * meaningless. Movement in stock is reported by `added` below, which
     * compares like with like.
     */
    total: metric(src.diamonds, { now: live.length }),
    all: metric(src.diamonds, { now: stones.length }),
    active: metric(src.diamonds, { now: live.length }),
    inactive: metric(src.diamonds, {
      now: hidden.length + archivedStones.length,
      extra: { hidden: hidden.length, archived: archivedStones.length },
    }),
    featured: metric(src.diamonds, { now: live.filter((d) => d.featured).length }),
    added: metric(src.diamonds, {
      now: inWindow(stones, from).length,
      prev: inWindow(stones, prevFrom, from).length,
      extra: { series: daily(stones, days) },
    }),
    /* Real field, so a real total. Rounded at the edge, not here. */
    carat: metric(src.diamonds, {
      now: live.reduce((sum, d) => sum + (Number(d.carat) || 0), 0),
    }),
    availability: split(src.diamonds, fixedSplit(stock, 'availability', AVAILABILITY)),
    byShape: split(src.diamonds, ranked(stock, 'shape')),
    byLab: split(src.diamonds, ranked(stock, 'laboratory')),
    byGrowth: split(src.diamonds, fixedSplit(stock, 'growth_method', GROWTH)),
    stock: metric(src.diamonds, { now: stock.length }),
    unpublished: metric(src.diamonds, { now: hidden.length }),
    archived: metric(src.diamonds, { now: archivedStones.length }),
    /* Alerts: real gaps in real rows, not a health score out of ten. */
    noImage: metric(src.diamonds, { now: live.filter((d) => !d.image_path).length }),
    noCertificate: metric(src.diamonds, { now: live.filter((d) => !d.certificate_url).length }),
  };

  /* ---- jewellery ---- */
  const jewels = src.jewellery.rows;
  const liveJewels = jewels.filter((j) => j.active && !j.archived_at);
  const jewellery = {
    total: metric(src.jewellery, { now: liveJewels.length }),
    all: metric(src.jewellery, { now: jewels.length }),
    live: metric(src.jewellery, { now: liveJewels.length }),
    /* Featured AND live: a featured flag on a hidden piece shows nowhere. */
    featured: metric(src.jewellery, { now: liveJewels.filter((j) => j.featured).length }),
    added: metric(src.jewellery, {
      now: inWindow(jewels, from).length,
      prev: inWindow(jewels, prevFrom, from).length,
    }),
    unpublished: metric(src.jewellery, {
      now: jewels.filter((j) => !j.active && !j.archived_at).length,
    }),
    archived: metric(src.jewellery, { now: jewels.filter((j) => j.archived_at).length }),
  };

  /* ---- people ---- */
  const people = src.profiles.rows;
  /* Customers are accounts that are not staff; role is 'admin' or 'customer'. */
  const clients = people.filter((p) => p.role !== 'admin');
  const favs = src.favourites.rows;
  const customers = {
    total: metric(src.profiles, { now: clients.length }),
    added: metric(src.profiles, {
      now: inWindow(clients, from).length,
      prev: inWindow(clients, prevFrom, from).length,
      extra: { series: daily(clients, days) },
    }),
    byStatus: src.profiles.ok
      ? { ok: true, buckets: [...tally(clients, 'account_status')] }
      : { ok: false, error: src.profiles.error },
    admins: metric(src.profiles, { now: people.filter((p) => p.role === 'admin').length }),
    favourites: metric(src.favourites, { now: favs.length }),
    withFavourites: metric(src.favourites, { now: new Set(favs.map((f) => f.user_id).filter(Boolean)).size }),
  };

  /* ---- the work queues ---- */
  const queue = (name) => {
    const s = src[name];
    const rows = s.rows;
    const { open, done } = STATES[name];
    const isOpen = (r) => open.includes(r.status);
    const isDone = (r) => done.includes(r.status);
    return {
      total: metric(s, { now: rows.length }),
      recent: metric(s, {
        now: inWindow(rows, from).length,
        prev: inWindow(rows, prevFrom, from).length,
        extra: { series: daily(rows, days) },
      }),
      open: metric(s, { now: rows.filter(isOpen).length, extra: { states: open } }),
      handled: metric(s, { now: rows.filter(isDone).length, extra: { states: done } }),
      other: metric(s, { now: rows.filter((r) => !isOpen(r) && !isDone(r)).length }),
      byStatus: s.ok ? { ok: true, buckets: [...tally(rows, 'status')] } : { ok: false, error: s.error },
    };
  };

  const inRangeEnquiries = inWindow(src.enquiries.rows, from);
  const kindCounts = new Map(ENQUIRY_KINDS.map(([k]) => [k, 0]));
  for (const e of inRangeEnquiries) {
    const k = enquiryKind(e.subject);
    kindCounts.set(k, kindCounts.get(k) + 1);
  }

  /* ---- orders & sales ---- */
  const orders = src.orders.rows;
  const valid = orders.filter((o) => o.status !== 'cancelled');
  const months = lastMonths(6);
  const recentOrders = valid.filter((o) => at(o) && at(o) >= months[0].start);
  const perMonth = new Map(months.map((m) => [m.key, 0]));
  for (const o of recentOrders) {
    const k = monthKey(at(o));
    if (perMonth.has(k)) perMonth.set(k, perMonth.get(k) + 1);
  }
  const recentIds = new Set(recentOrders.map((o) => o.id));
  const itemsSold = src.order_items.rows
    .filter((i) => recentIds.has(i.order_id))
    .reduce((t, i) => t + (Number(i.quantity) || 1), 0);

  const sales = {
    ok: src.orders.ok,
    missing: Boolean(src.orders.missing),
    error: src.orders.error,
    count: metric(src.orders, { now: valid.length }),
    cancelled: metric(src.orders, { now: orders.length - valid.length }),
    inRange: metric(src.orders, {
      now: inWindow(valid, from).length,
      prev: inWindow(valid, prevFrom, from).length,
    }),
    recent: metric(src.orders, { now: recentOrders.length }),
    monthly: months.map((m) => ({ key: m.key, label: m.label, title: m.title, value: perMonth.get(m.key) })),
    revenue: revenueByCurrency(recentOrders),
    revenueAll: revenueByCurrency(valid),
    items: src.orders.ok && src.order_items.ok
      ? { ok: true, value: itemsSold }
      : { ok: false, error: src.order_items.error ?? src.orders.error },
  };

  return {
    days,
    generatedAt: new Date().toISOString(),
    /* Which tables answered. The monitoring panel reports this verbatim. */
    sources: Object.fromEntries(names.map((n) => [n, { ok: src[n].ok, error: src[n].error }])),
    /* Tables that hit the row cap: their counts are partial and say so. */
    capped: names.filter((n) => src[n].capped),
    diamonds,
    jewellery,
    customers,
    enquiries: {
      ...queue('enquiries'),
      byDay: src.enquiries.ok
        ? { ok: true, series: daily(src.enquiries.rows, days) }
        : { ok: false, error: src.enquiries.error },
      byKind: split(
        src.enquiries,
        ENQUIRY_KINDS.map(([key, label], i) => ({ key, label, value: kindCounts.get(key), slot: i + 1 })),
      ),
    },
    quotes: queue('quotes'),
    holds: {
      ...queue('holds'),
      /* An expiry that has passed is an operational fact, not a status. */
      expired: metric(src.holds, {
        now: src.holds.rows.filter((h) => h.expires_at && new Date(h.expires_at) < new Date()).length,
      }),
    },
    inspections: {
      ...queue('inspections'),
      upcoming: metric(src.inspections, {
        now: src.inspections.rows.filter(
          (i) => i.scheduled_at && new Date(i.scheduled_at) >= new Date(),
        ).length,
      }),
    },
    orders: sales,
  };
}

/**
 * The most recently added stock, for the activity panel.
 *
 * A genuine "recently added" list rather than an activity LOG — the audit
 * trail lives on its own screen, and presenting inserts as though they were a
 * record of who did what would be exactly the invention this dashboard is
 * meant to avoid. It is labelled for what it is.
 */
export async function recentInventory(limit = 8) {
  if (!supabase) return { ok: false, rows: [], error: 'Not connected to the database.' };
  const { data, error } = await supabase
    .from('diamonds')
    .select('id,public_id,stock_number,shape,carat,availability,active,archived_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[NGD Admin] recent inventory unavailable:', error);
    return { ok: false, rows: [], error: error.message };
  }
  return { ok: true, rows: data ?? [], error: null };
}
