import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
