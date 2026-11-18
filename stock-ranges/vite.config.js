import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { appVersion } from '../shared/viteBuildInfo.js'

// One value for both the bundle stamp (__APP_BUILD__) and version.json, so the running app can tell
// whether the deployed build is newer than itself (src/registerPwaUpdate.js).
const VERSION = appVersion()

const versionJson = {
  name: 'version-json',
  generateBundle() {
    // Not matched by the precache globs (json is not listed), and never cached by the service worker,
    // so it always reflects what is deployed right now.
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: VERSION }) })
  },
}

export default defineConfig({
  define: { __APP_BUILD__: JSON.stringify({ version: VERSION }) },
  plugins: [
    react(),
    versionJson,
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
