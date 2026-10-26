import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В разработке фронт и API на разных портах — прокси делает их «одним сайтом»,
    // поэтому cookie сессии работают без настройки CORS
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
