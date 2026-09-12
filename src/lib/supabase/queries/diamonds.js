import { supabase } from '../client.js';
import {
  DIAMOND_ADMIN_COLUMNS,
  DIAMOND_CARD_COLUMNS,
  DIAMOND_DETAIL_COLUMNS,
} from '../columns.js';
import { DIAMOND_BUCKET, diamondImageKey, diamondImageUrl } from '../storage.js';
import { diffFor, recordAudit } from './adminInsights.js';

/**
 * Every read and write against public.diamonds lives here.
 *
 * No component calls supabase.from() directly. Keeping it in one module is
 * what makes the storefront's `active`/`archived_at` filters and its frozen
 * column list reviewable in a single sitting rather than scattered across
 * pages.
 */

/** @typedef {{publicId:string,stockNumber:string,shape:string,carat:number,colour:string,clarity:string,cut:string,polish:string,symmetry:string,fluorescence:string,lab:string,growth:string,availability:string,imageUrl:string,featured:boolean,reportNumber:string,price:number|null,currency:string}} DiamondCard */

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
    reportNumber: row.report_number || '',
    /* Null unless the admin has chosen to publish this stone's price. The
       decision is made once, here, so no component can show a hidden price
       by forgetting to check the flag. */
    price: row.price_visible && Number(row.total_price) > 0 ? Number(row.total_price) : null,
    currency: row.currency || 'USD',
  };
}

/**
 * Just these stones, by their public ids.
 *
 * For the wishlist and the cart, which hold a handful of ids and need to know
 * whether each is still live. Both used to call listDiamonds() and search the
 * result — which meant downloading the entire catalogue to check six stones,
 * and once the catalogue passed a thousand rows it stopped being able to
 * answer correctly at all, because the stone being looked for might be on a
 * page that was never fetched.
 */
export async function listDiamondsByIds(publicIds) {
  if (!supabase || !publicIds?.length) return [];
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_CARD_COLUMNS)
    .in('public_id', publicIds)
    .eq('active', true)
    .is('archived_at', null);
  if (error) throw error;
  return (data ?? []).map(toCard);
}

/**
 * Live storefront stock, ONE PAGE AT A TIME.
 *
 * This used to fetch everything. That was fine while the catalogue was three
 * stones and became a hang the day a supplier list put 18,061 live: PostgREST
 * caps a response at 1,000 rows, so the page silently received a truncated
 * catalogue AND built a thousand cards in a single render pass. The tab stopped
 * answering, and no amount of client-side work could fix it, because the cost
 * was in the number of rows asked for.
 *
 * `total` comes back with the page because the foot of the grid has to say how
 * much is behind it. EXACT, not estimated: "18,061 stones in stock" is a claim
 * a trade buyer reads as fact, and the planner's estimate was out by eight
 * thousand right after the stock list landed. Counting thirty thousand rows
 * costs Postgres a few milliseconds; being wrong about the size of the
 * inventory costs more than that.
 *
 * The active / not-archived filters are stated here even though the database
 * policies already enforce them: defence in depth, and the intent stays
 * readable at the call site instead of living only in a policy.
 */
