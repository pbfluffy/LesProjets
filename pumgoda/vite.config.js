import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The deployed path is pumbafluffycorgi.com/pumgoda/, served by the LesProjets
// repo's deploy workflow which copies pumgoda/dist into _site/pumgoda.
export default defineConfig({
  plugins: [react()],
  base: './',
})
