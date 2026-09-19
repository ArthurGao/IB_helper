/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // 规则引擎是纯函数，不需要 DOM 环境
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
