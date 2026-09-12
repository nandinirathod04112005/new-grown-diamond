import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite 8 bundles with Rolldown, where manualChunks must be a function.
// Vendors are split so the eventual WebGL work can never land in the entry.
//
// React comes FIRST, in a chunk of its own. Without this entry Rolldown put
// React, its JSX runtime and the scheduler inside three-vendor (they are
// dependencies of @react-three/fiber), and the entry then imported React from
// there — so every page, on every phone, preloaded the whole 1 MB WebGL
// library just to get React. Measured in the built index.html before the fix.
const VENDORS = [
  ['react-vendor', ['/node_modules/react/', '/node_modules/react-dom/', '/node_modules/scheduler/']],
  ['three-vendor', ['/three/', '@react-three/']],
  ['supabase-vendor', ['@supabase/']],
]

/*
 * The first large picture on a route, requested while the scripts download.
 *
 * The site is drawn in the browser, so a page's hero picture was not even
 * asked for until React had downloaded, run and rendered the page. On a phone
 * on mobile data that put the largest paint about five seconds in (Lighthouse,
 * mobile). This writes a few lines at the very top of <head> that read the
 * address and preload that route's picture at once, with the srcset and sizes
 * the page's own <img> uses, so the browser fetches one file, not two. It
 * sits above the stylesheet on purpose (an inline script placed after one
 * waits for it to load) and below the viewport tag (see the handler).
 *
 * Keep this list in step with the pictures themselves: Home.jsx (the hero),
 * PAGE_MOTIF in App.jsx, InventoryPage.jsx and BlogsPage.jsx. A route missing
 * here only loses the head start. `backdrop` marks a HeroBackdrop picture,
 * which offers its 900 px copy (src/lib/responsiveImages.js).
 */
const ROUTE_HEROES = {
  '/': { file: 'src/assets/diamonds/ngd-hero-campaign-v2.webp' },
  '/diamonds': { file: 'src/assets/process/cut-stone.webp', backdrop: true },
  '/blogs': { file: 'src/assets/process/grading-bench.webp', backdrop: true },
  '/education': { file: 'src/assets/process/seed-to-stone.webp', backdrop: true },
  '/cvd-vs-natural': { file: 'src/assets/process/lattice-cut.webp', backdrop: true },
  '/price-and-size': { file: 'src/assets/process/cut-stone.webp', backdrop: true },
  '/shapes': { file: 'src/assets/process/cut-stone.webp', backdrop: true },
  '/why-lab-grown': { file: 'src/assets/process/grading-bench.webp', backdrop: true },
}

function preloadRouteHeroes() {
  return {
    name: 'ngd-preload-route-heroes',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const assets = Object.values(ctx.bundle ?? {}).filter((f) => f.type === 'asset')
        const url = (file) => {
          const hit = assets.find((a) => (a.originalFileNames ?? []).some((n) => n.replace(/\\/g, '/').endsWith(file)))
          return hit ? `/${hit.fileName}` : null
        }
        const map = {}
        for (const [route, { file, backdrop }] of Object.entries(ROUTE_HEROES)) {
          const full = url(file)
          if (!full) continue
          const small = backdrop ? url(file.replace(/\.[a-z0-9]+$/i, '@900.webp')) : null
          map[route] = small
            ? { srcset: `${small} 900w, ${full} 1672w`, sizes: '(max-width: 767px) 50vw, 100vw' }
            : { href: full }
        }
        const code = `(function(){var m=${JSON.stringify(map)};`
          + `var p=location.pathname.replace(/^\\/(hi|gu)(?=\\/|$)/,'').replace(/\\/+$/,'')||'/';`
          + `var h=m[p];if(!h)return;var l=document.createElement('link');l.rel='preload';l.as='image';`
          + `l.setAttribute('fetchpriority','high');`
          + `if(h.srcset){l.setAttribute('imagesrcset',h.srcset);l.setAttribute('imagesizes',h.sizes);}else{l.href=h.href;}`
          + `document.head.appendChild(l);})();`
        /* Straight after the viewport tag. Earlier, a phone still thinks it
           is 980 px wide, so "50vw" picks the full-size photograph instead of
           the 900 px copy, and the charset tag is pushed down the file. */
        const viewport = /<meta name="viewport"[^>]*>/
        if (viewport.test(html)) return html.replace(viewport, (tag) => `${tag}\n    <script>${code}</script>`)
        return { html, tags: [{ tag: 'script', children: code, injectTo: 'head-prepend' }] }
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadRouteHeroes()],
  server: {
    watch: {
      ignored: ['**/.codex-chrome-*/**'],
    },
  },
  /*
   * Vite only exposes variables carrying one of these prefixes to the browser
   * bundle, and silently ignores every other name — no warning, no error, the
   * value is simply undefined at runtime.
   *
   * NEXT_PUBLIC_ is accepted alongside VITE_ because the Supabase dashboard
   * and most of its documentation hand you NEXT_PUBLIC_ names, and pasting
   * those into .env.local would otherwise leave the site with no credentials
   * and no explanation. Both prefixes are public by definition, so nothing
   * secret becomes exposed by accepting the second one.
   */
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const hit = VENDORS.find(([, marks]) => marks.some((m) => id.includes(m)))
          return hit ? hit[0] : undefined
        },
      },
    },
  },
})
