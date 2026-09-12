import { supabase } from '../client.js';

/**
 * Everything the customer dashboard reads about the signed-in customer.
 *
 * Every table here is scoped by row-level security to the caller's own rows,
 * and every query ALSO filters on user_id — defence in depth, and the intent
 * stays readable at the call site instead of living only in a policy.
 *
 * Each source loads and fails on its own. A dashboard that goes blank because
 * one table was unreachable is worse than one that shows four panels and says
 * the fifth could not be read.
 */

/*
 * The customer's requests to the desk, newest first. Quotes carry the price
 * the desk quoted and holds carry when the reservation lapses, so both are
 * read here rather than looked up again per row.
 */
const SOURCES = [
  { key: 'enquiries', label: 'Enquiries', columns: 'id,public_id,subject,status,created_at' },
  { key: 'quotes', label: 'Quotes', columns: 'id,public_id,product_type,diamond_id,status,quoted_price,currency,created_at' },
  { key: 'holds', label: 'Holds', columns: 'id,public_id,product_type,diamond_id,status,expires_at,created_at' },
  { key: 'inspections', label: 'Inspections', columns: 'id,public_id,product_type,diamond_id,status,created_at' },
  { key: 'favourites', label: 'Favourites', columns: 'id,product_type,diamond_id,created_at' },
];

/** Loads each RLS-scoped account source independently: an exact count plus the latest rows. */
export async function loadCustomerActivity(userId, { limit = 5 } = {}) {
  if (!supabase || !userId) return [];

  return Promise.all(SOURCES.map(async (source) => {
    try {
      const [countResult, rowsResult] = await Promise.all([
        supabase
          .from(source.key)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from(source.key)
          .select(source.columns)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      if (countResult.error) throw countResult.error;
      if (rowsResult.error) throw rowsResult.error;
      return {
        ...source,
        count: countResult.count ?? 0,
        rows: rowsResult.data ?? [],
        error: false,
      };
    } catch (error) {
      console.error(`[NGD account: ${source.key}]`, error);
      return { ...source, count: null, rows: [], error: true };
    }
  }));
}

/*
 * Error codes that mean "there is no purchase record to read", as opposed to
 * "something broke": the table does not exist yet (PGRST205 / 42P01), the
 * relationship to its items does not exist (PGRST200), or the caller may not
 * read it (42501). The dashboard says purchases are not recorded online in
 * all four cases, and never shows a zero it cannot vouch for.
 */
const NO_ORDER_RECORD = new Set(['PGRST205', '42P01', 'PGRST200', '42501']);

/**
 * The customer's orders, with their line items.
 *
 * There is no orders table on the project today — the proposal is
 * supabase/migrations/0005_customer_orders.sql, not applied. Until it is, this
 * returns { status: 'unavailable' } and the dashboard says so. Once it exists,
 * the same code shows real orders with no change here.
 */
export async function loadOrders(userId) {
  if (!supabase || !userId) return { status: 'unavailable', orders: [] };

  const { data, error } = await supabase
    .from('orders')
    .select('public_id,status,currency,total_amount,created_at,order_items(description,carat,unit_price,quantity,diamond_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (NO_ORDER_RECORD.has(error.code)) return { status: 'unavailable', orders: [] };
    console.error('[NGD account: orders]', error);
    return { status: 'error', orders: [] };
  }
  return { status: 'ready', orders: data ?? [] };
}

/**
 * Stock number, shape and weight for a set of diamond ids, so a quote reads
 * "HJH-777 · 0.23 ct Round" instead of an internal reference. A stone that has
 * since left the inventory is simply absent from the map; callers fall back
 * to the request's own reference.
 */
export async function resolveStones(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!supabase || unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from('diamonds')
    .select('id,stock_number,shape,carat')
    .in('id', unique);

  if (error) {
    console.error('[NGD account: stones]', error);
    return new Map();
  }
  return new Map((data ?? []).map((stone) => [stone.id, stone]));
}
