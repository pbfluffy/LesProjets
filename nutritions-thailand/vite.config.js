import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the repo under /LesProjets/<project>/.
// If you deploy a single-project site or use a custom-domain root,
// override with `VITE_BASE=/` when running `npm run build`.
const base = process.env.VITE_BASE ?? '/LesProjets/nutritions-thailand/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
