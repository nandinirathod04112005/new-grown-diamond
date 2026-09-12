/* Relative, not '@/': scripts/generate-seo-pages.mjs imports this file in
   plain Node, where the bundler's alias does not exist. */
import { archiveDescription, JOURNAL_ARCHIVE } from '../content/journalPosts.js';

export const SITE_NAME = 'New Grown Diamond';
export const SITE_URL = 'https://newgrowndiamond.com';
export const DEFAULT_DESCRIPTION = 'New Grown Diamond manufactures and supplies CVD and HPHT lab-grown diamonds from Surat, India, for B2B buyers worldwide.';

/*
 * The social card.
 *
 * Lives in `public/` rather than `src/assets/` on purpose: bundled assets get a
 * content hash in their filename that changes whenever the file does, and an
 * og:image URL that moves breaks every link already shared. This one keeps a
 * stable address for ever.
 *
 * JPEG, not WebP — several link scrapers (older Slack, WhatsApp, some LinkedIn
 * paths) still refuse WebP and fall back to no image at all, which is the exact
 * failure this is meant to fix. 1200x630 is the ratio every major platform
 * crops toward. The photograph is a real NGD stone.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = 'A New Grown Diamond round brilliant laboratory-grown diamond photographed against black.';

/* The journal's archive articles ship with the site, so each gets a real,
   indexable page of its own. Posts written in the editor are loaded at run
   time and are not prerendered here. */
const ARTICLE_ROUTES = JOURNAL_ARCHIVE.map((p) => `/blogs/${p.slug}`);

export const PUBLIC_ROUTES = ['/', '/diamonds', '/jewellery', '/about', '/education', '/price-and-size', '/cvd-vs-natural', '/shapes', '/why-lab-grown', '/faq', '/blogs', '/feedback', '/contact', '/cart', '/wishlist', '/privacy-policy', '/terms-and-conditions', ...ARTICLE_ROUTES];
export const PRIVATE_ROUTES = ['/login', '/register', '/account', '/forgot-password', '/reset-password'];

export const SEO_BY_ROUTE = {
  '/': { title: 'Lab Grown Diamond Manufacturer | New Grown Diamond', description: DEFAULT_DESCRIPTION },
  '/diamonds': { title: 'Loose Lab Grown Diamonds | CVD & HPHT Inventory', description: 'Explore loose CVD and HPHT lab-grown diamond inventory with grading details, certificates, videos and direct support from our Surat diamond desk.' },
  '/jewellery': { title: 'Custom Lab Grown Diamond Jewellery | New Grown Diamond', description: 'Create custom lab-grown diamond jewellery around a selected, independently graded stone with support from selection through production.' },
  '/about': { title: 'Lab Grown Diamond Manufacturer in Surat | About NGD', description: 'Meet New Grown Diamond, a Surat-based CVD and HPHT lab-grown diamond manufacturer, wholesaler and supplier serving clients worldwide.' },
  '/education': { title: 'Lab Grown Diamond Education | CVD, HPHT & Certification', description: 'Understand CVD and HPHT growth, independent diamond certification, durability and how laboratory-grown diamonds differ from simulants.' },
  '/cvd-vs-natural': { title: 'CVD vs Natural Diamonds | Origin, Properties & Grading', description: 'Compare CVD lab-grown and natural diamonds by composition, formation, physical properties, laboratory identification and grading reports.' },
  '/shapes': { title: 'Lab Grown Diamond Shapes Guide | New Grown Diamond', description: 'Compare round, oval, emerald, radiant, cushion, pear, marquise, princess, heart and other lab-grown diamond shapes.' },
  '/price-and-size': { title: 'Lab Grown Diamond Price & Size Guide | Carat to MM', description: 'How carat weight converts to millimetre size by shape, why per-carat rates step at round weights, and what moves a lab-grown diamond quote.' },
  '/why-lab-grown': { title: 'Why Choose Lab Grown Diamonds? | New Grown Diamond', description: 'Learn how measurable quality, independent certification, inspection support and direct supply inform a lab-grown diamond purchase.' },
  '/faq': { title: 'Lab Grown Diamond FAQ | CVD, Certification & Durability', description: 'Clear answers about CVD diamond growth, lab-grown diamond certification, durability, simulants and how diamond origin is verified.' },
  '/blogs': { title: 'Lab Grown Diamond Journal | New Grown Diamond', description: 'Read notes from Surat about lab-grown diamond manufacturing, cutting, grading, certification and questions from the diamond trade.' },
  '/feedback': { title: 'Client Feedback | New Grown Diamond', description: 'Read reviewed feedback from New Grown Diamond clients, and leave your own about our lab-grown diamonds, jewellery, service or website.' },
  '/cart': { title: 'Your Diamond Selection | New Grown Diamond', description: 'Review the lab-grown diamonds in your selection and contact the New Grown Diamond team for availability and pricing.' },
  '/wishlist': { title: 'Saved Lab Grown Diamonds | New Grown Diamond', description: 'Review your saved lab-grown diamonds and move available stones into your selection.' },
  ...Object.fromEntries(JOURNAL_ARCHIVE.map((p) => [`/blogs/${p.slug}`, {
    title: `${p.title.replace(/[?!]$/, '')} | NGD Journal`,
    description: archiveDescription(p),
    article: { headline: p.title },
  }])),
  '/terms-and-conditions': { title: 'Terms & Conditions | New Grown Diamond', description: 'The terms that govern use of the New Grown Diamond website, pricing, cancellations and returns, and the laws that apply.' },
  '/privacy-policy': { title: 'Privacy Policy | New Grown Diamond', description: 'How New Grown Diamond collects, uses, shares and protects your personal data, and how to contact us about your privacy.' },
  '/contact': { title: 'Contact New Grown Diamond | Surat Diamond Supplier', description: 'Contact New Grown Diamond in Surat, Mumbai, New York or Hong Kong for loose lab-grown diamonds, wholesale supply and custom jewellery enquiries.' },
};

