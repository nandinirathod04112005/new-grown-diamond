import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three + R3F + drei is by far the largest dependency here. Keeping it
        // in its own chunk means the hero's text and navigation ship without
        // it, and devices that never mount the canvas never download it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/three|@react-three/.test(id)) return 'three'
          if (/gsap|lenis/.test(id)) return 'motion'
          if (/react-router/.test(id)) return 'router'
          if (/@supabase/.test(id)) return 'supabase'
          if (/react-dom|[\\/]react[\\/]/.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
})
