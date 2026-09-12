/**
 * Phone-sized copies of the site's large photographs.
 *
 * Every big banner or hero photograph has a 900 px copy saved beside it as
 * "<name>@900.webp" (the same picture, resized and re-encoded). A phone never
 * needs more than that for a full-width picture, and it is a fraction of the
 * weight — which on a mobile connection is the difference between the page's
 * main picture arriving in one second or in several.
 *
 * `srcSetFor(src)` finds the copy for an imported image URL and returns a
 * srcset that offers both, so the browser picks by screen: the copy on a
 * phone, the original on a wide screen. With no copy it returns undefined and
 * the <img> behaves exactly as before.
 */
const COPIES = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/**/*@900.webp', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('@900.webp', ''), url]),
);

/** The file's own name, from a dev URL (name.ext) or a built one (name-HASH.ext). */
function stemsOf(src) {
  const file = decodeURIComponent(String(src).split('?')[0].split('/').pop() || '');
  const stem = file.replace(/\.[a-z0-9]+$/i, '');
  /* Built assets carry "-" plus an eight-character hash. */
  return [stem, stem.slice(0, -9)];
}

export function smallCopy(src) {
  if (!src) return null;
  for (const stem of stemsOf(src)) {
    if (COPIES[stem]) return COPIES[stem];
  }
  return null;
}

/**
 * srcset for a large photograph: its 900 px copy and the original.
 * `fullWidth` is the original's pixel width (most of the site's are 1672).
 */
export function srcSetFor(src, fullWidth = 1672) {
  const small = smallCopy(src);
  return small ? `${small} 900w, ${src} ${fullWidth}w` : undefined;
}
