import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Jika deploy ke subfolder, ganti '/nama-subfolder/' dengan path publik aplikasi kamu.
  // Contoh: base: '/ultrasonic-iot/'
  base: '/ultrasonic-iot/',
  plugins: [react()],
  server: {
    proxy: {
      '/tb-api': {
        target: 'https://thingsboard.cloud',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/tb-api/, ''),
        // RPC oneway bisa menunggu device; hindari 504 prematur dari proxy dev
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
})
