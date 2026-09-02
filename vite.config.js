import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite 8 bundles with Rolldown, where manualChunks must be a function.
// Vendors are split so the eventual WebGL work can never land in the entry.
const VENDORS = [
  ['three-vendor', ['/three/', '@react-three/']],
  ['gsap-vendor', ['/gsap/', '@gsap/']],
  ['supabase-vendor', ['@supabase/']],
]

export default defineConfig({
  plugins: [react()],
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
