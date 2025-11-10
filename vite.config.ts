import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'traitor.com.br',
      'traitor.multicrypto.com.br',
      'automaclinic-traitor.owelyh.easypanel.host',
      'localhost',
      '127.0.0.1'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: [
      'traitor.com.br',
      'traitor.multicrypto.com.br',
      'automaclinic-traitor.owelyh.easypanel.host',
      'localhost',
      '127.0.0.1'
    ]
  }
})
