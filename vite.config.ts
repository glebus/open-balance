import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.NODE_ENV === 'production' ? '/open-balance/' : '/',
  server: {
    strictPort: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
