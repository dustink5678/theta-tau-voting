import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/theta-tau-voting/',
  build: {
    outDir: 'dist',
  }
})
