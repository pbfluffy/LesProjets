import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Feature #63 + #80 — offline shell with prompt-to-reload updates.
      // Precaches build output so the app boots offline after first visit;
      // manifest.json in public/ is left untouched (manifest: false).
      // #80: registerType 'prompt' (was 'autoUpdate') so a new deploy does NOT
      // silently auto-reload. src/registerPwaUpdate.js polls for a new SW and
      // shows a "New version — Reload" toast, so a refresh can't fire mid-edit
      // and wipe an in-progress bill. injectRegister: false because we register
      // manually there. clientsClaim keeps first-install control on the very
      // first load; the waiting SW activates only when the user taps Reload
      // (updateSW posts SKIP_WAITING). cleanupOutdatedCaches prevents orphan
      // precache piles.
      registerType: 'prompt',
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  base: process.env.VITE_BASE_PATH || '/bill-splitter/',
})
