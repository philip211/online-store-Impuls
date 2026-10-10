import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // The API (server/) runs on :3000; proxying keeps it same-origin, so cookies and CORS just work.
  server: { proxy: { '/api': 'http://localhost:3000' } },
  preview: { proxy: { '/api': 'http://localhost:3000' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.5%, last 2 versions, not dead')),
      // Keyframes live in app/styles/motion.css and are shared by every module.
      cssModules: { animation: false, pattern: '[local]_[hash]' },
    },
  },
  build: {
    cssMinify: 'lightningcss',
    // Fonts stay as separate cacheable files instead of base64 in the CSS.
    assetsInlineLimit: (file) => (/\.(woff2?)$/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/'))
            return 'react'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/@tanstack')) return 'query'
          // zod + react-hook-form stay in the lazily loaded cart chunk.
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // The API in server/ has its own Vitest setup.
    exclude: [...configDefaults.exclude, 'server/**'],
    globals: true,
    setupFiles: ['./src/shared/config/test-setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
