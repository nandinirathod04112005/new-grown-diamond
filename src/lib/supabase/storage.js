import { supabase } from './client.js';

export const DIAMOND_BUCKET = 'diamond-images';

/*
 * The journal's covers. The bucket is proposed in supabase/blogs.sql and has
 * deliberately not been created — until it exists every cover_path is empty and
 * blogCoverUrl returns '', which the page renders as a plain plate rather than
 * a broken image.
 */
export const BLOG_BUCKET = 'blog-images';

/**
 * Public URL for a file in a public bucket, or '' when there is no path.
 *
 * Returning an empty string rather than throwing is deliberate: a stone with
 * no photograph yet is a normal state, and the card falls back to its own
 * artwork instead of rendering a broken image.
 */
export function publicUrl(bucket, path) {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}

export function diamondImageUrl(path) {
  return publicUrl(DIAMOND_BUCKET, path);
}

/**
 * Storage key for a newly uploaded stone photograph, matching the layout the
 * production site already uses: diamonds/<public id>/<random>.<ext>
 */
export function diamondImageKey(publicId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = Math.random().toString(36).slice(2, 12);
  return `diamonds/${publicId}/${rand}.${ext}`;
}

/** Public URL for a journal cover, or '' when the post has no image. */
export function blogCoverUrl(path) {
  return path ? publicUrl(BLOG_BUCKET, path) : '';
}
