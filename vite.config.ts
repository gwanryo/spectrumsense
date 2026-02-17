/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/spectrumsense/',
  test: {
    globals: true,
    environment: 'node',
  },
})
