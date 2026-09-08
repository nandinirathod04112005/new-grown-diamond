import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pageSchemas, PRIVATE_ROUTES, PUBLIC_ROUTES, seoForPath, SITE_NAME, SITE_URL } from '../src/config/seo.js';

const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function render(path) {
  const seo = seoForPath(path);
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
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${seo.canonical}">`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${seo.canonical}">`);
  } else {
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, '').replace(/\s*<meta property="og:url"[^>]*>/, '');
  }

  const jsonLd = pageSchemas(path).map((schema) =>
    `<script type="application/ld+json" data-ngd-schema>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
  ).join('');
  html = html.replace('</head>', `${jsonLd}</head>`);
  const fallback = `<noscript><main><h1>${escapeHtml(seo.title.split(' | ')[0])}</h1><p>${escapeHtml(seo.description)}</p><p><a href="/">${SITE_NAME}</a></p></main></noscript>`;
  return html.replace('<div id="root"></div>', `<div id="root"></div>${fallback}`);
}

for (const path of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES]) {
  const directory = path === '/' ? dist : new URL(`.${path}/`, dist);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), render(path));
}

const adminDirectory = new URL('./admin/', dist);
await mkdir(adminDirectory, { recursive: true });
await writeFile(new URL('index.html', adminDirectory), render('/admin'));
await writeFile(new URL('404.html', dist), render('/404'));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_ROUTES.map((path) => `  <url><loc>${SITE_URL}${path === '/' ? '/' : path}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('sitemap.xml', dist), sitemap);

console.log(`SEO route shells generated for ${PUBLIC_ROUTES.length} public routes and private noindex routes.`);
