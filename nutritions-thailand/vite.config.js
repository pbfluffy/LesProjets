import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom domain pumbafluffycorgi.com serves the site at root, so /nutritions-thailand/.
// (The github.io URL auto-redirects to the custom domain, so the LesProjets prefix is never
// actually in the served path.)
const base = process.env.VITE_BASE ?? '/nutritions-thailand/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
