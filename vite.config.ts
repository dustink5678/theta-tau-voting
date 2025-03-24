import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment - only in production
  base: process.env.NODE_ENV === 'production' ? '/theta-tau-voting/' : '/',
  // Explicitly set the entry point
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Make sure to include the entry point manually
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
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
