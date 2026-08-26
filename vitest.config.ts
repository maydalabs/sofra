import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
      'server-only': path.resolve(rootDirectory, 'test/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Integration tests need a live database; they run via
    // `pnpm test:integration` with vitest.integration.config.ts.
    exclude: ['src/**/*.integration.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
