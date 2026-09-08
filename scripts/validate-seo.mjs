import { readFile } from 'node:fs/promises';
import { PUBLIC_ROUTES, PRIVATE_ROUTES, SITE_URL } from '../src/config/seo.js';

const seenTitles = new Set();
const seenDescriptions = new Set();
let failures = 0;

function check(condition, message) {
  if (!condition) { failures += 1; console.error(`FAIL: ${message}`); }
}

for (const path of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES, '/admin']) {
  const file = path === '/' ? '../dist/index.html' : `../dist${path}/index.html`;
  const html = await readFile(new URL(file, import.meta.url), 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="(.*?)">/)?.[1];
  const robots = html.match(/<meta name="robots" content="(.*?)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="(.*?)">/)?.[1];
  const schemas = [...html.matchAll(/<script type="application\/ld\+json" data-ngd-schema>(.*?)<\/script>/g)];

  check(Boolean(title), `${path} has no title`);
  check(Boolean(description), `${path} has no description`);
  if (PUBLIC_ROUTES.includes(path)) {
    check(!seenTitles.has(title), `${path} duplicates title: ${title}`);
    check(!seenDescriptions.has(description), `${path} duplicates description`);
    check(robots === 'index,follow', `${path} is not indexable`);
    check(canonical === `${SITE_URL}${path === '/' ? '/' : path}`, `${path} canonical is incorrect`);
    check(schemas.length >= 3, `${path} is missing structured data`);
    schemas.forEach((match) => {
      try { JSON.parse(match[1]); } catch { check(false, `${path} contains invalid JSON-LD`); }
    });
    seenTitles.add(title); seenDescriptions.add(description);
  } else {
    check(robots === 'noindex,nofollow', `${path} private/error shell is not noindex`);
    check(!canonical, `${path} private/error shell has a canonical`);
  }
}

const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
for (const path of PUBLIC_ROUTES) check(sitemap.includes(`<loc>${SITE_URL}${path === '/' ? '/' : path}</loc>`), `${path} is missing from sitemap`);
for (const path of PRIVATE_ROUTES) check(!sitemap.includes(`<loc>${SITE_URL}${path}</loc>`), `${path} leaked into sitemap`);

if (failures) process.exitCode = 1;
else console.log(`SEO validation passed for ${PUBLIC_ROUTES.length} public routes and ${PRIVATE_ROUTES.length + 1} private route shells.`);
