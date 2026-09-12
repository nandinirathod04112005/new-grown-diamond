import { supabase } from './client.js';

export const DIAMOND_BUCKET = 'diamond-images';

/*
 * The journal's covers live in site-media, under journal/.
 *
 * A dedicated blog-images bucket was proposed in supabase/blogs.sql and never
 * created. site-media does exist (public read; upload, replace and delete for
 * an active admin only, by its storage policies), so the editor writes there
 * and no bucket or policy has to be added.
 */
export const BLOG_BUCKET = 'site-media';

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

/** The random part of a new storage key, so two uploads never collide. */
function keyTail(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = Math.random().toString(36).slice(2, 12);
  return `${rand}.${ext}`;
}

/**
 * Storage key for a newly uploaded stone photograph, matching the layout the
 * production site already uses: diamonds/<public id>/<random>.<ext>
 */
export function diamondImageKey(publicId, file) {
  return `diamonds/${publicId}/${keyTail(file)}`;
}

/** Storage key for a journal cover: journal/<slug>/<random>.<ext> */
export function blogCoverKey(slug, file) {
  const safe = String(slug || 'untitled').replace(/[^a-z0-9-]/g, '').slice(0, 80) || 'untitled';
  return `journal/${safe}/${keyTail(file)}`;
}

/**
 * Public URL for a journal cover, or '' when the post has none.
 *
 * A full https:// address is passed through, so an editor can point a post at
 * an image that is already hosted without uploading it again.
 */
export function blogCoverUrl(path) {
  if (!path) return '';
  if (/^https:\/\//i.test(path)) return path;
  return publicUrl(BLOG_BUCKET, path);
}
