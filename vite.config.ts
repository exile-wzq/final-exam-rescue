import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // 相对路径：GitHub Pages 项目子路径（/<repo>/）下资源才能正确加载
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    // 课堂扫码演示：允许 cloudflared 临时隧道域名转发进来的 Host
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
})
