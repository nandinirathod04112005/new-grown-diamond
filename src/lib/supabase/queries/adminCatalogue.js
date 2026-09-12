import { supabase } from '../client.js';
import { DIAMOND_CARD_COLUMNS } from '../columns.js';
import { BLOG_BUCKET, DIAMOND_BUCKET, diamondImageUrl, publicUrl } from '../storage.js';
import { diffFor, recordAudit } from './adminInsights.js';
import { isMissingTable } from './blogs.js';
import { JEWELLERY_CARD_COLUMNS } from './jewellery.js';

/**
 * Categories and collections, built on tables that already exist.
 *
 * THERE IS NO categories TABLE AND NO collections TABLE, and none is added
 * here. Both are carried by what the project already has, under its existing
 * policies:
 *
 * CATEGORIES are the values of jewellery.category, a free-text column. The
 * list is derived from the pieces themselves, so it cannot drift from them.
 * Renaming or merging is one bulk UPDATE of the matching jewellery rows, which
 * the jewellery admin-update policy already allows.
 *
 * COLLECTIONS are site_content rows with page = 'collections':
 *
 *   section     the url-safe address (unique together with page)
 *   heading     the name
 *   body        a short description
 *   image_path  optional cover — a path in site-media or diamond-images
 *   image_alt   the cover's alt text
 *   position    order among collections, 0 first
 *   published   whether the storefront may show it (public read is on
 *               published rows only)
 *   draft       { items: [{ type: 'diamond' | 'jewellery', id }], cover_bucket }
 *
 * `draft` normally holds an unpublished edit of a row. A collection is never
 * edited through a draft, so here it carries the ordered member list and the
 * cover's bucket — the same way page = 'feedback' uses it for a rating.
 *
 * Every collection write filters on page = 'collections' as well as on the
 * row id, so no call here can reach a feedback, settings or content row even
 * if it were handed the wrong id.
 */

export const COLLECTIONS_PAGE = 'collections';
export const MEMBER_TYPES = ['diamond', 'jewellery'];
export const CATEGORY_MAX = 60;
export const COLLECTION_LIMITS = { name: 90, slug: 80, description: 600, alt: 200, members: 200 };
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const COVER_BUCKETS = new Set([DIAMOND_BUCKET, BLOG_BUCKET]);
/* uuid in practice; kept lenient so a bigint key would not silently empty a
   collection, strict enough that nothing odd reaches an `in` filter. */
const SAFE_ID = /^[0-9A-Za-z-]{1,64}$/;

const COLLECTION_COLUMNS =
  'id,section,heading,body,image_path,image_alt,position,published,draft,created_at,updated_at';
const PIECE_COLUMNS = 'id,public_id,sku,product_name,category,metal,active,archived_at';
const DIAMOND_COLUMNS = 'id,public_id,stock_number,shape,carat,color,clarity,image_path,active,archived_at';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------------- errors ---------------- */

function explainRead(error, what) {
  const msg = String(error?.message ?? '');
  if (error?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(`This account is not allowed to read ${what}.`);
  }
  return new Error(msg || `${what[0].toUpperCase()}${what.slice(1)} could not be loaded.`);
}

/** A sentence an operator can act on, for the refusals a write can hit. */
function explain(error, doing) {
  const code = error?.code;
  const msg = String(error?.message ?? '');
  if (code === '23505') return new Error('Another collection already uses that address. Choose a different one.');
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(`The database refused this change. Only an active administrator can ${doing}.`);
  }
  if (code === '23514' || code === '22001') {
    return new Error('The database would not accept that value. Shorten it or remove unusual characters, then try again.');
  }
  if (isMissingTable(error)) return new Error('This project’s database does not have the table or column this needs.');
  return new Error(msg || 'That change could not be saved.');
}

/**
 * Every row of a select, 1000 at a time.
 *
 * PostgREST caps a response (1000 rows by default) without saying so, and a
 * category count read from a silently truncated list would be a wrong number
 * presented as a fact. `build` must return a fresh, deterministically ordered
 * query each call.
 */
