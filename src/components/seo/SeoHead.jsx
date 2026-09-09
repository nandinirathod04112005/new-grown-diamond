import { useLayoutEffect } from 'react';
import {
  OG_IMAGE_ALT, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, pageSchemas, seoForPath, SITE_NAME, SITE_URL,
} from '@/config/seo.js';
import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, localePath } from '@/i18n/locales.js';

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.appendChild(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

export default function SeoHead({ path, locale = DEFAULT_LOCALE }) {
  useLayoutEffect(() => {
    const seo = seoForPath(path);
    document.title = seo.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: seo.description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: seo.robots });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
    /*
     * A card WITH an image, and the large variant to match.
     *
     * `summary` renders a thumbnail beside the text; `summary_large_image` is
     * the full-width card, which is the only sensible choice for a business
     * whose product is entirely visual. Both need the image tag below — without
     * it either card degrades to a bare text link.
     */
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: seo.image });
    upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) });
    upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: OG_IMAGE_ALT });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.image });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: OG_IMAGE_ALT });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
    /*
     * The canonical names THIS language's URL, not English's.
     *
     * seoForPath works on the unprefixed route, so its canonical is always the
     * English address. Left as-is, every Hindi and Gujarati page would declare
     * the English page as its canonical — which tells Google those pages are
     * duplicates that should not be indexed at all, and quietly throws away
     * the entire reason for translating them.
     */
    const selfUrl = `${SITE_URL}${localePath(path === '/' ? '/' : path, locale)}`;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (seo.canonical) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = selfUrl;
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: selfUrl });
      upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: (LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE]).hreflang.replace('-', '_') });
    } else { canonical?.remove(); document.head.querySelector('meta[property="og:url"]')?.remove(); }

    /*
     * hreflang — how the three versions declare each other.
     *
     * Every language links to every language INCLUDING itself; a set of
     * alternates that omits the current page is treated as incomplete and
     * commonly ignored outright. x-default points at English, which is what a
     * search engine should offer someone whose language is none of the three.
     *
     * Only emitted for indexable pages: seo.robots starting with noindex means
     * account and admin routes, and declaring translations of a page nobody
     * may index is noise at best.
     */
    document.head.querySelectorAll('link[rel="alternate"][data-ngd-lang]').forEach((n) => n.remove());
    if (seo.canonical) {
      const add = (hreflang, href) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = href;
        link.setAttribute('data-ngd-lang', '');
        document.head.appendChild(link);
      };
      LOCALE_CODES.forEach((code) => {
        add(LOCALES[code].hreflang, `${SITE_URL}${localePath(path === '/' ? '/' : path, code)}`);
      });
      add('x-default', `${SITE_URL}${path === '/' ? '/' : path}`);
    }
    document.head.querySelectorAll('script[data-ngd-schema]').forEach((node) => node.remove());
    pageSchemas(path).forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json'; script.dataset.ngdSchema = '';
      script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    });
  }, [path, locale]);
  return null;
}
