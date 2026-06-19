import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    proxy: {
      '/api/v1': 'http://172.26.90.32:8080',
    },
  },
})
