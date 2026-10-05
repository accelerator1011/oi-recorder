import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  // 唯一超过 500kB 的是 CodeEditor chunk（CodeMirror，压缩前约 573kB）。
  // 它已经按需加载：只有题目详情里真正展开某条记录才会下载，其余页面不碰。
  // 这是 CodeMirror 本身的体积下限，继续拆包没有意义，所以把阈值设成能容纳
  // 这一个已知 chunk 的值，避免每次构建都留下一条要人去解释的告警。
  build: {
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 纯前端应用，没有后端接口：所有页面路由都要回退到 index.html，
        // 由 react-router 决定渲染哪个页面。原先这里还有一条 /api/ 的
        // denylist 和一条 Google Fonts 的 runtimeCaching，但本应用从不请求
        // 外部域名、也不存在 /api/ 路径，两条规则都不会命中，已随之删除。
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'OI Recorder',
        short_name: 'OI Recorder',
        description: '信息竞赛做题记录工具',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
