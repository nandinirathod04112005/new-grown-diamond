import { supabase } from '../client.js';
import { diffFor, recordAudit } from './adminInsights.js';

/**
 * Jewellery.
 *
 * EVERY COLUMN NAMED HERE WAS VERIFIED AGAINST THE LIVE DATABASE before it was
 * written, by asking PostgREST for it and keeping only the ones that answered
 * 200. The full set is:
 *
 *   id, public_id, product_name, sku, category, metal, size, diamond_weight,
 *   description, price, currency, price_visible, availability, featured,
 *   active, archived_at, internal_notes, created_by, created_at, updated_at
 *
 * NOTE WHAT IS NOT THERE: no image column. Not image_path, not images, not
 * gallery, cover_path, photo_path, thumbnail_path or media — all probed, all
 * absent. Jewellery therefore has no photography in this schema, and the admin
 * screen says so rather than showing an empty frame that implies an upload
 * control is coming. Adding one is a migration plus a Storage bucket, and it
 * is written up as such rather than guessed at here.
 *
 * The shape of this module deliberately mirrors queries/diamonds.js — same
 * verbs, same archive-not-delete stance — so the two admin screens can share a
 * table component and an operator only has to learn the console once.
 */

/** The list the console shows: everything, archived and hidden included. */
const ADMIN_COLUMNS = '*';

/** What a public page would need. Kept narrow, and price only where allowed. */
export const JEWELLERY_CARD_COLUMNS =
  'public_id,product_name,sku,category,metal,size,diamond_weight,'
  + 'price,currency,price_visible,availability,featured,created_at';

export async function adminListJewellery() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('jewellery')
    .select(ADMIN_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Publish or hide a piece.
 *
 * `active` is the same switch the diamonds table uses, and the storefront
 * policies read it the same way — so this needs no new policy and grants no
 * new reach. An admin who cannot update this row is refused by RLS exactly as
 * they would be on any other table.
 */
export async function adminSetJewelleryActive(id, active, meta = {}) {
  const { error } = await supabase.from('jewellery').update({ active }).eq('id', id);
  if (error) throw error;
  await recordAudit({
    action: active ? 'publish' : 'unpublish',
    entityType: 'jewellery',
    entityId: meta.publicId ?? id,
    entityLabel: meta.label ?? null,
    changes: diffFor('jewellery', meta.previous, { active }),
  });
}

/** Feature or unfeature. Drives the homepage's featured rail. */
export async function adminSetJewelleryFeatured(id, featured, meta = {}) {
  const { error } = await supabase.from('jewellery').update({ featured }).eq('id', id);
  if (error) throw error;
  await recordAudit({
    action: 'update',
    entityType: 'jewellery',
    entityId: meta.publicId ?? id,
    entityLabel: meta.label ?? null,
    changes: diffFor('jewellery', meta.previous, { featured }),
  });
}

/**
 * Archive, never delete.
 *
 * Quotes, holds and enquiries all carry a jewellery_id, so a hard delete would
 * either fail on a foreign key or orphan a customer's history. `archived_at`
 * exists on this table for the same reason it does on diamonds, and setting it
 * is reversible.
 */
export async function adminArchiveJewellery(id, archived, meta = {}) {
  const archived_at = archived ? new Date().toISOString() : null;
  const { error } = await supabase.from('jewellery').update({ archived_at }).eq('id', id);
  if (error) throw error;
  await recordAudit({
    action: archived ? 'archive' : 'restore',
    entityType: 'jewellery',
    entityId: meta.publicId ?? id,
    entityLabel: meta.label ?? null,
    changes: diffFor('jewellery', meta.previous, { archived_at }),
  });
}
