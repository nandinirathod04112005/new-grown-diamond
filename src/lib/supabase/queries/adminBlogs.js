import { supabase } from '../client.js';
import { BLOG_BUCKET, blogCoverKey } from '../storage.js';
import { diffFor, recordAudit } from './adminInsights.js';
import { uploadWithProgress } from './adminMedia.js';
import { isMissingTable } from './blogs.js';

/**
 * The journal editor's writes.
 *
 * Every one of them is refused by the database for anyone who is not an active
 * admin — the "blogs: admins write" policy decides that from public.profiles,
 * not from anything this code sends — so the admin route is a convenience and
 * never the boundary. Each write also lands in the audit log, with the same
 * summary-only rule the stock screens use: title, slug, publish state and cover
 * are logged; the body text never is.
 */

const ADMIN_COLUMNS =
  'id,slug,title,excerpt,body,cover_path,author_name,published,published_at,created_at,updated_at';

/** A URL-safe slug from a title: lower case, ASCII, words joined by hyphens. */
export function slugify(title) {
  return String(title ?? '')
    .normalize('NFKD')
    /* Combining marks (accents) that NFKD split off their letters. */
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Every post, drafts included. RLS returns drafts to active admins only. */
export async function adminListBlogs() {
  if (!supabase) return { posts: [], missing: false };
  const { data, error } = await supabase
    .from('blogs')
    .select(ADMIN_COLUMNS)
    .order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTable(error)) return { posts: [], missing: true };
    throw error;
  }
  return { posts: data ?? [], missing: false };
}

export async function adminGetBlog(id) {
  const { data, error } = await supabase.from('blogs').select(ADMIN_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Only the columns the editor owns reach the database. Empty strings go as
 * null, so "no excerpt" is one state rather than two.
 */
function payloadOf(values) {
  const text = (v) => {
    const s = String(v ?? '').trim();
    return s === '' ? null : s;
  };
  const published = Boolean(values.published);
  return {
    slug: String(values.slug ?? '').trim(),
    title: String(values.title ?? '').trim(),
    excerpt: text(values.excerpt),
    body: text(values.body),
    cover_path: text(values.cover_path),
    author_name: text(values.author_name),
    published,
    /* A published post always has a date; a draft keeps whatever it had, so
       taking a post down and putting it back does not rewrite its history. */
    published_at: published ? (values.published_at || new Date().toISOString()) : (values.published_at || null),
  };
}

/** A clear sentence for the refusals an editor can actually hit. */
function explain(error) {
  if (error?.code === '23505') {
    return new Error('Another post already uses that web address (slug). Choose a different one.');
  }
  if (error?.code === '42501' || /row-level security/i.test(error?.message ?? '')) {
    return new Error('The database refused this change. Only an active administrator can edit the journal.');
  }
  return error;
}

export async function adminCreateBlog(values) {
  const row = payloadOf(values);
  const { data, error } = await supabase.from('blogs').insert(row).select(ADMIN_COLUMNS).single();
  if (error) throw explain(error);
  await recordAudit({
    action: 'create',
    entityType: 'blog',
    entityId: data.slug,
    entityLabel: data.title,
    changes: diffFor('blog', null, row),
  });
  return data;
}

export async function adminUpdateBlog(id, values, previous) {
  const row = { ...payloadOf(values), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('blogs').update(row).eq('id', id).select(ADMIN_COLUMNS).single();
  if (error) throw explain(error);
  const flipped = previous && Boolean(previous.published) !== row.published;
  await recordAudit({
    action: flipped ? (row.published ? 'publish' : 'unpublish') : 'update',
    entityType: 'blog',
    entityId: data.slug,
    entityLabel: data.title,
    changes: diffFor('blog', previous, row),
  });
  return data;
}

/** Publish or take down, from the list, without opening the editor. */
export async function adminSetBlogPublished(post, published) {
  const patch = {
    published,
    published_at: published ? (post.published_at || new Date().toISOString()) : post.published_at,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('blogs').update(patch).eq('id', post.id);
  if (error) throw explain(error);
  await recordAudit({
    action: published ? 'publish' : 'unpublish',
    entityType: 'blog',
    entityId: post.slug,
    entityLabel: post.title,
    changes: diffFor('blog', post, patch),
  });
}

/**
 * Delete a post.
 *
 * Unlike a stone, nothing references a journal row — no quote, hold or
 * enquiry carries a blog id — so a delete orphans nothing. The list still asks
 * for the slug to be typed first, and the entry lands in the audit log.
 */
export async function adminDeleteBlog(post) {
  const { error } = await supabase.from('blogs').delete().eq('id', post.id);
  if (error) throw explain(error);
  await recordAudit({
    action: 'delete',
    entityType: 'blog',
    entityId: post.slug,
    entityLabel: post.title,
    changes: {},
  });
}

/** Upload a cover to site-media/journal/<slug>/…, returning its storage path. */
export async function uploadBlogCover(slug, file, onProgress) {
  const path = blogCoverKey(slug, file);
  await uploadWithProgress(BLOG_BUCKET, path, file, onProgress);
  await recordAudit({
    action: 'media_upload',
    entityType: 'media',
    entityId: path,
    entityLabel: file.name,
    changes: diffFor('media', null, { path, bucket: BLOG_BUCKET }),
  });
  return path;
}
