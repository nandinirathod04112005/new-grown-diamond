import { supabase } from '../client.js';

const SOURCES = [
  { key: 'favourites', label: 'Favourites', columns: 'id,product_type,created_at' },
  { key: 'quotes', label: 'Quotes', columns: 'public_id,product_type,status,created_at' },
  { key: 'holds', label: 'Holds', columns: 'public_id,product_type,status,created_at' },
  { key: 'inspections', label: 'Inspections', columns: 'public_id,product_type,status,created_at' },
  { key: 'enquiries', label: 'Enquiries', columns: 'public_id,subject,status,created_at' },
];

/** Loads each RLS-scoped account widget independently. */
export async function loadCustomerActivity(userId) {
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
          .limit(3),
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
