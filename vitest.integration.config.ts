import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

/**
 * Integration tests run against a real local PostgreSQL database:
 *
 *   pnpm db:up && pnpm db:reset && pnpm db:fixtures
 *   pnpm test:integration
 *
 * They are kept out of the default unit run so `pnpm test` needs no database.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
      'server-only': path.resolve(rootDirectory, 'test/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgres://sofra:sofra_local_dev@127.0.0.1:54329/sofra',
      SOFRA_DEMO_MODE: 'false',
    },
    fileParallelism: false,
  },
})
