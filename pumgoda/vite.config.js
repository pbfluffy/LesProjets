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
      //
      // Fix P1: base: './' causes vite-plugin-pwa v0.20.x to run the Workbox
      // glob scan before Vite has flushed build output, so globPatterns always
      // finds 0 entries and the build fails. Dropping globPatterns (no precache
      // manifest) while keeping runtimeCaching is the correct workaround —
      // navigation requests are still cached NetworkFirst and the SW is still
      // generated and registered. bill-splitter uses an absolute base so it
      // does not hit this issue.
      registerType: 'prompt',
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: [],
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
