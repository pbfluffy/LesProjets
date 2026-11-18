import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildInfoDefine } from '../shared/viteBuildInfo.js'

export default defineConfig({
  define: buildInfoDefine(),
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: false,
      injectRegister: false,
      // Switched from generateSW to injectManifest so src/sw.js can host a
      // custom `push` listener — the auto-generated service worker had no
      // hook point for that. Precaching + the one runtime-caching rule the
      // old config had are recreated by hand in src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // The app icons and link-preview image are only fetched by the OS / link scrapers,
        // never by the running app, so they stay out of the offline precache.
        globIgnores: ['img/**'],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: process.env.VITE_BASE_PATH || '/stock-ranges/',
})
