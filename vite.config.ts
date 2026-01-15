import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Keep CodeMirror isolated so editor deps don't bloat the main UI chunk.
          // Use a single chunk to avoid circular chunk warnings between packages.
          if (id.includes('@codemirror/')) return 'codemirror'

          // Keep Tauri APIs isolated.
          if (id.includes('@tauri-apps/')) {
            return 'tauri'
          }

          // Common big vendors.
          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
