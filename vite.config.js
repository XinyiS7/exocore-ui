import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    proxy: {
      // 将所有 /api 开头的请求转发给 Django
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // 将所有 /media 开头的请求（如文件预览）转发给 Django
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
