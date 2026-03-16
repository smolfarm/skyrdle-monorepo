import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
  resolve: {
    alias: [
      {
        find: /\.(jpg|jpeg|png|gif|svg|webp)$/,
        replacement: new URL('./tests/mocks/fileMock.ts', import.meta.url).pathname,
      },
    ],
  },
})