async function selectAll(build, pageSize = 1000, maxPages = 20) {
  const out = [];
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** Rows by id, in chunks short enough to keep the request URL sane. */
async function fetchByIds(table, columns, ids, narrow) {
  const clean = [...new Set(ids)].filter((id) => SAFE_ID.test(id));
  if (!clean.length) return new Map();
  const parts = await Promise.all(chunk(clean, 100).map(async (part) => {
    let q = supabase.from(table).select(columns).in('id', part);
    if (narrow) q = narrow(q);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }));
  return new Map(parts.flat().map((row) => [row.id, row]));
}

/* ======================= categories ======================= */

/** Whitespace collapsed, control characters dropped, ends trimmed. */
export function cleanCategory(value) {
  return Array.from(String(value ?? '').replace(/\s+/g, ' '))
    .filter((ch) => {
      const c = ch.codePointAt(0);
      return c >= 32 && c !== 127;
    })
    .join('')
    .trim();
}

const fold = (value) => cleanCategory(value).toLowerCase();

/** 'live' | 'hidden' | 'archived' — the same three states the stock screens use. */
export function pieceState(row) {
  if (row?.archived_at) return 'archived';
  return row?.active ? 'live' : 'hidden';
}

/**
 * Jewellery grouped by the exact value of its category.
 *
 * Grouped on the EXACT stored value, because that is what a rename has to
 * match: "Rings" and "rings " are two values in the table, and presenting them
 * as one would promise a rename that leaves half of them behind. Values that
 * differ only in capitals or spacing are flagged as `similar` instead, which
 * is exactly the case a merge is for.
 */
export function groupCategories(pieces) {
  const groups = new Map();
  let uncategorised = null;

  for (const p of pieces ?? []) {
    const raw = typeof p.category === 'string' ? p.category : '';
    const label = cleanCategory(raw);
    let g = label ? groups.get(raw) : uncategorised;
    if (!g) {
      g = {
        value: label ? raw : null,
        label: label || 'Uncategorised',
        untidy: Boolean(label) && raw !== label,
        pieces: [],
        total: 0,
        live: 0,
        hidden: 0,
        archived: 0,
        similar: [],
      };
      if (label) groups.set(raw, g);
      else uncategorised = g;
    }
    g.pieces.push(p);
    g.total += 1;
    g[pieceState(p)] += 1;
  }

  const byFold = new Map();
  for (const g of groups.values()) {
    const k = fold(g.value);
    byFold.set(k, [...(byFold.get(k) ?? []), g]);
  }
  for (const list of byFold.values()) {
    if (list.length > 1) list.forEach((g) => { g.similar = list.filter((o) => o !== g).map((o) => o.label); });
  }

  const byName = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true });
  for (const g of [...groups.values(), uncategorised].filter(Boolean)) {
    g.pieces.sort((a, b) => String(a.product_name ?? a.sku ?? '').localeCompare(String(b.product_name ?? b.sku ?? '')));
  }
  return { categories: [...groups.values()].sort(byName), uncategorised };
}

/** Every jewellery piece, narrow columns, archived and hidden included. */
export async function adminListPieces() {
  if (!supabase) return { pieces: [], missing: false, unconfigured: true };
  try {
    const pieces = await selectAll(() => supabase.from('jewellery').select(PIECE_COLUMNS).order('id', { ascending: true }));
    return { pieces, missing: false };
  } catch (error) {
    if (isMissingTable(error)) return { pieces: [], missing: true };
    throw explainRead(error, 'jewellery');
  }
}

/**
 * Rename a category everywhere, or merge it into another.
 *
 * One UPDATE … WHERE category = <exact old value>, so every matching piece —
 * live, hidden and archived — moves together or none does. A merge is the same
 * statement with an EXISTING value as the target, which is why `to` is used
 * verbatim for a merge (it must equal the stored value exactly) and cleaned
 * for a rename.
 *
 * Returns how many rows actually changed. Zero with no error is RLS declining
 * silently, or the value having been renamed in another tab; the caller says
 * so rather than reporting a success.
 */
