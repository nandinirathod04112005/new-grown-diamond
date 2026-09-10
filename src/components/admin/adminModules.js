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
 * RE-VERIFIED 10 September 2026, the same way. Migrations 0001 and 0002 have
 * been applied to the live project since this file was first written, so seven
 * tables that were absent now exist. Leaving the old states in place had a
 * cost that is worth naming: the console told an operator "no migration has
 * been applied" about tables that were already there, which reads as the
 * backend being broken. A stale claim in a file whose whole purpose is honesty
 * is worse than no claim at all.
 *
 * Verified present : diamonds, jewellery, profiles, enquiries, blogs, quotes,
 *                    holds, inspections, favourites, media, audit_log,
 *                    notifications, site_content, homepage_sections,
 *                    seo_settings, analytics_events
 * Verified absent  : orders, categories, collections, activity_log,
 *                    page_views, settings, saved_searches
 *
 * A module in 'setup' renders its requirement rather than a dashboard full of
 * plausible zeros. A zero and a missing table look the same on screen and mean
 * opposite things, which is the whole reason this file exists. A module in
 * 'partial' says the opposite thing just as plainly: the table is there, and
 * what is missing is the screen.
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
    state: 'partial',
    tables: ['site_content'],
    note:
      'The site_content table exists (migration 0001 is applied). The public '
      + 'pages still render their copy from src/pages/siteContent.js at build '
      + 'time, so an editor here would change a row that nothing reads. The '
      + 'remaining work is the read path on the storefront, not the table.',
  },
  {
    key: 'media',
    label: 'Media Library',
    href: '/admin/media',
    icon: 'image',
    state: 'ready',
    tables: [],
    note:
      'Browsing, upload with progress, and a live in-use check against '
      + 'diamonds.image_path and blogs.cover_path all work today. The media '
      + 'table now exists (migration 0001 is applied), so alt text and captions '
      + 'have somewhere to live; this screen does not write them yet.',
  },
  {
    key: 'homepage',
    label: 'Homepage Manager',
    href: '/admin/homepage',
    icon: 'home',
    state: 'partial',
    tables: ['homepage_sections'],
    note:
      'The homepage_sections table exists (migration 0001 is applied). Section '
      + 'order and visibility are still compiled into the bundle, so the table '
      + 'is not read yet. Featured stock is the part that already works from '
      + 'data — diamonds.featured and jewellery.featured — and is editable from '
      + 'those modules today.',
  },
  {
    key: 'seo',
    label: 'SEO Manager',
    href: '/admin/seo',
    icon: 'search',
    state: 'partial',
    tables: ['seo_settings'],
    note:
      'The seo_settings table exists (migration 0001 is applied). Titles, '
      + 'descriptions and canonicals are still generated at build time by '
      + 'src/config/seo.js and scripts/generate-seo-pages.mjs, and the '
      + 'prerendered shells are written by that script — so editing a row here '
      + 'would not change what a crawler sees until the storefront reads it.',
  },
  {
    key: 'monitoring',
    label: 'Website Monitoring',
    href: '/admin/monitoring',
    icon: 'chart',
    state: 'ready',
    tables: ['diamonds', 'jewellery', 'holds', 'inspections'],
  },
  {
    key: 'analytics',
    label: 'Website Analytics',
    href: '/admin/analytics',
    icon: 'chart',
    state: 'partial',
    tables: ['analytics_events'],
    note:
      'The analytics_events table exists (migration 0002 is applied) and is '
      + 'ready to receive page views. Nothing sends them: the site carries no '
      + 'analytics tag and no first-party event call, so the table is empty and '
      + 'every figure would be zero. Switching collection on is a decision '
      + 'about visitor data, not a missing table, so it is left to be made '
      + 'deliberately rather than turned on by a screen.',
  },
  {
    key: 'audit',
    label: 'Activity & Audit Log',
    href: '/admin/audit',
    icon: 'list',
    state: 'ready',
    tables: ['audit_log'],
    note:
      'Live. Every publish, edit, archive and restore this console makes is '
      + 'recorded with who made it and which columns moved. The table is '
      + 'append-only by policy — no update, no delete, for anyone, including an '
      + 'administrator — so the log cannot be corrected after the fact. Actions '
      + 'taken before it was switched on were not recorded and are not '
      + 'reconstructed.',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/admin/notifications',
    icon: 'bell',
    state: 'partial',
    tables: ['notifications'],
    note:
      'The notifications table exists (migration 0002 is applied), with admin '
      + 'read, insert, update and delete policies. Nothing writes to it yet: '
      + 'arrivals are read live from the queue tables, which is why the queues '
      + 'are accurate and this list is empty.',
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
