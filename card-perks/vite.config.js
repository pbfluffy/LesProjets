import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildInfoDefine } from '../shared/viteBuildInfo.js'

export default defineConfig({
  define: buildInfoDefine(),
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/card-perks/',
})