export async function adminRenameCategory(from, to, { merge = false } = {}) {
  if (!supabase) throw new Error('Not connected to the database.');
  if (typeof from !== 'string' || !cleanCategory(from)) throw new Error('Choose a category to rename.');
  const next = merge ? String(to ?? '') : cleanCategory(to);
  if (!cleanCategory(next)) throw new Error('A category needs a name.');
  if (next.length > CATEGORY_MAX) throw new Error(`Keep category names under ${CATEGORY_MAX} characters.`);
  if (next === from) throw new Error('That is already its name.');

  const { data, error } = await supabase
    .from('jewellery')
    .update({ category: next })
    .eq('category', from)
    .select('id');
  if (error) throw explain(error, 'rename categories');

  const changed = data?.length ?? 0;
  if (changed > 0) {
    /* One entry for the whole operation rather than one per piece. The
       label carries the rename; `changes` stays empty unless 'category' is
       added to the audit allow-list. */
    await recordAudit({
      action: 'update',
      entityType: 'category',
      entityId: cleanCategory(next),
      entityLabel: `“${cleanCategory(from)}” ${merge ? 'merged into' : 'renamed to'} “${cleanCategory(next)}” · ${plural(changed, 'piece')}`,
      changes: diffFor('category', { category: from }, { category: next }),
    });
  }
  return { changed };
}

/* ======================= collections ======================= */

/** A url-safe address from a name: lower case, ASCII, words joined by hyphens. */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, COLLECTION_LIMITS.slug)
    .replace(/-+$/, '');
}

