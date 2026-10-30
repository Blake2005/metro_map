import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  server: {
    host: true, // lets you reach the dev server from another machine
    proxy: { "/api": "http://100.87.56.104:8000" }, // your FastAPI server
  },
});
