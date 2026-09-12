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
 * RE-VERIFIED 11 September 2026: orders and order_items answer "permission
 * denied" to an anonymous read (42501), not "not found", so migration 0005
 * is applied and Orders & Sales is built on them. Categories, collections and
 * settings are still absent; those modules are built on existing tables
 * instead (jewellery.category and site_content), with no migration.
 *
 * Verified present : diamonds, jewellery, profiles, enquiries, blogs, quotes,
 *                    holds, inspections, favourites, media, audit_log,
 *                    notifications, site_content, homepage_sections,
 *                    seo_settings, analytics_events, orders, order_items
 * Verified absent  : categories, collections, activity_log, page_views,
 *                    settings, saved_searches
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
    tables: ['diamonds', 'jewellery', 'profiles', 'enquiries', 'quotes', 'holds', 'inspections', 'favourites', 'orders', 'order_items', 'analytics_events'],
    note:
      'Stock, jewellery, enquiries by day and kind, customers and favourites, '
      + 'open work, orders and revenue by currency, and website views — all read '
      + 'live; each panel fails on its own.',
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
    state: 'ready',
    tables: ['jewellery', 'site_content', 'diamonds'],
    note:
      'Categories are read from jewellery.category; rename and merge rewrite '
      + 'that field on every matching piece. Collections are site_content rows '
      + '(page = collections) with an ordered member list in draft. Nothing on '
      + 'the storefront shows collections yet.',
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
    state: 'ready',
    tables: ['orders', 'order_items'],
    note:
      'Record sales, move them through confirmed → invoiced → paid → shipped → '
      + 'delivered or cancelled, and see revenue per currency. Uses orders and '
      + 'order_items (migration 0005) under their admin policies; creates and '
      + 'status changes are audit-logged.',
  },
  {
    key: 'content',
    label: 'Website Content',
    href: '/admin/content',
    icon: 'doc',
    state: 'ready',
    tables: ['site_content'],
    note:
      'Announcement bar (en/hi/gu, optional link and end date) and the '
      + 'introductions of the six editorial pages, with draft, preview, publish '
      + 'and revert to built-in. Rows under page = content; page = feedback '
      + 'remains the client feedback.',
  },
  {
    key: 'journal',
    label: 'Journal',
    href: '/admin/journal',
    icon: 'pen',
    state: 'ready',
    tables: ['blogs'],
    note:
      'Write, publish, take down and delete journal posts, with covers in '
      + 'site-media. public.blogs and its admin-write policy were read back from '
      + 'the live project on 11 September 2026.',
  },
  {
    /*
     * Built on tables that already exist, with their existing policies:
     * feedback arrives as enquiries (guest and customer insert), and approved
     * feedback is published as site_content rows under page = 'feedback'
     * (public read of published rows, admin write). No feedback table.
     */
    key: 'feedback',
    label: 'Feedback',
    href: '/admin/feedback',
    icon: 'message',
    state: 'ready',
    tables: ['enquiries', 'site_content'],
    note:
      'Approve or reject client feedback. Approved feedback is published on the '
      + 'homepage, journal and feedback page as site_content rows (page = feedback).',
  },
  {
    key: 'media',
    label: 'Media Library',
    href: '/admin/media',
    icon: 'image',
    state: 'ready',
    tables: ['media'],
    note:
      'Browsing, upload with progress, and a live in-use check against '
      + 'diamonds.image_path, blogs.cover_path and collection covers. Alt text '
      + 'and captions are saved to the media table, keyed by bucket and path. '
      + 'The storefront does not read them yet.',
  },
  {
    key: 'homepage',
    label: 'Homepage Manager',
    href: '/admin/homepage',
    icon: 'home',
    state: 'ready',
    tables: ['homepage_sections'],
    note:
      'Reorder, show and hide the homepage sections after the hero, which stays '
      + 'first. The site reads the saved layout after the page loads, so '
      + 'visitors get it on their next page load.',
  },
  {
    key: 'seo',
    label: 'SEO Manager',
    href: '/admin/seo',
    icon: 'search',
    state: 'ready',
    tables: ['seo_settings'],
    note:
      'Title, description, share image, noindex and canonical for each page, '
      + 'over the built-in values in src/config/seo.js, with drafts. Published '
      + 'changes show on the live site within minutes; titles, descriptions and '
      + 'share images reach the prerendered English pages at the next deploy. '
      + 'Noindex and canonical apply in the browser only.',
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
    state: 'ready',
    tables: ['analytics_events'],
    note:
      'First-party, anonymous visit counting: page views (with language prefix), '
      + 'device size class, the referring site on a visit’s first page, and the '
      + 'contact-form funnel. Sent only from newgrowndiamond.com (or '
      + 'VITE_ANALYTICS_HOSTS), never from /admin or when Do Not Track / Global '
      + 'Privacy Control is on. No cookies, IP or account id. Empty until the '
      + 'site runs on that domain.',
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
    state: 'ready',
    tables: ['notifications', 'enquiries', 'quotes', 'holds', 'inspections', 'profiles', 'orders'],
    note:
      'One inbox of new enquiries, feedback, article submissions, account '
      + 'deletion requests, quotes, holds, inspections, sign-ups and orders, read '
      + 'live from those tables. Read markers are stored in notifications '
      + '(kind = read) and are shared by all admins.',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: 'cog',
    state: 'ready',
    tables: ['site_content'],
    note:
      'Enquiry desk, WhatsApp number, the four offices and social links, saved '
      + 'as one published site_content row (page = settings, section = '
      + 'business). No settings table. Read by the storefront after first paint '
      + 'and cached per visitor.',
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