export function normalizePath(pathname = '/') {
  const clean = String(pathname).split('?')[0].split('#')[0].replace(/\/+$/, '');
  return clean || '/';
}

export function seoForPath(pathname) {
  const path = normalizePath(pathname);
  const page = SEO_BY_ROUTE[path];
  if (page) return { ...page, path, canonical: `${SITE_URL}${path === '/' ? '/' : path}`, robots: 'index,follow', image: page.image ?? DEFAULT_OG_IMAGE };
  const privateRoute = PRIVATE_ROUTES.includes(path) || path.startsWith('/admin');
  return {
    title: privateRoute ? `Private page | ${SITE_NAME}` : `Page not found | ${SITE_NAME}`,
    description: privateRoute ? 'Private New Grown Diamond account page.' : 'The requested page could not be found.',
    path, canonical: null, robots: 'noindex,nofollow', image: DEFAULT_OG_IMAGE,
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME, url: `${SITE_URL}/`, email: 'newgrowndiamonds@gmail.com', telephone: '+91-99139-99794',
    description: DEFAULT_DESCRIPTION,
    address: { '@type': 'PostalAddress', streetAddress: 'SY No. 310, 2nd Floor, Chinaiwala Complex, near Mehta Petrol Pump, Amroli Road, Katargam', addressLocality: 'Surat', addressRegion: 'Gujarat', postalCode: '395004', addressCountry: 'IN' },
    /* Two points, because they are answered for different things. Both are
       real published numbers; nothing here is inferred. */
    contactPoint: [
      { '@type': 'ContactPoint', telephone: '+91-9913999794', contactType: 'sales', areaServed: 'Worldwide', availableLanguage: ['en', 'hi', 'gu'] },
      { '@type': 'ContactPoint', telephone: '+91-99139-99794', email: 'newgrowndiamonds@gmail.com', contactType: 'sales', areaServed: 'Worldwide' },
    ],
  };
}

export function pageSchemas(pathname) {
  const seo = seoForPath(pathname);
  if (seo.robots.startsWith('noindex')) return [];
  const schemas = [organizationSchema(),
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, publisher: { '@id': `${SITE_URL}/#organization` } },
    { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${seo.canonical}#webpage`, url: seo.canonical, name: seo.title, description: seo.description, isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': `${SITE_URL}/#organization` } },
  ];
  if (seo.article) {
    schemas.push({
      '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${seo.canonical}#article`,
      headline: seo.article.headline, description: seo.description, url: seo.canonical,
      mainEntityOfPage: { '@id': `${seo.canonical}#webpage` }, inLanguage: 'en',
      author: { '@id': `${SITE_URL}/#organization` }, publisher: { '@id': `${SITE_URL}/#organization` },
    });
    schemas.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE_URL}/blogs` },
        { '@type': 'ListItem', position: 3, name: seo.article.headline, item: seo.canonical },
      ],
    });
    return schemas;
  }
  if (seo.path !== '/') schemas.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: seo.title.split(' | ')[0], item: seo.canonical },
    ],
  });
  return schemas;
}
