import { supabase } from '../client.js';

/**
 * Enquiries, quotes, holds, inspections — and the people behind them.
 *
 * WHAT THESE TABLES ACTUALLY CARRY, verified column by column against the live
 * database before a line of this was written:
 *
 *   enquiries   id public_id status user_id created_at updated_at
 *               full_name company_name email mobile country subject message
 *               product_type diamond_id jewellery_id
 *   quotes      id public_id status user_id created_at updated_at
 *               diamond_id jewellery_id currency
 *   holds       … same, plus expires_at
 *   inspections … same, plus scheduled_at
 *
 * WHAT THEY DO NOT CARRY, all probed and all absent: assigned_to, priority,
 * internal_notes, notes, handled_by, responded_at, closed_at, source. So there
 * is no assignee, no priority and no internal note anywhere in this console,
 * and no status history — only `status` and `updated_at`. The brief asked for
 * those "where supported"; they are not, and the screens say so rather than
 * showing an empty field that implies the data is merely missing.
 *
 * RELATED ROWS ARE FETCHED BY ID, NOT EMBEDDED. PostgREST can join through a
 * foreign key with `select=*,profiles(...)`, but that depends on the constraint
 * being named the way the client guesses. One extra `in()` query per related
 * table is two round trips instead of one and cannot break on a naming
 * mismatch — and it degrades honestly: if profiles is unreadable, the rows
 * still render and the customer column says so.
 */

/** Queue shapes. `dateKey` is the column each queue is actually scheduled on. */
export const QUEUES = {
  enquiries: {
    label: 'Enquiries',
    columns: 'id,public_id,status,user_id,created_at,updated_at,full_name,company_name,email,mobile,country,subject,message,product_type,diamond_id,jewellery_id',
    dateKey: null,
    /* Enquiries carry their own contact details, so they are the one queue
       that can be answered without looking up an account. */
    selfContained: true,
  },
  quotes: {
    label: 'Quotes',
    columns: 'id,public_id,status,user_id,created_at,updated_at,diamond_id,jewellery_id,currency',
    dateKey: null,
  },
  holds: {
    label: 'Holds',
    columns: 'id,public_id,status,user_id,created_at,updated_at,diamond_id,jewellery_id,expires_at',
    dateKey: 'expires_at',
    /* A hold whose expiry has passed is the operational signal on this queue. */
    overdue: (r) => r.expires_at && new Date(r.expires_at) < new Date(),
    overdueLabel: 'Expired',
  },
  inspections: {
    label: 'Inspections',
    columns: 'id,public_id,status,user_id,created_at,updated_at,diamond_id,jewellery_id,scheduled_at',
    dateKey: 'scheduled_at',
    overdue: (r) => r.scheduled_at && new Date(r.scheduled_at) < new Date(),
    overdueLabel: 'Past due',
  },
};

const uniq = (list) => [...new Set(list.filter(Boolean))];

/** One lookup table, or an empty map plus the reason it is empty. */
async function lookup(table, ids, columns) {
  if (!ids.length || !supabase) return { map: new Map(), error: null };
  const { data, error } = await supabase.from(table).select(columns).in('id', ids);
  if (error) {
    console.error(`[NGD Admin] ${table} lookup failed:`, error);
    return { map: new Map(), error: error.message };
  }
  return { map: new Map((data ?? []).map((r) => [r.id, r])), error: null };
}

/**
 * A queue, with its people and products attached.
 *
 * Returns `{ ok, rows, error, related }`. `related` records whether each
 * lookup succeeded, so a screen can say "customer unavailable" on the column
 * rather than silently printing a dash that reads as "no customer".
 */
export async function loadQueue(name) {
  const spec = QUEUES[name];
  if (!spec) throw new Error(`Unknown queue: ${name}`);
  if (!supabase) return { ok: false, rows: [], error: 'Not connected to the database.', related: {} };

  const { data, error } = await supabase
    .from(name)
    .select(spec.columns)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[NGD Admin] ${name} unavailable:`, error);
    return { ok: false, rows: [], error: error.message, related: {} };
  }

  const rows = data ?? [];
  const [people, stones, pieces] = await Promise.all([
    lookup('profiles', uniq(rows.map((r) => r.user_id)), 'id,full_name,company_name,email,phone,country,account_status'),
    lookup('diamonds', uniq(rows.map((r) => r.diamond_id)), 'id,public_id,stock_number,shape,carat,availability'),
    lookup('jewellery', uniq(rows.map((r) => r.jewellery_id)), 'id,public_id,sku,product_name,category'),
  ]);

  return {
    ok: true,
    error: null,
    related: { profiles: people.error, diamonds: stones.error, jewellery: pieces.error },
    rows: rows.map((r) => ({
      ...r,
      customer: people.map.get(r.user_id) ?? null,
      diamond: stones.map.get(r.diamond_id) ?? null,
      piece: pieces.map.get(r.jewellery_id) ?? null,
    })),
  };
}

/**
 * Move a row's status.
 *
 * The value comes from the set already present in the data, never from a
 * hardcoded list — this console does not get to invent a workflow the database
 * has not got. `updated_at` is set alongside because these tables have the
 * column and nothing else maintains it from the client.
 */
export async function setQueueStatus(name, id, status) {
  if (!QUEUES[name]) throw new Error(`Unknown queue: ${name}`);
  const { error } = await supabase
    .from(name)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Customers, with counts of what each one has done.
 *
 * Only columns an administrator has a working reason to see. No password
 * material exists on this table to expose, and auth tokens live in Supabase's
 * own schema which this key cannot reach at all — but the narrow select is
 * stated here anyway, because "we only asked for these" is a stronger
 * guarantee than "we only rendered these".
 */
export async function loadCustomers() {
  if (!supabase) return { ok: false, rows: [], error: 'Not connected to the database.' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,company_name,email,phone,country,role,account_status,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[NGD Admin] customers unavailable:', error);
    return { ok: false, rows: [], error: error.message };
  }

  /*
   * Activity counts come from one narrow read of each related table rather
   * than a count query per customer — five queries in total instead of five
   * per row. Only the foreign key is selected, because that is all a tally
   * needs.
   */
  const tallies = await Promise.all(
    ['favourites', 'enquiries', 'quotes', 'holds', 'inspections'].map(async (t) => {
      const { data: rows, error: err } = await supabase.from(t).select('user_id');
      if (err) {
        console.error(`[NGD Admin] ${t} tally failed:`, err);
        return [t, null];
      }
      const counts = new Map();
      (rows ?? []).forEach((r) => r.user_id && counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1));
      return [t, counts];
    }),
  );
  const by = Object.fromEntries(tallies);

  return {
    ok: true,
    error: null,
    /* null, not 0, where a tally could not be read — the customer screen shows
       a dash for that rather than claiming the customer has none. */
    unavailable: Object.entries(by).filter(([, v]) => v === null).map(([k]) => k),
    rows: (data ?? []).map((p) => ({
      ...p,
      favourites: by.favourites?.get(p.id) ?? (by.favourites ? 0 : null),
      enquiries: by.enquiries?.get(p.id) ?? (by.enquiries ? 0 : null),
      quotes: by.quotes?.get(p.id) ?? (by.quotes ? 0 : null),
      holds: by.holds?.get(p.id) ?? (by.holds ? 0 : null),
      inspections: by.inspections?.get(p.id) ?? (by.inspections ? 0 : null),
    })),
  };
}
