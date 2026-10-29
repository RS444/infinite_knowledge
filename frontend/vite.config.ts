import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy API calls directly so browser requests to /subjects, /concepts, /documents
      // work seamlessly without triggering browser CORS issues during development.
      '/subjects': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/concepts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/documents': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 600000,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
