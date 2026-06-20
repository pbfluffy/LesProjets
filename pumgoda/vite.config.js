import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The deployed path is pumbafluffycorgi.com/pumgoda/, served by the LesProjets
// repo's deploy workflow which copies pumgoda/dist into _site/pumgoda.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Feature #63 + #80 — offline shell with prompt-to-reload updates.
      // Precaches build output so the app boots offline after first visit;
      // manifest.json in public/ is left untouched (manifest: false).
      // #80: registerType 'prompt' (was 'autoUpdate') so a new deploy does NOT
      // silently auto-reload. src/registerPwaUpdate.js polls for a new SW and
      // shows a "New version — Reload" toast. injectRegister: false because we
      // register manually there. clientsClaim keeps first-install control on the
      // first load; the waiting SW activates only when the user taps Reload
      // (updateSW posts SKIP_WAITING). cleanupOutdatedCaches prevents orphan
      // precache piles. Pumgoda uses base: './' (relative); the plugin respects
      // this — the SW registers at the served path scope (/pumgoda/).
      registerType: 'prompt',
      manifest: false,
      injectRegister: false,
      workbox: {
        // Fix P1a: explicit globDirectory needed because base: './' causes
        // vite-plugin-pwa v0.20.5 to resolve the wrong precache root, resulting
        // in "0 entries" and a build failure. bill-splitter uses a absolute base
        // so it doesn't need this; pumgoda does.
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Fix P1b: runtimeCaching required alongside globPatterns or Workbox
        // throws "Couldn't find configuration for either precaching or runtime
        // caching" when globPatterns matches 0 files.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pumgoda-pages',
              expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  base: './',
})
