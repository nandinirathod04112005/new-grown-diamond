import { useLayoutEffect } from 'react';
import {
  OG_IMAGE_ALT, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, pageSchemas, seoForPath, SITE_NAME,
} from '@/config/seo.js';

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.appendChild(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

export default function SeoHead({ path }) {
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
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (seo.canonical) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = seo.canonical;
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonical });
    } else { canonical?.remove(); document.head.querySelector('meta[property="og:url"]')?.remove(); }
    document.head.querySelectorAll('script[data-ngd-schema]').forEach((node) => node.remove());
    pageSchemas(path).forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json'; script.dataset.ngdSchema = '';
      script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    });
  }, [path]);
  return null;
}
