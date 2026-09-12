import { supabase } from '../client.js';

/**
 * Every public read against public.blogs lives here, following the same shape
 * as queries/diamonds.js: no component calls supabase.from() directly, and the
 * column list is frozen in one reviewable place. The editor's writes are in
 * queries/adminBlogs.js, so none of that code ships to a reader.
 *
 * public.blogs EXISTS on the live project (verified 11 September 2026:
 * id, slug, title, excerpt, body, cover_path, author_name, published,
 * published_at, created_at, updated_at). Its policies, read back from the
 * project, are exactly the ones proposed in supabase/blogs.sql:
 *
 *   select — anyone, published rows only;
 *   select, insert, update, delete — an active admin (profiles.role = 'admin'
 *   and account_status = 'active').
 *
 * The missing-table handling is kept all the same: a rolled-back table must
 * read as "nothing published" on the storefront rather than as a fault.
 */

export const BLOG_CARD_COLUMNS =
  'slug,title,excerpt,cover_path,author_name,published_at';

export const BLOG_DETAIL_COLUMNS =
  'slug,title,excerpt,body,cover_path,author_name,published_at';

/**
 * "This table has not been created yet" arrives in more than one shape, and
 * guessing cost a bug: PostgREST answers from its own schema CACHE with
 * PGRST205 ("Could not find the table") long before Postgres ever sees the
 * query, so the Postgres code 42P01 never appears. Both are checked, plus the
 * message text, because this decides whether a visitor sees a calm "not
 * published yet" or a red failure. PGRST202 is the same answer for a missing
 * database function.
 */
export function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42703' || code === '42883') return true;
  return /could not find the (table|function)|relation .* does not exist|function .* does not exist/i.test(error?.message ?? '');
}

/**
 * Published posts, newest first, WITH their bodies.
 *
 * The body comes along because the journal searches it and states a reading
 * time for every card; a journal is a few dozen rows, not a feed.
 *
 * `published` is filtered here as well as in RLS. The policy is the
 * enforcement; stating it at the call site keeps the intent readable without
 * opening the policy file, and matches how listDiamonds() handles active stock.
 */
export async function listPublishedBlogs() {
  if (!supabase) return { posts: [], missing: false, unconfigured: true };

  const { data, error } = await supabase
    .from('blogs')
    .select(BLOG_DETAIL_COLUMNS)
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) {
    if (isMissingTable(error)) return { posts: [], missing: true };
    throw error;
  }
  return { posts: data ?? [], missing: false };
}

export async function getPublishedBlog(slug) {
  if (!supabase) return { post: null, missing: false, unconfigured: true };

  const { data, error } = await supabase
    .from('blogs')
    .select(BLOG_DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return { post: null, missing: true };
    throw error;
  }
  return { post: data ?? null, missing: false };
}
