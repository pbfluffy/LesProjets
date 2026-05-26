import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The deployed path is pumbafluffycorgi.com/pumgoda/, served by the LesProjets
// repo's deploy workflow which copies pumgoda/dist into _site/pumgoda.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Feature #63 — silent auto-update SW. Precaches build output so the
      // app boots offline after first visit. Existing manifest.json in public/
      // is kept untouched (manifest: false). skipWaiting + clientsClaim mean
      // a newly installed SW takes control immediately, matching the silent
      // auto-update UX. cleanupOutdatedCaches prevents orphan precache piles.
      // Note: Pumgoda uses base: './' (relative). The plugin respects this —
      // the SW will register at the served path scope (/pumgoda/).
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  base: './',
})
