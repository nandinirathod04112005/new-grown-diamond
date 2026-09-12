import { useState, useSyncExternalStore } from 'react';

import {
  applyIntroOverride,
  getSiteContent,
  getSiteSettings,
  subscribeSiteContent,
} from '@/lib/siteContentStore.js';

/**
 * What the Control Centre has published, read on the storefront.
 *
 * All three hooks read one store (lib/siteContentStore.js): values saved in
 * this browser on an earlier visit are there on the first render, one request
 * after idle revalidates them, and the built-in values stand whenever nothing
 * is saved or the request fails. None of them ever waits on the network.
 */

/**
 * The enquiry desk, WhatsApp number, the four offices and the social links —
 * saved values over the built-in ones, field by field.
 *
 * Live: a component re-renders when a revalidation brings a change. Every
 * place that shows these sits below the fold (footer, the contact directory,
 * the homepage's locations), so a late correction never moves the first
 * screen — and a stale phone number is the one thing worse than a repaint.
 */
export function useSiteSettings() {
  return useSyncExternalStore(subscribeSiteContent, getSiteSettings, getSiteSettings);
}

const getAnnouncement = () => getSiteContent().announcement;

/** The published announcement, or null. Expiry and dismissal are the bar's. */
export function useSiteAnnouncement() {
  return useSyncExternalStore(subscribeSiteContent, getAnnouncement, getAnnouncement);
}

const getIntros = () => getSiteContent().intros;

/**
 * An editorial page's eyebrow / title / intro with any published override
 * applied. `page` is the page's own copy, already in the visitor's language
 * (siteContent.i18n.js localizePage).
 *
 * HELD FOR THE LIFE OF THE ROUTE. These words are the hero — the first thing
 * on screen — so an override that arrives after the page has painted is not
 * swapped in under the reader: that would be a layout shift above the fold.
 * What the store holds when the route is entered (the cache, for a returning
 * visitor) is what the page shows; anything newer is shown the next time the
 * page is opened.
 */
export function usePageIntro(path, page, locale) {
  const intros = useSyncExternalStore(subscribeSiteContent, getIntros, getIntros);
  const [held, setHeld] = useState(() => ({ path, intro: intros[path] ?? null }));
  let { intro } = held;
  if (held.path !== path) {
    /* A new route through the same component: take what is known now. */
    intro = intros[path] ?? null;
    setHeld({ path, intro });
  }
  return applyIntroOverride(page, intro, locale);
}