export async function listDiamonds({ limit = 120, offset = 0 } = {}) {
  if (!supabase) return { stones: [], total: 0 };
  const { data, error, count } = await supabase
    .from('diamonds')
    .select(DIAMOND_CARD_COLUMNS, { count: 'exact' })
    .eq('active', true)
    .is('archived_at', null)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    /* Ordering by created_at alone is not a total order once a stock list
       lands: thousands of rows share a timestamp to the microsecond, and
       Postgres may return them in a different order per page, which shows a
       visitor the same stone twice and hides another. public_id breaks the
       tie and never repeats. */
    .order('public_id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { stones: (data ?? []).map(toCard), total: count ?? 0 };
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
  /* After the write, and never in its way: see queries/adminInsights.js. */
  await recordAudit({
    action: 'create',
    entityType: 'diamond',
    entityId: data?.public_id ?? data?.id,
    entityLabel: values?.stock_number ?? null,
    changes: diffFor('diamond', null, values),
  });
  return data;
}

/**
 * `meta` is what the audit entry is written from, and it is optional
 * everywhere: a caller that knows the row it is changing passes it, and a
 * caller that does not still gets the write it asked for. Nothing about the
 * update itself depends on it.
 */
export async function adminUpdateDiamond(id, values, meta = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('diamonds').update(values).eq('id', id);
  if (error) throw error;
  await recordAudit({
    action: meta.action ?? 'update',
    entityType: 'diamond',
    entityId: meta.publicId ?? id,
    entityLabel: meta.label ?? null,
    changes: diffFor('diamond', meta.previous, values),
  });
}

/**
 * Stock is archived, never deleted: the storefront policies already hide
 * archived rows, and the history stays intact for the enquiries that
 * reference it.
 */
export async function adminArchiveDiamond(id, archived, meta = {}) {
  return adminUpdateDiamond(
    id,
    { archived_at: archived ? new Date().toISOString() : null },
    { ...meta, action: archived ? 'archive' : 'restore' },
  );
}

export async function adminSetActive(id, active, meta = {}) {
  return adminUpdateDiamond(id, { active }, { ...meta, action: active ? 'publish' : 'unpublish' });
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

/* ------------------------------------------------------------------ */

/** Columns a stock import is allowed to write. Anything else in the file is
 *  ignored rather than rejected, so a supplier adding a column does not break
 *  the import. */
export const IMPORT_COLUMNS = [
  'public_id', 'stock_number', 'report_number', 'shape', 'carat', 'color', 'clarity',
  'cut', 'polish', 'symmetry', 'fluorescence', 'laboratory', 'certificate_number',
  'certificate_url', 'measurements', 'depth_percentage', 'table_percentage', 'ratio',
  'growth_method', 'location', 'availability', 'price_per_carat', 'total_price',
  'currency', 'image_path', 'internal_notes', 'active', 'featured', 'price_visible',
  'video_url', 'girdle', 'culet', 'shade', 'milky', 'eye_clean',
  'crown_angle', 'crown_height', 'pavilion_angle', 'pavilion_height',
];

/**
 * A whole stock list, in one go.
 *
 * UPSERT ON stock_number, not insert. A price list is re-sent every time the
 * stock moves, and most of what it contains is stones that are already here at
 * a new rate. Inserting would fail on the first one of those and leave the
 * import half-applied; upserting brings the existing row up to date and adds
 * only what is genuinely new. The stone number is what the trade already uses
 * to mean "this stone", and the column carries a unique index, so it is the
 * natural key.
 *
 * ONE AUDIT ENTRY FOR THE WHOLE IMPORT. adminCreateDiamond writes an audit row
 * per stone, which is right for a stone typed in by hand and wrong for thirty
 * thousand: it would double the work, and bury every real edit in the log under
 * a wall of identical lines.
 *
 * Chunked because PostgREST has to hold the whole request in memory and a
 * 30,000-row body is a timeout, not a write. Each chunk is its own request, so
 * an interrupted import leaves the chunks before it applied — re-running it is
 * safe and finishes the job, which is the other reason this upserts.
 */
export async function adminImportDiamonds(rows, { chunkSize = 500, onProgress } = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const clean = rows.map((row) => {
    const out = {};
    for (const key of IMPORT_COLUMNS) if (row[key] !== undefined) out[key] = row[key];
    return out;
  });

  let written = 0;
  const failures = [];
  for (let i = 0; i < clean.length; i += chunkSize) {
    const chunk = clean.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('diamonds')
      .upsert(chunk, { onConflict: 'stock_number', ignoreDuplicates: false });
    if (error) failures.push({ from: i + 1, to: i + chunk.length, message: error.message });
    else written += chunk.length;
    onProgress?.({ done: Math.min(i + chunkSize, clean.length), total: clean.length, written, failures: failures.length });
  }

  await recordAudit({
    action: 'import',
    entityType: 'diamond',
    entityId: 'stock-import',
    entityLabel: `${written} of ${clean.length} stones`,
    changes: null,
  });

  return { written, total: clean.length, failures };
}
