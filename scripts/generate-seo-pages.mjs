import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pageSchemas, PRIVATE_ROUTES, PUBLIC_ROUTES, seoForPath, SITE_NAME, SITE_URL } from '../src/config/seo.js';
import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, localePath } from '../src/i18n/locales.js';

const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function render(path, locale = DEFAULT_LOCALE) {
  const seo = seoForPath(path);
  const meta = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
  const selfUrl = `${SITE_URL}${localePath(path === '/' ? '/' : path, locale)}`;

  /*
   * hreflang, written into the SHELL rather than left to the client.
   *
   * A crawler that does not run JavaScript — and several that matter still do
   * not — sees only this file. If the alternates were added by React on mount,
   * those crawlers would never learn the other two languages exist, which is
   * the entire purpose of prefixing the URLs. Every version links to all three
   * including itself, because an incomplete set is commonly ignored outright.
   */
  const alternates = [
    ...LOCALE_CODES.map((code) => `<link rel="alternate" hreflang="${LOCALES[code].hreflang}" href="${SITE_URL}${localePath(path === '/' ? '/' : path, code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${path === '/' ? '/' : path}">`,
  ].join('');
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(seo.description)}">`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${seo.robots}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(seo.title)}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(seo.description)}">`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(seo.title)}">`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(seo.description)}">`)
    // Rewritten rather than left to the template, so a per-route override in
    // SEO_BY_ROUTE reaches the prerendered shell too.
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(seo.image)}">`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(seo.image)}">`);

  if (seo.canonical) {
    html = html
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${selfUrl}">${alternates}`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${selfUrl}"><meta property="og:locale" content="${meta.hreflang.replace('-', '_')}">`);
  } else {
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, '').replace(/\s*<meta property="og:url"[^>]*>/, '');
  }

  const jsonLd = pageSchemas(path).map((schema) =>
    `<script type="application/ld+json" data-ngd-schema>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
  ).join('');
  html = html.replace('</head>', `${jsonLd}</head>`);
  /* The template ships <html lang="en">; each shell must declare its own. */
  const withLang = (html) => html
    .replace(/<html([^>]*)\slang="[^"]*"/i, `<html$1 lang="${meta.htmlLang}"`)
    .replace(/<html(?![^>]*\slang=)/i, `<html lang="${meta.htmlLang}"`);

  const fallback = `<noscript><main><h1>${escapeHtml(seo.title.split(' | ')[0])}</h1><p>${escapeHtml(seo.description)}</p><p><a href="/">${SITE_NAME}</a></p></main></noscript>`;
  return withLang(html.replace('<div id="root"></div>', `<div id="root"></div>${fallback}`));
}

/*
 * One shell per route PER LANGUAGE.
 *
 * English keeps its existing addresses; Hindi and Gujarati are written under
 * /hi/ and /gu/. Three languages across the same route list, so a crawler
 * arriving at /gu/diamonds gets a real document with the right lang, the right
 * canonical and the right alternates — not an English shell that only becomes
 * Gujarati once JavaScript runs.
 */
for (const locale of LOCALE_CODES) {
  const prefix = LOCALES[locale].prefix;
  for (const path of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES]) {
    const urlPath = localePath(path === '/' ? '/' : path, locale);
    const directory = urlPath === '/' ? dist : new URL(`.${urlPath}/`, dist);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('index.html', directory), render(path, locale));
  }
  if (prefix) {
    /* The language root itself — /hi and /gu — which is the homepage. */
    const dir = new URL(`./${prefix}/`, dist);
    await mkdir(dir, { recursive: true });
    await writeFile(new URL('index.html', dir), render('/', locale));
  }
}

const adminDirectory = new URL('./admin/', dist);
await mkdir(adminDirectory, { recursive: true });
await writeFile(new URL('index.html', adminDirectory), render('/admin'));
await writeFile(new URL('404.html', dist), render('/404'));

/*
 * The sitemap lists all three languages, and each entry declares its
 * alternates inline. That is the form Google documents for multilingual sites,
 * and it is more reliable than the header alone because it survives a crawler
 * that reaches the URL without ever fetching the page.
 */
const sitemapEntries = LOCALE_CODES.flatMap((locale) => PUBLIC_ROUTES.map((path) => {
  const loc = `${SITE_URL}${localePath(path === '/' ? '/' : path, locale)}`;
  const links = LOCALE_CODES
    .map((code) => `    <xhtml:link rel="alternate" hreflang="${LOCALES[code].hreflang}" href="${SITE_URL}${localePath(path === '/' ? '/' : path, code)}"/>`)
    .join('\n');
  return `  <url>\n    <loc>${loc}</loc>\n${links}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path === '/' ? '/' : path}"/>\n  </url>`;
}));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join('\n')}\n</urlset>\n`;
await writeFile(new URL('sitemap.xml', dist), sitemap);

console.log(`SEO shells: ${PUBLIC_ROUTES.length} public routes x ${LOCALE_CODES.length} languages (${LOCALE_CODES.join(', ')}), plus private noindex routes. Sitemap: ${sitemapEntries.length} urls.`);
