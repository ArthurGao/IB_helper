import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// 从 vitest/config 取 defineConfig，这样 `test` 字段有类型。
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // 规则引擎是纯函数，不需要 DOM 环境
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
