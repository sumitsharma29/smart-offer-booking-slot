import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning threshold (kb)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching in production
        manualChunks(id: string) {
          if (id.includes('node_modules/@microsoft/signalr')) return 'signalr';
          if (id.includes('node_modules/axios')) return 'axios';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) return 'react-router';
          if (id.includes('node_modules/react')) return 'react';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
