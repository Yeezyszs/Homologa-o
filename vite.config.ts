import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  // Project page do GitHub Pages: o site é servido em /Homologa-o/.
  // Se um dia usar domínio próprio ou outro host, troque para '/'.
  base: '/Homologa-o/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
