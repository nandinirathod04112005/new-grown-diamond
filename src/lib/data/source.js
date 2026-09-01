/**
 * The single seam between the UI and its data.
 *
 * Phase 1 ships mock rows. When the live queries land, only the branches below
 * change — every component keeps calling `fetchFeaturedDiamonds()` and stays
 * untouched, because the mocks already have the database's exact row shape.
 *
 * The Supabase branch is written out here rather than left as a comment so the
 * required filters are recorded where they will be needed: RLS exposes only
 * `active = true AND archived_at IS NULL`, and columns are always named
 * explicitly so `internal_notes` / `created_by` are never fetched.
 */
import { MOCK_DIAMONDS } from './mock/diamonds.js';
import { MOCK_JEWELLERY } from './mock/jewellery.js';
import { resolveSupabaseEnv } from '@/lib/supabase/env.js';

/** Flip to true once the storefront queries are implemented (Phase 3). */
// Visual/E2E runs can explicitly choose deterministic records without
// weakening production's live-data default.
export const USE_SUPABASE = resolveSupabaseEnv().ok && import.meta.env.VITE_USE_MOCK_DATA !== 'true';

export const DIAMOND_LIST_COLUMNS =
  'public_id,stock_number,shape,carat,color,clarity,cut,laboratory,' +
  'growth_method,availability,image_path,featured,created_at';

export const JEWELLERY_LIST_COLUMNS =
  'id,public_id,sku,product_name,category,subcategory,short_description,' +
  'diamond_weight,availability,featured,created_at';

/** Featured stones for the homepage rail. */
export async function fetchFeaturedDiamonds(limit = 6) {
  if (!USE_SUPABASE) {
    return MOCK_DIAMONDS.filter((d) => d.featured).slice(0, limit);
  }
  const { getSupabase } = await import('@/lib/supabase/client.js');
  const { data, error } = await getSupabase()
    .from('diamonds')
    .select(DIAMOND_LIST_COLUMNS)
    .eq('active', true)
    .is('archived_at', null)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Featured jewellery for the homepage preview. */
export async function fetchFeaturedJewellery(limit = 3) {
  if (!USE_SUPABASE) {
    return MOCK_JEWELLERY.filter((j) => j.featured).slice(0, limit);
  }
  const { getSupabase } = await import('@/lib/supabase/client.js');
  const { data, error } = await getSupabase()
    .from('jewellery')
    .select(JEWELLERY_LIST_COLUMNS)
    .eq('active', true)
    .is('archived_at', null)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDiamonds() {
  if (!USE_SUPABASE) return MOCK_DIAMONDS;
  const { getSupabase } = await import('@/lib/supabase/client.js');
  const { data, error } = await getSupabase().from('diamonds').select(`${DIAMOND_LIST_COLUMNS},total_price,currency,price_visible`).eq('active', true).is('archived_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDiamond(publicId) {
  if (!USE_SUPABASE) return MOCK_DIAMONDS.find((row) => row.public_id === publicId) ?? null;
  const { getSupabase } = await import('@/lib/supabase/client.js');
  const { data, error } = await getSupabase().from('diamonds').select(`${DIAMOND_LIST_COLUMNS},total_price,currency,price_visible,certificate_url,measurements,depth_percentage,table_percentage,polish,symmetry,fluorescence`).eq('public_id', publicId).eq('active', true).is('archived_at', null).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchJewellery() {
  if (!USE_SUPABASE) return MOCK_JEWELLERY;
  const { getSupabase } = await import('@/lib/supabase/client.js');
  const { data, error } = await getSupabase().from('jewellery').select(JEWELLERY_LIST_COLUMNS).eq('active', true).is('archived_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchJewelleryPiece(publicId) {
  if (!USE_SUPABASE) return MOCK_JEWELLERY.find((row) => row.public_id === publicId) ?? null;
  const rows = await fetchJewellery();
  return rows.find((row) => row.public_id === publicId) ?? null;
}
