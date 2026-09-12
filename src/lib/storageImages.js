/*
 * Resized copies of the photographs held in Supabase Storage.
 *
 * Stone photographs go up as they come off a camera or phone: 3024 x 4032
 * JPEGs of two or three megabytes, and one 8334 x 7076 PNG. A card draws them
 * about 350 px wide, so a phone was downloading and decoding pixels it could
 * never show: 6.6 MB for the three cards on the inventory page, with the cards
 * grey until each one arrived.
 *
 * Storage serves any public image resized from /storage/v1/render/image/…,
 * the same path with `object` swapped for `render/image`, and as WebP to a
 * browser that accepts it. The 2.73 MB photograph above is 28 kB at 480 px.
 * Anything that is not a public Storage address (the house artwork, a local
 * preview) is passed through untouched. Pure string work, so importing this
 * does not pull the Supabase client into a page.
 */
const OBJECT = '/storage/v1/object/public/';
const RENDER = '/storage/v1/render/image/public/';

const isStored = (url) => typeof url === 'string' && url.includes(OBJECT);

/** The photograph at `width` pixels wide, height following its own ratio. */
export function resizedImage(url, width, quality = 70) {
  if (!isStored(url)) return url;
  return `${url.replace(OBJECT, RENDER)}${url.includes('?') ? '&' : '?'}width=${width}&quality=${quality}`;
}

/** A `srcset` of resized copies, or undefined for anything not in Storage. */
export function resizedSrcSet(url, widths = [480, 800, 1200]) {
  if (!isStored(url)) return undefined;
  return widths.map((w) => `${resizedImage(url, w)} ${w}w`).join(', ');
}
