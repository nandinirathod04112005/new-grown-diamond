import { supabase } from '../client.js';
import { recordAudit } from './adminInsights.js';
import { cleanText, forgetSeoCache, isEditableRoute, SEO_LIMITS, SEO_TABLE } from '../../seoOverrides.js';

/**
 * The SEO Manager's reads and writes on public.seo_settings.
 *
 * Admin only. The site and the build read the same table through
 * lib/seoOverrides.js — a plain fetch, no SDK — and never import this file,
 * so none of this ships to a visitor. The policies (migration 0001), used
 * exactly as they are: active admins read, insert, update and delete every
 * row; anyone may read the rows whose published = true.
 *
 *   Save draft  — the edits go to `draft`; the live values are untouched.
 *   Publish     — the edits go to the live columns, published, draft cleared.
 *   Unpublish   — off the site; the values are kept as the draft.
 *   Revert      — the row is deleted; the route is back on its built-in values.
 *
 * Every one of them goes to the audit log: the route and the fields that
 * moved. There is nothing personal in any of them.
 */

/* The helpers the screen needs, from the one place the site and build share. */
export {
  builtInSeo, cleanCanonical, cleanText, duplicateOf, isEnglishRoute, resolveOgImage, routesFor, SEO_LIMITS,
} from '../../seoOverrides.js';

const ADMIN_COLUMNS = 'id,route,title,description,og_image_path,canonical,noindex,published,draft,updated_at';
const FIELDS = ['title', 'description', 'og_image_path', 'canonical', 'noindex'];
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

function explain(error) {
  if (error?.code === '23505') return new Error('This page already has a saved override. Reload to see it, then edit that.');
  if (error?.code === 'PGRST116') return new Error('Nothing was saved: the override was changed or removed elsewhere. Reload and try again.');
  if (error?.code === '42501' || /row-level security/i.test(error?.message ?? '')) {
    return new Error('The database refused this change. Only an active administrator can edit SEO.');
  }
  return error instanceof Error ? error : new Error(error?.message || 'The change could not be saved.');
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

/** The editor's form for a row: its draft when it has one, else its live values. */
export function seoFormFor(row) {
  const source = isPlainObject(row?.draft) ? row.draft : (row ?? {});
  return {
    title: String(source.title ?? ''),
    description: String(source.description ?? ''),
    og_image_path: String(source.og_image_path ?? ''),
    noindex: source.noindex === true,
    useCanonical: Boolean(source.canonical),
    canonical: String(source.canonical ?? ''),
  };
}

/** The columns a save writes: trimmed, empty as null, canonical only when opted in. */
export function seoFields(form) {
  const text = (v, max) => cleanText(v).slice(0, max) || null;
  return {
    title: text(form.title, SEO_LIMITS.title.max),
    description: text(form.description, SEO_LIMITS.description.max),
    og_image_path: String(form.og_image_path ?? '').trim() || null,
    canonical: form.useCanonical ? (String(form.canonical ?? '').trim() || null) : null,
    noindex: form.noindex === true,
  };
}

function diffSeo(before, after, prefix = '') {
  const out = {};
  FIELDS.forEach((f) => {
    const a = before?.[f] ?? null;
    const b = after?.[f] ?? null;
    if (String(a ?? '') !== String(b ?? '')) out[`${prefix}${f}`] = [a, b];
  });
  return out;
}

/** Every row, drafts and unpublished ones included (RLS: active admins only). */
export async function adminListSeoSettings() {
  if (!supabase) return { rows: [], missing: false, unconfigured: true };
  const { data, error } = await supabase.from(SEO_TABLE).select(ADMIN_COLUMNS).order('route', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { rows: [], missing: true, unconfigured: false };
    throw explain(error);
  }
  return { rows: data ?? [], missing: false, unconfigured: false };
}

/** Save the form as the route's draft. The live values, if any, are untouched. */
export async function adminSaveSeoDraft(route, form, previous) {
  if (!isEditableRoute(route)) throw new Error('That is not a public page of this site.');
  const db = requireClient();
  const draft = { ...seoFields(form), saved_at: new Date().toISOString() };
  const query = previous
    ? db.from(SEO_TABLE).update({ draft }).eq('id', previous.id)
    : db.from(SEO_TABLE).insert({ route, draft, published: false });
  const { data, error } = await query.select(ADMIN_COLUMNS).single();
  if (error) throw explain(error);
  await recordAudit({
    action: previous ? 'update' : 'create',
    entityType: 'seo',
    entityId: route,
    entityLabel: `Draft for ${route}`,
    changes: diffSeo(previous ? (previous.draft ?? previous) : null, draft, 'draft_'),
  });
  return data;
}

/** Publish the form: written to the live columns, published, draft cleared. */
export async function adminPublishSeo(route, form, previous) {
  if (!isEditableRoute(route)) throw new Error('That is not a public page of this site.');
  const db = requireClient();
  const fields = seoFields(form);
  const patch = { ...fields, published: true, draft: null };
  const query = previous
    ? db.from(SEO_TABLE).update(patch).eq('id', previous.id)
    : db.from(SEO_TABLE).insert({ route, ...patch });
  const { data, error } = await query.select(ADMIN_COLUMNS).single();
  if (error) throw explain(error);
  await recordAudit({
    action: 'publish',
    entityType: 'seo',
    entityId: route,
    entityLabel: fields.title || route,
    changes: diffSeo(previous?.published ? previous : null, fields),
  });
  /* This browser reads the published rows afresh on its next page load. */
  forgetSeoCache();
  return data;
}

/** Take the override off the site; its values are kept as the draft. */
export async function adminUnpublishSeo(row) {
  const db = requireClient();
  const draft = isPlainObject(row.draft)
    ? row.draft
    : { ...Object.fromEntries(FIELDS.map((f) => [f, row[f] ?? null])), saved_at: new Date().toISOString() };
  const { data, error } = await db
    .from(SEO_TABLE)
    .update({ published: false, draft })
    .eq('id', row.id)
    .select(ADMIN_COLUMNS)
    .single();
  if (error) throw explain(error);
  await recordAudit({
    action: 'unpublish',
    entityType: 'seo',
    entityId: row.route,
    entityLabel: row.title || row.route,
    changes: { published: [true, false] },
  });
  forgetSeoCache();
  return data;
}

/** Throw away an unpublished draft; the live override stays as it is. */
export async function adminDiscardSeoDraft(row) {
  const db = requireClient();
  const { data, error } = await db
    .from(SEO_TABLE)
    .update({ draft: null })
    .eq('id', row.id)
    .select(ADMIN_COLUMNS)
    .single();
  if (error) throw explain(error);
  await recordAudit({
    action: 'update',
    entityType: 'seo',
    entityId: row.route,
    entityLabel: `Draft for ${row.route}`,
    changes: { draft: ['saved', 'discarded'] },
  });
  return data;
}

/** Delete the row: the route goes back to its built-in values everywhere. */
export async function adminDeleteSeo(row) {
  const db = requireClient();
  const { data, error } = await db.from(SEO_TABLE).delete().eq('id', row.id).select('id');
  if (error) throw explain(error);
  if (!data?.length) throw new Error('Nothing was removed: the override may already be gone, or this account cannot delete it. Reload and check.');
  await recordAudit({
    action: 'delete',
    entityType: 'seo',
    entityId: row.route,
    entityLabel: row.title || row.route,
    changes: {},
  });
  forgetSeoCache();
}
