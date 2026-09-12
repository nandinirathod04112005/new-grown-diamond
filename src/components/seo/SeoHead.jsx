import { useEffect, useLayoutEffect, useState } from 'react';
import {
  OG_IMAGE_ALT, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, pageSchemas, seoForPath, SITE_NAME, SITE_URL,
} from '@/config/seo.js';
import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, localePath } from '@/i18n/locales.js';
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from '@/lib/supabase/env.js';
import {
  afterSeoSettles, initialSeoOverrides, overrideForRoute, patchSchemas,
} from '@/lib/seoOverrides.js';

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.appendChild(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

const removeNode = (selector) => document.head.querySelector(selector)?.remove();

export default function SeoHead({ path, locale = DEFAULT_LOCALE }) {
  /*
   * Published overrides from the SEO Manager (lib/seoOverrides.js).
   *
   * The first render takes what is already here — this browser's cache, or
   * the record the prerendered page was built with — and never waits on the
   * network. The published rows are read once the page has loaded and gone
   * quiet, with a plain fetch rather than the Supabase SDK, and a newer answer
   * replaces an older one. Nothing here moves the page: it is all <head>.
   */
  const [overrides, setOverrides] = useState(() => initialSeoOverrides(SUPABASE_URL));
  useEffect(() => {
    if (!isConfigured) return undefined;
    return afterSeoSettles({ url: SUPABASE_URL, key: SUPABASE_KEY }, (next) => {
      setOverrides((current) => (next.sig === current.sig || next.at < current.at ? current : next));
    });
  }, []);

  useLayoutEffect(() => {
    const builtIn = seoForPath(path);
    /* Public routes only; on /hi and /gu only an override written for that
       exact address. Each field falls back to the built-in one on its own. */
    const override = overrideForRoute(overrides, path, locale);
    const seo = override
      ? {
          ...builtIn,
          title: override.title || builtIn.title,
          description: override.description || builtIn.description,
          image: override.image || builtIn.image,
          robots: override.noindex ? 'noindex,follow' : builtIn.robots,
        }
      : builtIn;
    /* A page the owner took out of search is treated as the private pages
       are: no canonical, no alternates, no structured data. */
    const indexable = Boolean(seo.canonical) && !override?.noindex;
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
    if (override?.image) {
      /* The size and alt text describe the house photograph. A replacement's
         are not known, and a wrong description is worse than none. */
      ['meta[property="og:image:width"]', 'meta[property="og:image:height"]', 'meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]'].forEach(removeNode);
    } else {
      upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) });
      upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) });
      upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: OG_IMAGE_ALT });
    }
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.image });
    if (!override?.image) upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: OG_IMAGE_ALT });
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
    /* A custom canonical is opt-in per route in the SEO Manager, and only ever
       an address on this site (seoOverrides.js refuses anything else). */
    const canonicalUrl = override?.canonical || selfUrl;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (indexable) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = canonicalUrl;
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
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
    if (indexable) {
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
    const schemas = indexable ? pageSchemas(path) : [];
    (override ? patchSchemas(schemas, { title: seo.title, description: seo.description }) : schemas).forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json'; script.dataset.ngdSchema = '';
      script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    });
  }, [path, locale, overrides]);
  return null;
}
