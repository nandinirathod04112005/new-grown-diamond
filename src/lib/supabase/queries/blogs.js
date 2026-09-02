import { supabase } from '../client.js';

/**
 * Every read against public.blogs lives here, following the same shape as
 * queries/diamonds.js: no component calls supabase.from() directly, and the
 * column list is frozen in one reviewable place.
 *
 * IMPORTANT: at the time of writing, public.blogs DOES NOT EXIST. The table is
 * proposed in supabase/blogs.sql and has deliberately not been applied — this
 * project is not permitted to alter the database. Until someone runs that file,
 * every call here resolves to `{ missing: true }` rather than throwing, so the
 * page can say "not published yet" instead of showing a fault.
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
 * published yet" or a red failure.
 */
function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42703') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

/**
 * Published posts, newest first.
 *
 * `published` is filtered here as well as in RLS. The policy is the
 * enforcement; stating it at the call site keeps the intent readable without
 * opening the policy file, and matches how listDiamonds() handles active stock.
 */
export async function listPublishedBlogs() {
  if (!supabase) return { posts: [], missing: false, unconfigured: true };

  const { data, error } = await supabase
    .from('blogs')
    .select(BLOG_CARD_COLUMNS)
    .eq('published', true)
    .order('published_at', { ascending: false });

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
