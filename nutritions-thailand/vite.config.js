import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Custom domain pumbafluffycorgi.com serves the site at root, so /nutritions-thailand/.
// (The github.io URL auto-redirects to the custom domain, so the LesProjets prefix is never
// actually in the served path.)
const base = process.env.VITE_BASE ?? '/nutritions-thailand/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Feature #63 — silent auto-update SW. Precaches build output so the
      // app boots offline after first visit. Existing manifest.json in public/
      // is kept untouched (manifest: false). skipWaiting + clientsClaim mean
      // a newly installed SW takes control immediately, matching the silent
      // auto-update UX. cleanupOutdatedCaches prevents orphan precache piles.
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
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
