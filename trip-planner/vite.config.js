import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at pumbafluffycorgi.com/trip-planner/ — relative base so the built
// asset paths resolve correctly regardless of which subpath it's mounted under.
export default defineConfig({
  plugins: [react()],
  base: './',
})
