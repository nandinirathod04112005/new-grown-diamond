import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pageSchemas, PRIVATE_ROUTES, PUBLIC_ROUTES, seoForPath, SITE_NAME, SITE_URL } from '../src/config/seo.js';
import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, localePath } from '../src/i18n/locales.js';
import {
  applicableOverrides, fetchPublishedSeoRows, isEnglishRoute, isSecretKey, patchSchemas, shellRecordTag,
} from '../src/lib/seoOverrides.js';

const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/*
 * Published overrides from the SEO Manager (public.seo_settings), OPTIONAL.
 *
 * The credentials are found the way the Vite build finds them — Vite's own
 * loadEnv over .env, .env.local, .env.production and .env.production.local,
 * with variables already in the environment winning, and the same VITE_ /
 * NEXT_PUBLIC_ names src/lib/supabase/env.js reads. Only the publishable key:
 * a secret or service_role key is refused, never sent.
 *
 * Offline, unconfigured, table missing, refused: the shells are written with
 * the built-in values exactly as before, and nothing is printed for it.
 *
 * Applied to the ENGLISH shells only, and only title, description and share
 * image. noindex and a custom canonical are applied in the browser by SeoHead:
 * scripts/validate-seo.mjs requires every public shell to be index,follow with
 * its own address as canonical, and that check is not relaxed here. A title or
 * description that would repeat another page's is left out (with a warning),
 * so an override can never make that check fail either.
 */
async function publishedOverrides() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let env = process.env;
  try {
    const { loadEnv } = await import('vite');
    env = loadEnv('production', root, ['VITE_', 'NEXT_PUBLIC_']);
  } catch {
    /* Vite not importable: the environment alone. */
  }
  const pick = (...names) => names.map((n) => String(env[n] ?? '').trim()).find(Boolean) ?? '';
  const url = pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
  const key = pick('VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const configured = url.startsWith('https://') && !url.includes('YOUR_') && key.length > 20 && !key.includes('YOUR_');
  if (!configured) return new Map();
  if (isSecretKey(key)) {
    console.warn('SEO overrides: not read. The Supabase key in the environment is a secret or service_role key; only the publishable key may be used.');
    return new Map();
  }
  try {
    const rows = (await fetchPublishedSeoRows({ url, key, timeoutMs: 8000 })).filter((r) => isEnglishRoute(r.route));
    const overrides = applicableOverrides(rows, url, (message) => console.warn(`SEO override: ${message}`));
    const rowByRoute = new Map(rows.map((r) => [r.route, r]));
    /* The record the shell carries for SeoHead holds what the shell applied:
       a repeated title or description left out here is left out there too. */
    return new Map([...overrides].map(([route, o]) => [route, {
      ...o,
      row: { ...rowByRoute.get(route), title: o.title || null, description: o.description || null },
    }]));
  } catch {
    return new Map();
  }
}

const OVERRIDES = await publishedOverrides();
const BUILT_AT = Date.now();

function render(path, locale = DEFAULT_LOCALE, override = null) {
  const builtIn = seoForPath(path);
  const seo = override
    ? { ...builtIn, title: override.title || builtIn.title, description: override.description || builtIn.description, image: override.image || builtIn.image }
    : builtIn;
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
  /* Replacements are functions, not strings: an override is text an editor
     typed, and "$&" or "$1" in a replacement STRING would be expanded. */
  let html = template
    .replace(/<title>.*?<\/title>/s, () => `<title>${escapeHtml(seo.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escapeHtml(seo.description)}">`)
    .replace(/<meta name="robots"[^>]*>/, () => `<meta name="robots" content="${seo.robots}">`)
    .replace(/<meta property="og:title"[^>]*>/, () => `<meta property="og:title" content="${escapeHtml(seo.title)}">`)
    .replace(/<meta property="og:description"[^>]*>/, () => `<meta property="og:description" content="${escapeHtml(seo.description)}">`)
    .replace(/<meta name="twitter:title"[^>]*>/, () => `<meta name="twitter:title" content="${escapeHtml(seo.title)}">`)
    .replace(/<meta name="twitter:description"[^>]*>/, () => `<meta name="twitter:description" content="${escapeHtml(seo.description)}">`)
    // Rewritten rather than left to the template, so a per-route override in
    // SEO_BY_ROUTE reaches the prerendered shell too.
    .replace(/<meta property="og:image"[^>]*>/, () => `<meta property="og:image" content="${escapeHtml(seo.image)}">`)
    .replace(/<meta name="twitter:image"[^>]*>/, () => `<meta name="twitter:image" content="${escapeHtml(seo.image)}">`);
  if (override?.image) {
    /* Size and alt text describe the house photograph, not a replacement. */
    html = html
      .replace(/\s*<meta property="og:image:(?:width|height|alt)"[^>]*>/g, '')
      .replace(/\s*<meta name="twitter:image:alt"[^>]*>/, '');
  }

  if (seo.canonical) {
    html = html
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${selfUrl}">${alternates}`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${selfUrl}"><meta property="og:locale" content="${meta.hreflang.replace('-', '_')}">`);
  } else {
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, '').replace(/\s*<meta property="og:url"[^>]*>/, '');
  }

  const schemas = override ? patchSchemas(pageSchemas(path), { title: seo.title, description: seo.description }) : pageSchemas(path);
  const jsonLd = schemas.map((schema) =>
    `<script type="application/ld+json" data-ngd-schema>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
  ).join('');
  /* The published row this shell was built with, for SeoHead's first render
     (see shellRecordTag in src/lib/seoOverrides.js). */
  const record = override ? shellRecordTag(override.row, BUILT_AT) : '';
  html = html.replace('</head>', () => `${jsonLd}${record}</head>`);
  /* The template ships <html lang="en">; each shell must declare its own. */
  const withLang = (html) => html
    .replace(/<html([^>]*)\slang="[^"]*"/i, `<html$1 lang="${meta.htmlLang}"`)
    .replace(/<html(?![^>]*\slang=)/i, `<html lang="${meta.htmlLang}"`);

  const fallback = `<noscript><main><h1>${escapeHtml(seo.title.split(' | ')[0])}</h1><p>${escapeHtml(seo.description)}</p><p><a href="/">${SITE_NAME}</a></p></main></noscript>`;
  return withLang(html.replace('<div id="root"></div>', () => `<div id="root"></div>${fallback}`));
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
    const override = locale === DEFAULT_LOCALE ? OVERRIDES.get(path) ?? null : null;
    await writeFile(new URL('index.html', directory), render(path, locale, override));
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
if (OVERRIDES.size) console.log(`SEO overrides from the SEO Manager applied to ${OVERRIDES.size} English ${OVERRIDES.size === 1 ? 'page' : 'pages'}: ${[...OVERRIDES.keys()].join(', ')}.`);
