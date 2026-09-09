/**
 * The eighteen sidebar modules, and an honest statement of what each one can
 * actually do against THIS database.
 *
 * Every entry carries a `state`:
 *
 *   'ready'   — the tables it needs exist and have been verified.
 *   'partial' — the table exists, but no client code reads it yet.
 *   'setup'   — the table does not exist. The module is listed, disabled, and
 *               says which table a migration would have to add.
 *
 * The states were established by querying the live project, not by reading
 * code and not by assumption: an existing table answers a select with 200 and
 * an empty array under RLS, a missing one answers 404 with "Could not find the
 * table in the schema cache". A deliberately fake name was probed alongside as
 * a control, and returned 404 as expected.
 *
 * Verified present : diamonds, jewellery, profiles, enquiries, blogs, quotes,
 *                    holds, inspections, favourites
 * Verified absent  : orders, categories, collections, media, audit_log,
 *                    activity_log, notifications, site_content,
 *                    homepage_sections, seo_settings, analytics_events,
 *                    page_views, settings
 *
 * A module in 'setup' renders its requirement rather than a dashboard full of
 * plausible zeros. A zero and a missing table look the same on screen and mean
 * opposite things, which is the whole reason this file exists.
 */

export const MODULES = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/admin',
    icon: 'grid',
    state: 'ready',
    tables: ['diamonds', 'jewellery', 'profiles', 'enquiries', 'quotes', 'holds', 'inspections'],
  },
  {
    key: 'diamonds',
    label: 'Diamonds',
    href: '/admin/diamonds',
    icon: 'gem',
    state: 'ready',
    tables: ['diamonds'],
  },
  {
    key: 'jewellery',
    label: 'Jewellery',
    href: '/admin/jewellery',
    icon: 'ring',
    state: 'ready',
    tables: ['jewellery'],
    /* Listed so the gap is visible from the module registry too, not only
       from the screen: this table has no image column of any kind. */
    note:
      'Publish, feature and archive are live. The table has no image column, '
      + 'so jewellery has no photography until a migration adds one.',
  },
  {
    key: 'catalogue',
    label: 'Categories & Collections',
    href: '/admin/catalogue',
    icon: 'layers',
    state: 'setup',
    missing: ['categories', 'collections'],
    note:
      'jewellery.category exists as a free-text column, so categories can be '
      + 'listed from the values in use. A managed taxonomy — renaming a '
      + 'category everywhere, ordering it, giving it a description — needs '
      + 'categories and collections tables.',
  },
  {
    key: 'customers',
    label: 'Customers',
    href: '/admin/customers',
    icon: 'users',
    state: 'ready',
    tables: ['profiles', 'favourites'],
  },
  {
    key: 'enquiries',
    label: 'Enquiries',
    href: '/admin/enquiries',
    icon: 'inbox',
    state: 'ready',
    tables: ['enquiries'],
  },
  { key: 'quotes', label: 'Quotes', href: '/admin/quotes', icon: 'file', state: 'ready', tables: ['quotes'] },
  { key: 'holds', label: 'Holds', href: '/admin/holds', icon: 'lock', state: 'ready', tables: ['holds'] },
  {
    key: 'inspections',
    label: 'Inspections',
    href: '/admin/inspections',
    icon: 'eye',
    state: 'ready',
    tables: ['inspections'],
  },
  {
    key: 'orders',
    label: 'Orders & Sales',
    href: '/admin/orders',
    icon: 'cart',
    state: 'setup',
    missing: ['orders'],
    note:
      'There is no orders or sales table. diamonds.availability records that a '
      + 'stone is sold, but not to whom, when, or for how much — so a sales '
      + 'module here would be a guess dressed as a report.',
  },
  {
    key: 'content',
    label: 'Website Content',
    href: '/admin/content',
    icon: 'doc',
    state: 'setup',
    missing: ['site_content'],
    note:
      'Page copy currently lives in src/pages/siteContent.js and is compiled '
      + 'into the bundle. Editing it from here requires a site_content table '
      + 'plus a read path on the public pages.',
  },
  {
    key: 'media',
    label: 'Media Library',
    href: '/admin/media',
    icon: 'image',
    state: 'partial',
    tables: [],
    note:
      'Storage buckets diamond-images and blog-images are real and already in '
      + 'use. Browsing them is possible today; alt text, usage tracking and '
      + '"where is this file used" need a media table to record it.',
  },
  {
    key: 'homepage',
    label: 'Homepage Manager',
    href: '/admin/homepage',
    icon: 'home',
    state: 'setup',
    missing: ['homepage_sections'],
    note:
      'Section order and visibility are currently code. Featured stock is the '
      + 'one part that already works from data — diamonds.featured and '
      + 'jewellery.featured — and is editable from those modules.',
  },
  {
    key: 'seo',
    label: 'SEO Manager',
    href: '/admin/seo',
    icon: 'search',
    state: 'setup',
    missing: ['seo_settings'],
    note:
      'Titles, descriptions and canonicals are generated at build time by '
      + 'src/config/seo.js and scripts/generate-seo-pages.mjs. Editing them '
      + 'live needs a seo_settings table read at runtime.',
  },
  {
    key: 'analytics',
    label: 'Website Analytics',
    href: '/admin/analytics',
    icon: 'chart',
    state: 'setup',
    missing: ['analytics_events', 'page_views'],
    note:
      'No analytics table and no third-party tag. Traffic figures cannot be '
      + 'shown, and will not be simulated. A first-party, privacy-safe events '
      + 'table is drafted as an optional migration in phase 5.',
  },
  {
    key: 'audit',
    label: 'Activity & Audit Log',
    href: '/admin/audit',
    icon: 'list',
    state: 'setup',
    missing: ['audit_log'],
    note:
      'Nothing records who changed what. Overview shows recently ADDED stock, '
      + 'which is derived from created_at and is labelled as such — it is not '
      + 'an audit trail and is not presented as one.',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/admin/notifications',
    icon: 'bell',
    state: 'setup',
    missing: ['notifications'],
    note:
      'Live arrivals can be surfaced through Supabase Realtime on the existing '
      + 'queue tables without any new table. Persisting them — read state, '
      + 'dismissal, history — needs notifications.',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: 'cog',
    state: 'setup',
    missing: ['settings'],
    note:
      'Contact details and office addresses are in src/pages/siteContent.js. '
      + 'A settings table would let them be edited without a deploy.',
  },
];

export const READY_MODULES = MODULES.filter((m) => m.state !== 'setup');

export function moduleForPath(path) {
  // Longest match wins, so /admin/diamonds/new resolves to Diamonds rather
  // than to Overview, whose href is a prefix of every admin path.
  return [...MODULES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => path === m.href || path.startsWith(`${m.href}/`)) ?? MODULES[0];
}
