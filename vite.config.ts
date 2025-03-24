import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment - only in production
  base: process.env.NODE_ENV === 'production' ? '/theta-tau-voting/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Add this to get a clean URL format
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
