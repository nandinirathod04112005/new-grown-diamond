/* ============================================================
   NEW GROWN DIAMOND — SEO page registry
   ------------------------------------------------------------
   The stable page keys the SEO console and the public pages
   agree on — frontend logic always addresses pages by these
   slugs, never by generated ids. Each entry lists:

     key      → primary key in public.seo_pages
     label    → page name shown in the admin console
     path     → the page's filename (used to detect the current
                page and to build breadcrumb / canonical URLs)
     dynamic  → 'diamond' | 'jewellery' on detail pages whose
                SEO is generated from the loaded product when no
                saved override exists
     schemas  → JSON-LD blocks this page emits. The markup is
                generated in the browser from site constants and
                public product values only — admins never enter
                raw schema code, so nothing executable is stored.
     builtin  → the title/description hard-coded in the page's
                <head>. Mirrors the HTML (the true fallback) so
                the admin console can show honest lengths and
                prefill the editor for unsaved pages.
   ============================================================ */
(function () {
  'use strict';

  window.NGD_SEO_PAGES = [
    { key: 'home', label: 'Homepage', path: 'index.html',
      schemas: ['organization', 'website'],
      builtin: {
        title: 'New Grown Diamond — Lab-grown diamonds & fine jewellery',
        description: 'New Grown Diamond — certified lab-grown diamonds and fine jewellery.'
      } },
    { key: 'diamonds', label: 'Diamond Inventory', path: 'diamonds.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'Diamonds — New Grown Diamond',
        description: 'Browse certified lab-grown diamonds — search, filter and compare our full inventory.'
      } },
    { key: 'diamond_details', label: 'Diamond Details', path: 'diamond-details.html',
      dynamic: 'diamond', schemas: ['breadcrumb', 'product'],
      builtin: {
        title: 'Diamond Details — New Grown Diamond',
        description: 'Full laboratory specification for a certified lab-grown diamond.'
      } },
    { key: 'jewellery', label: 'Jewellery Listing', path: 'jewellery.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'Jewellery — New Grown Diamond',
        description: 'Fine lab-grown diamond jewellery — rings, earrings, pendants, necklaces, bracelets and bangles.'
      } },
    { key: 'jewellery_details', label: 'Jewellery Details', path: 'jewellery-details.html',
      dynamic: 'jewellery', schemas: ['breadcrumb', 'product'],
      builtin: {
        title: 'Jewellery Details — New Grown Diamond',
        description: 'Full specification for a hand-finished lab-grown diamond jewellery piece.'
      } },
    { key: 'manufacturing', label: 'Manufacturing', path: 'manufacturing.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'Manufacturing — New Grown Diamond',
        description: 'The complete lab-grown diamond journey — nine stages from CVD growth to finished jewellery.'
      } },
    { key: 'education', label: 'Education', path: 'education.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'Diamond Education — New Grown Diamond',
        description: 'Diamond education made clear — natural vs lab-grown, CVD vs HPHT, the 4Cs, shapes, certification, how to read a report, and jewellery care.'
      } },
    { key: 'about', label: 'About', path: 'about.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'About — New Grown Diamond',
        description: 'About New Grown Diamond — our story, mission and vision, the technology and craft behind every stone, and the responsible journey from seed to brilliance.'
      } },
    { key: 'contact', label: 'Contact', path: 'contact.html',
      schemas: ['breadcrumb'],
      builtin: {
        title: 'Contact — New Grown Diamond',
        description: 'Contact New Grown Diamond — send an enquiry about certified lab-grown diamonds, fine jewellery, certification or partnerships.'
      } }
  ];

  window.NGD_SEO_SCHEMA_LABELS = {
    organization: 'Organization',
    website: 'WebSite',
    breadcrumb: 'Breadcrumb',
    product: 'Product'
  };
})();
