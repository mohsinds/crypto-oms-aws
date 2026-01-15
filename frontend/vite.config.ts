import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Order Ingestion API
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5002',  // Market Data WebSocket
        ws: true,
      },
    },
  },
})
