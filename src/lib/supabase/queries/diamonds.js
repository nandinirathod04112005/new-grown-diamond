import { supabase } from '../client.js';
import {
  DIAMOND_ADMIN_COLUMNS,
  DIAMOND_CARD_COLUMNS,
  DIAMOND_DETAIL_COLUMNS,
} from '../columns.js';
import { DIAMOND_BUCKET, diamondImageKey, diamondImageUrl } from '../storage.js';

/**
 * Every read and write against public.diamonds lives here.
 *
 * No component calls supabase.from() directly. Keeping it in one module is
 * what makes the storefront's `active`/`archived_at` filters and its frozen
 * column list reviewable in a single sitting rather than scattered across
 * pages.
 */

/** @typedef {{publicId:string,stockNumber:string,shape:string,carat:number,colour:string,clarity:string,cut:string,polish:string,symmetry:string,fluorescence:string,lab:string,growth:string,availability:string,imageUrl:string,featured:boolean}} DiamondCard */

function toCard(row) {
  return {
    publicId: row.public_id,
    stockNumber: row.stock_number || row.public_id,
    shape: row.shape || '—',
    carat: Number(row.carat) || 0,
    colour: row.color || '—',
    clarity: row.clarity || '—',
    cut: row.cut || '—',
    polish: row.polish || '—',
    symmetry: row.symmetry || '—',
    fluorescence: row.fluorescence || '—',
    lab: row.laboratory || '—',
    growth: row.growth_method || '—',
    availability: row.availability || 'On Request',
    imageUrl: diamondImageUrl(row.image_path),
    featured: Boolean(row.featured),
    certificate_url: row.certificate_url || '',
  };
}

/**
 * Live storefront stock.
 *
 * The active / not-archived filters are stated here even though the database
 * policies already enforce them: defence in depth, and the intent stays
 * readable at the call site instead of living only in a policy.
 */
export async function listDiamonds() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_CARD_COLUMNS)
    .eq('active', true)
    .is('archived_at', null)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCard);
}

export async function getDiamond(publicId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_DETAIL_COLUMNS)
    .eq('public_id', publicId)
    .eq('active', true)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, imageUrl: diamondImageUrl(data.image_path) } : null;
}

/* ---------------- admin ---------------- */

/** Admin sees everything, including inactive and archived stock. */
export async function adminListDiamonds() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_ADMIN_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminGetDiamond(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_ADMIN_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * DIA- plus eight uppercase alphanumerics, matching the ids already in the
 * table. The format is a database constraint, not a UI convention, so a
 * mismatched id is rejected by Postgres rather than caught by a validator.
 */
export function newPublicId() {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `DIA-${out}`;
}

/**
 * Upload a stone photograph and return its storage path.
 * The bucket is admin-write by policy; a non-admin session is refused here by
 * the database, not by this function.
 */
export async function uploadDiamondImage(publicId, file) {
  if (!supabase) throw new Error('Supabase is not configured');
  const path = diamondImageKey(publicId, file);
  const { error } = await supabase.storage
    .from(DIAMOND_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return path;
}

export async function adminCreateDiamond(values) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('diamonds').insert(values).select('id,public_id').single();
  if (error) throw error;
  return data;
}

export async function adminUpdateDiamond(id, values) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('diamonds').update(values).eq('id', id);
  if (error) throw error;
}

/**
 * Stock is archived, never deleted: the storefront policies already hide
 * archived rows, and the history stays intact for the enquiries that
 * reference it.
 */
export async function adminArchiveDiamond(id, archived) {
  return adminUpdateDiamond(id, { archived_at: archived ? new Date().toISOString() : null });
}

export async function adminSetActive(id, active) {
  return adminUpdateDiamond(id, { active });
}

/**
 * One representative photograph per shape, drawn from live stock.
 *
 * The shape guide used drawn outlines for every cut. Real photographs are
 * better — but only of the RIGHT cut: putting the house round brilliant behind
 * a label reading "Pear" is a mislabelled picture, and a trade buyer spots it
 * instantly. So the shape comes from the stone's own `shape` column and the
 * photograph comes with it; a cut with no stock in stock simply has no photo
 * and keeps its drawn outline.
 *
 * That also means the guide fills itself in over time: photograph a marquise,
 * add it to inventory, and the marquise on the wheel becomes real with no code
 * change at all.
 *
 * Failure is silent by design. This decorates a page that already works, so a
 * network error must cost the outlines, never the page.
 */
export async function listShapePhotos() {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('diamonds')
    .select('shape,image_path,carat,public_id')
    .eq('active', true)
    .is('archived_at', null)
    .not('image_path', 'is', null)
    // Largest first, so the stone that represents a cut is the best example of
    // it rather than whichever happened to be entered first.
    .order('carat', { ascending: false });

  if (error) {
    console.error('[NGD shape photos]', error);
    return {};
  }

  const out = {};
  for (const row of data ?? []) {
    const shape = (row.shape || '').trim();
    if (!shape || out[shape]) continue;
    const url = diamondImageUrl(row.image_path);
    if (url) out[shape] = { url, carat: Number(row.carat) || 0, publicId: row.public_id };
  }
  return out;
}
