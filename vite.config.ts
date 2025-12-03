import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'client',
  publicDir: 'public',
  server: { 
    port: 5173,
    open: true 
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