/** The ordered member list, with anything malformed or repeated dropped. */
export function membersOf(row) {
  const draft = row?.draft;
  const items = draft && typeof draft === 'object' && Array.isArray(draft.items) ? draft.items : [];
  const seen = new Set();
  const out = [];
  for (const m of items) {
    if (!m || !MEMBER_TYPES.includes(m.type) || typeof m.id !== 'string' || !SAFE_ID.test(m.id)) continue;
    const key = `${m.type}:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: m.type, id: m.id });
  }
  return out;
}

/**
 * Where a collection's cover lives.
 *
 * image_path has no bucket beside it, so the bucket is kept in
 * draft.cover_bucket. A row without one (written by hand, say) is read as
 * site-media and flagged `bucketKnown: false`, so the Media Library's usage
 * check can treat that path as in use in EITHER bucket rather than guess.
 */
export function coverOf(row) {
  const path = typeof row?.image_path === 'string' ? row.image_path.trim() : '';
  if (!path) return null;
  if (/^https:\/\//i.test(path)) return { bucket: null, path, url: path, bucketKnown: false };
  const stated = row?.draft?.cover_bucket;
  const bucketKnown = COVER_BUCKETS.has(stated);
  const bucket = bucketKnown ? stated : BLOG_BUCKET;
  return { bucket, path, url: publicUrl(bucket, path), bucketKnown };
}

/**
 * What to show for one member.
 *
 * `known[type]` is a Map of rows by id, or null when that table could not be
 * read. The two are kept apart on purpose: a diamond missing from a Map that
 * WAS read has been deleted ("removed item"); a diamond whose table could not
 * be read is unknown, and calling it removed would invite someone to strip a
 * perfectly good stone out of a collection.
 */
export function describeMember(member, known) {
  const isDiamond = member.type === 'diamond';
  const map = known?.[member.type];
  if (!map) {
    return { status: 'unknown', title: isDiamond ? 'Diamond' : 'Jewellery piece', detail: 'Could not be checked just now' };
  }
  const row = map.get(member.id);
  if (!row) {
    return {
      status: 'removed',
      title: 'Removed item',
      detail: isDiamond ? 'A diamond that is no longer in the database' : 'A jewellery piece that is no longer in the database',
    };
  }
  const state = pieceState(row);
  if (isDiamond) {
    const carat = Number(row.carat);
    const grade = [row.color, row.clarity].filter(Boolean).join(' ');
    return {
      status: 'ok',
      state,
      title: row.stock_number || row.public_id || 'Diamond',
      detail: [carat > 0 ? `${carat.toFixed(2)} ct` : null, row.shape, grade].filter(Boolean).join(' · '),
      imageUrl: diamondImageUrl(row.image_path),
    };
  }
  return {
    status: 'ok',
    state,
    title: row.product_name || row.sku || row.public_id || 'Jewellery piece',
    detail: [row.sku, row.category, row.metal].filter(Boolean).join(' · '),
    imageUrl: '',
  };
}

/** Field-level problems, keyed by field. Empty object means it can be saved. */
export function validateCollection(form, others = []) {
  const e = {};
  const name = String(form.name ?? '').trim();
  if (!name) e.name = 'A collection needs a name.';
  else if (name.length > COLLECTION_LIMITS.name) e.name = `Keep the name under ${COLLECTION_LIMITS.name} characters.`;

  const slug = String(form.slug ?? '').trim();
  if (!SLUG_PATTERN.test(slug)) e.slug = 'Use lower-case letters, numbers and single hyphens only.';
  else if (slug.length > COLLECTION_LIMITS.slug) e.slug = `Keep the address under ${COLLECTION_LIMITS.slug} characters.`;
  else if (others.some((o) => o.section === slug)) e.slug = 'Another collection already uses this address.';

  if (String(form.description ?? '').length > COLLECTION_LIMITS.description) {
    e.description = `Keep the description under ${COLLECTION_LIMITS.description} characters.`;
  }
  if (String(form.coverAlt ?? '').length > COLLECTION_LIMITS.alt) {
    e.coverAlt = `Keep the alt text under ${COLLECTION_LIMITS.alt} characters.`;
  } else if (form.published && form.cover?.path && !String(form.coverAlt ?? '').trim()) {
    e.coverAlt = 'A published cover needs alt text: describe the image for people who cannot see it.';
  }

  const count = form.items?.length ?? 0;
  if (count > COLLECTION_LIMITS.members) e.items = `A collection can hold up to ${COLLECTION_LIMITS.members} pieces.`;
  else if (form.published && count === 0) e.items = 'A published collection needs at least one piece.';
  return e;
}

/** Every collection, drafts included, in the admin's order. */
export async function adminListCollections() {
  if (!supabase) return { collections: [], missing: false, unconfigured: true };
  const { data, error } = await supabase
    .from('site_content')
    .select(COLLECTION_COLUMNS)
    .eq('page', COLLECTIONS_PAGE)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { collections: [], missing: true };
    throw explainRead(error, 'website content');
  }
  return { collections: data ?? [], missing: false };
}

/**
 * The rows behind a set of members, for the admin screen.
 *
 * Admin reads, so hidden and archived stock come back too and are shown with
 * their state. A table that cannot be read comes back as null — "unknown" —
 * never as an empty Map, which would read as "every one of these was deleted".
 */
export async function adminResolveMembers(members) {
  if (!supabase) return { diamond: null, jewellery: null };
  const ids = { diamond: [], jewellery: [] };
  for (const m of members ?? []) ids[m.type]?.push(m.id);
  const [d, j] = await Promise.allSettled([
    fetchByIds('diamonds', DIAMOND_COLUMNS, ids.diamond),
    fetchByIds('jewellery', PIECE_COLUMNS, ids.jewellery),
  ]);
  if (d.status === 'rejected') console.error('[NGD Admin] collection diamonds unreadable:', d.reason);
  if (j.status === 'rejected') console.error('[NGD Admin] collection jewellery unreadable:', j.reason);
  return {
    diamond: d.status === 'fulfilled' ? d.value : null,
    jewellery: j.status === 'fulfilled' ? j.value : null,
  };
}

/**
 * Find stock to add: diamonds by stock number (or DIA- id), jewellery by name
 * (or SKU). Archived stock is not offered.
 *
 * Two plain ilike queries merged in memory rather than one `or=` filter: the
 * search text is typed by a person, and keeping it out of PostgREST's
 * logic-tree syntax means no comma or bracket in it can change the query.
 */
export async function adminSearchMembers(type, query, { limit = 12 } = {}) {
  if (!supabase) return [];
  /* Letters, digits, spaces and the few marks stock numbers use. An
     underscore is kept: in LIKE it only widens the match, never narrows it. */
  const term = String(query ?? '').replace(/[^\p{L}\p{N}\s./#_-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!term) return [];
  const spec = type === 'diamond'
    ? { table: 'diamonds', columns: DIAMOND_COLUMNS, keys: ['stock_number', 'public_id'], order: 'stock_number' }
    : { table: 'jewellery', columns: PIECE_COLUMNS, keys: ['product_name', 'sku'], order: 'product_name' };

  const results = await Promise.all(spec.keys.map((key) => supabase
    .from(spec.table)
    .select(spec.columns)
    .ilike(key, `%${term}%`)
    .is('archived_at', null)
    .order(spec.order, { ascending: true })
    .limit(limit)));

  if (results.every((r) => r.error)) throw explainRead(results[0].error, type === 'diamond' ? 'diamonds' : 'jewellery');
  const seen = new Map();
  results.forEach((r) => (r.data ?? []).forEach((row) => { if (!seen.has(row.id)) seen.set(row.id, row); }));
  return [...seen.values()].slice(0, limit);
}

async function actorId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Only the columns this screen owns reach the database. */
function payloadOf(form, previous) {
  const text = (v, max) => {
    const s = String(v ?? '').trim().slice(0, max);
    return s === '' ? null : s;
  };
  const cover = form.cover?.path ? form.cover : null;
  const kept = previous?.draft && typeof previous.draft === 'object' && !Array.isArray(previous.draft) ? previous.draft : {};
  return {
    section: String(form.slug ?? '').trim(),
    heading: text(form.name, COLLECTION_LIMITS.name),
    body: text(form.description, COLLECTION_LIMITS.description),
    image_path: cover ? cover.path : null,
    image_alt: cover ? text(form.coverAlt, COLLECTION_LIMITS.alt) : null,
    published: Boolean(form.published),
    draft: {
      ...kept,
      items: membersOf({ draft: { items: form.items } }).slice(0, COLLECTION_LIMITS.members),
      cover_bucket: cover && COVER_BUCKETS.has(cover.bucket) ? cover.bucket : null,
    },
  };
}

/* The summary an audit entry may carry: never the description text. */
const summaryOf = (row) => ({
  section: row?.section ?? null,
  heading: row?.heading ?? null,
  published: row?.published ?? null,
  position: row?.position ?? null,
  image_path: row?.image_path ?? null,
});

export async function adminCreateCollection(form, position = 0) {
  if (!supabase) throw new Error('Not connected to the database.');
  const row = { page: COLLECTIONS_PAGE, ...payloadOf(form, null), position, updated_by: await actorId() };
  const { data, error } = await supabase.from('site_content').insert(row).select(COLLECTION_COLUMNS).single();
  if (error) throw explain(error, 'create collections');
  await recordAudit({
    action: 'create',
    entityType: 'collection',
    entityId: data.section,
    entityLabel: data.heading,
    changes: diffFor('collection', null, summaryOf(row)),
  });
  return data;
}

export async function adminUpdateCollection(previous, form) {
  if (!supabase) throw new Error('Not connected to the database.');
  const row = { ...payloadOf(form, previous), updated_by: await actorId() };
  const { data, error } = await supabase
    .from('site_content')
    .update(row)
    .eq('id', previous.id)
    .eq('page', COLLECTIONS_PAGE)
    .select(COLLECTION_COLUMNS)
    .maybeSingle();
  if (error) throw explain(error, 'edit collections');
  if (!data) throw new Error('Nothing was saved: this collection may have been deleted in another tab, or this account may not edit website content.');
  const flipped = Boolean(previous.published) !== row.published;
  await recordAudit({
    action: flipped ? (row.published ? 'publish' : 'unpublish') : 'update',
    entityType: 'collection',
    entityId: data.section,
    entityLabel: data.heading,
    changes: diffFor('collection', summaryOf(previous), summaryOf(row)),
  });
  return data;
}

export async function adminSetCollectionPublished(row, published) {
  if (!supabase) throw new Error('Not connected to the database.');
  const { data, error } = await supabase
    .from('site_content')
    .update({ published, updated_by: await actorId() })
    .eq('id', row.id)
    .eq('page', COLLECTIONS_PAGE)
    .select('id');
  if (error) throw explain(error, 'publish collections');
  if (!data?.length) throw new Error('Nothing changed: this collection may have been deleted in another tab. The list has been reloaded.');
  await recordAudit({
    action: published ? 'publish' : 'unpublish',
    entityType: 'collection',
    entityId: row.section,
    entityLabel: row.heading,
    changes: diffFor('collection', summaryOf(row), { published }),
  });
}

/** Deletes the row only. The pieces and the cover file are not touched. */
export async function adminDeleteCollection(row) {
  if (!supabase) throw new Error('Not connected to the database.');
  const { data, error } = await supabase
    .from('site_content')
    .delete()
    .eq('id', row.id)
    .eq('page', COLLECTIONS_PAGE)
    .select('id');
  if (error) throw explain(error, 'delete collections');
  if (!data?.length) throw new Error('Nothing was deleted: it may already be gone, or this account may not delete website content.');
  await recordAudit({
    action: 'delete',
    entityType: 'collection',
    entityId: row.section,
    entityLabel: row.heading,
    changes: {},
  });
}

/**
 * Store a new order. `ordered` is every collection in its new sequence;
 * only rows whose position actually moves are written.
 */
export async function adminReorderCollections(ordered, moved) {
  if (!supabase) throw new Error('Not connected to the database.');
  const changes = ordered.map((row, index) => ({ row, index })).filter(({ row, index }) => row.position !== index);
  for (const { row, index } of changes) {
    const { error } = await supabase
      .from('site_content')
      .update({ position: index })
      .eq('id', row.id)
      .eq('page', COLLECTIONS_PAGE);
    if (error) throw explain(error, 'reorder collections');
  }
  if (changes.length && moved) {
    const at = ordered.findIndex((r) => r.id === moved.id);
    await recordAudit({
      action: 'update',
      entityType: 'collection',
      entityId: moved.section,
      entityLabel: `${moved.heading || moved.section} · moved to position ${at + 1}`,
      changes: diffFor('collection', summaryOf(moved), { position: at }),
    });
  }
}

/* ======================= storefront read ======================= */

const priceOf = (visible, value) => (visible && Number(value) > 0 ? Number(value) : null);

/**
 * Published collections for a public page, in the admin's order. Plain async,
 * no React; nothing on the storefront calls it yet.
 *
 * Members are resolved against LIVE stock only (active, not archived), and
 * any that are hidden, archived or deleted are simply left out — a visitor
 * never sees a removed item. Prices follow the same rule as the stock cards:
 * null unless that row's price_visible is set. A table that cannot be read
 * costs its members, never the collection.
 *
 * Returns { collections: [{ slug, name, description, coverUrl, coverAlt, items }] }.
 */
export async function listPublishedCollections({ resolve = true } = {}) {
  if (!supabase) return { collections: [], unconfigured: true };
  const { data, error } = await supabase
    .from('site_content')
    .select('section,heading,body,image_path,image_alt,position,draft,created_at')
    .eq('page', COLLECTIONS_PAGE)
    .eq('published', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { collections: [], missing: true };
    throw error;
  }

  const collections = (data ?? []).map((row) => {
    const cover = coverOf(row);
    return {
      slug: row.section,
      name: row.heading || row.section,
      description: row.body || '',
      coverUrl: cover?.url || '',
      coverAlt: row.image_alt || '',
      members: membersOf(row),
      items: [],
    };
  });
  if (!resolve || !collections.length) return { collections };

  const ids = { diamond: [], jewellery: [] };
  collections.forEach((c) => c.members.forEach((m) => ids[m.type].push(m.id)));
  const live = (q) => q.eq('active', true).is('archived_at', null);
  const [d, j] = await Promise.allSettled([
    fetchByIds('diamonds', `id,${DIAMOND_CARD_COLUMNS}`, ids.diamond, live),
    fetchByIds('jewellery', `id,${JEWELLERY_CARD_COLUMNS}`, ids.jewellery, live),
  ]);
  const found = {
    diamond: d.status === 'fulfilled' ? d.value : new Map(),
    jewellery: j.status === 'fulfilled' ? j.value : new Map(),
  };

  for (const c of collections) {
    c.items = c.members.map((m) => {
      const row = found[m.type].get(m.id);
      if (!row) return null;
      if (m.type === 'diamond') {
        return {
          type: 'diamond',
          id: row.id,
          publicId: row.public_id,
          stockNumber: row.stock_number || row.public_id,
          shape: row.shape || '',
          carat: Number(row.carat) || 0,
          colour: row.color || '',
          clarity: row.clarity || '',
          availability: row.availability || '',
          imageUrl: diamondImageUrl(row.image_path),
          price: priceOf(row.price_visible, row.total_price),
          currency: row.currency || 'USD',
        };
      }
      return {
        type: 'jewellery',
        id: row.id,
        publicId: row.public_id,
        name: row.product_name || row.sku || row.public_id,
        sku: row.sku || '',
        category: cleanCategory(row.category),
        metal: row.metal || '',
        availability: row.availability || '',
        price: priceOf(row.price_visible, row.price),
        currency: row.currency || 'USD',
      };
    }).filter(Boolean);
  }
  return { collections };
}
