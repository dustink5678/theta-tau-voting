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
    // Ensure correct paths for GitHub Pages
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Ensure TypeScript files are processed correctly
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
