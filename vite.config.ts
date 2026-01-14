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

          // Split CodeMirror so the editor code doesn't bloat the main UI chunk.
          if (id.includes('@codemirror/lang-markdown') || id.includes('@codemirror/language')) {
            return 'codemirror-lang'
          }
          if (id.includes('@codemirror/')) {
            return 'codemirror-core'
          }

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
