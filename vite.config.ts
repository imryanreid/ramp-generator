// ==============================================
// VITE CONFIG
// Build and dev-server setup for the app. Kept
// deliberately small: the React and Tailwind
// plugins, an "@" alias pointing at src/, and
// nothing else.
// ==============================================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure a single React instance so libraries like `motion` don't resolve
    // their own nested copy (which breaks hooks: "Cannot read ... useContext").
    dedupe: ['react', 'react-dom'],
  },
})
