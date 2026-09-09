import { supabase } from '../client.js';

/**
 * Everything the Overview shows, read from the database that actually holds it.
 *
 * TWO RULES SHAPE THIS FILE.
 *
 * First: a number is either real or absent. Every table is fetched
 * independently and each result carries its own `ok`, so a table an admin
 * cannot read comes back unavailable and the card says so. The alternative —
 * catching the error and rendering 0 — is the one failure mode a dashboard
 * must never have, because "no pending enquiries" and "we could not ask" look
 * identical on screen and lead to opposite actions.
 *
 * Second: nothing is assumed about vocabulary. Status values are not hardcoded
 * anywhere here; they are read off the rows and counted as found. If this
 * project calls a hold 'reserved' and another calls it 'on_hold', both work,
 * and neither invents a bucket that turns out to be empty because the guess
 * was wrong.
 *
 * COLUMNS ARE NARROW ON PURPOSE. PostgREST has no SUM, so a total carat weight
 * genuinely requires the carat of every stone — but it does not require the
 * internal notes, the certificate number or the price beside it. Each query
 * below names only what a tile actually consumes.
 */

/** Tables this dashboard reads, and the short column list each one needs. */
const SOURCES = {
  diamonds: 'carat,availability,active,archived_at,image_path,certificate_url,created_at',
  jewellery: 'created_at,active,archived_at,featured',
  profiles: 'created_at,account_status,role',
  enquiries: 'created_at,status',
  quotes: 'created_at,status',
  holds: 'created_at,status,expires_at',
  inspections: 'created_at,status,scheduled_at',
};

/**
 * One table, and never a thrown error.
 *
 * A rejected promise here would take the whole dashboard down over a single
 * unreadable table, so the failure is returned as a value and rendered as a
 * state. The message is kept for the retry UI; it is a PostgREST message, not
 * a credential, so it is safe to show an admin.
 */
async function pull(table, columns) {
  if (!supabase) return { ok: false, rows: [], error: 'Not connected to the database.' };
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    console.error(`[NGD Admin] ${table} unavailable:`, error);
    return { ok: false, rows: [], error: error.message || 'Could not be read.' };
  }
  return { ok: true, rows: data ?? [], error: null };
}

const since = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

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
    const v = r[key] ?? 'Unspecified';
    out.set(v, (out.get(v) ?? 0) + 1);
  }
  return out;
}

/**
 * A day-by-day series across the window, for the sparklines.
 *
 * Buckets are pre-created for every day so a quiet Tuesday is a zero in the
 * line rather than a missing point the chart would smooth straight over.
 */
function daily(rows, days) {
  const start = since(days);
  start.setHours(0, 0, 0, 0);
  const buckets = new Map();
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const t = at(r);
    if (!t) continue;
    const k = t.toISOString().slice(0, 10);
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + 1);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

/** A metric plus how it moved, or an explicit "we could not read this". */
function metric(source, { now, prev, extra } = {}) {
  if (!source.ok) return { ok: false, error: source.error };
  return { ok: true, value: now, previous: prev, ...extra };
}

/**
 * The whole dashboard in one call.
 *
 * Fired in parallel: seven independent tables have no reason to wait on each
 * other, and the slowest one sets the dashboard's speed rather than the sum.
 */
export async function overviewStats(days = 30) {
  const names = Object.keys(SOURCES);
  const results = await Promise.all(names.map((t) => pull(t, SOURCES[t])));
  const src = Object.fromEntries(names.map((n, i) => [n, results[i]]));

  const from = since(days);
  const prevFrom = since(days * 2);

  /* ---- diamonds: the one table whose columns are fully known ---- */
  const stones = src.diamonds.rows;
  const live = stones.filter((d) => d.active && !d.archived_at);
  const notArchived = stones.filter((d) => !d.archived_at);

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
    added: metric(src.diamonds, {
      now: inWindow(stones, from).length,
      prev: inWindow(stones, prevFrom, from).length,
      extra: { series: daily(stones, days) },
    }),
    /* Real field, so a real total. Rounded at the edge, not here. */
    carat: metric(src.diamonds, {
      now: live.reduce((sum, d) => sum + (Number(d.carat) || 0), 0),
    }),
    availability: src.diamonds.ok
      ? { ok: true, buckets: [...tally(notArchived, 'availability')] }
      : { ok: false, error: src.diamonds.error },
    unpublished: metric(src.diamonds, {
      now: stones.filter((d) => !d.active && !d.archived_at).length,
    }),
    archived: metric(src.diamonds, { now: stones.filter((d) => d.archived_at).length }),
    /* Alerts: real gaps in real rows, not a health score out of ten. */
    noImage: metric(src.diamonds, { now: live.filter((d) => !d.image_path).length }),
    noCertificate: metric(src.diamonds, { now: live.filter((d) => !d.certificate_url).length }),
  };

  /* ---- jewellery: table confirmed, columns confirmed, no code yet ---- */
  const jewels = src.jewellery.rows;
  const jewellery = {
    total: metric(src.jewellery, { now: jewels.filter((j) => j.active && !j.archived_at).length }),
    added: metric(src.jewellery, {
      now: inWindow(jewels, from).length,
      prev: inWindow(jewels, prevFrom, from).length,
    }),
    unpublished: metric(src.jewellery, {
      now: jewels.filter((j) => !j.active && !j.archived_at).length,
    }),
    featured: metric(src.jewellery, { now: jewels.filter((j) => j.featured).length }),
  };

  /* ---- people and the work queues ---- */
  const people = src.profiles.rows;
  const customers = {
    total: metric(src.profiles, { now: people.length }),
    added: metric(src.profiles, {
      now: inWindow(people, from).length,
      prev: inWindow(people, prevFrom, from).length,
      extra: { series: daily(people, days) },
    }),
    byStatus: src.profiles.ok
      ? { ok: true, buckets: [...tally(people, 'account_status')] }
      : { ok: false, error: src.profiles.error },
    admins: metric(src.profiles, { now: people.filter((p) => p.role === 'admin').length }),
  };

  const queue = (name) => {
    const s = src[name];
    const rows = s.rows;
    return {
      total: metric(s, { now: rows.length }),
      recent: metric(s, {
        now: inWindow(rows, from).length,
        prev: inWindow(rows, prevFrom, from).length,
        extra: { series: daily(rows, days) },
      }),
      byStatus: s.ok ? { ok: true, buckets: [...tally(rows, 'status')] } : { ok: false, error: s.error },
    };
  };

  return {
    days,
    generatedAt: new Date().toISOString(),
    /* Which tables answered. The monitoring panel reports this verbatim. */
    sources: Object.fromEntries(names.map((n) => [n, { ok: src[n].ok, error: src[n].error }])),
    diamonds,
    jewellery,
    customers,
    enquiries: queue('enquiries'),
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
  };
}

/**
 * The most recently added stock, for the activity panel.
 *
 * A genuine "recently added" list rather than an activity LOG — there is no
 * audit table in this database yet, and presenting inserts as though they were
 * a record of who did what would be exactly the invention this dashboard is
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
