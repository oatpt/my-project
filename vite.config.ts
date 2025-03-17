// File: vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // This is important when using React Router with BrowserRouter
    // It ensures all routes redirect to index.html so React Router can handle them
  }
})