import 'server-only'

import postgres from 'postgres'

/**
 * The single database connection for the application.
 *
 * Type handling is configured so rows arrive in the same shapes the repository
 * mappers already expect:
 *
 *   timestamptz -> ISO 8601 string (postgres.js returns Date by default)
 *   numeric     -> number         (postgres.js returns string by default)
 *
 * Both match what a JSON API returned previously, so mappers and domain types
 * are unaffected by the driver change.
 */
type Database = ReturnType<typeof postgres>

const globalForDatabase = globalThis as unknown as {
  sofraDatabase?: Database
}

function createClient(connectionString: string): Database {
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString)

  return postgres(connectionString, {
    // Serverless invocations are short-lived and a pooled endpoint fronts the
    // real connections, so a small per-instance pool is correct here.
    max: Number(process.env.DATABASE_POOL_MAX ?? '5'),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocal ? false : 'require',
    onnotice: () => {},
    types: {
      numeric: {
        to: 1700,
        from: [1700],
        serialize: String,
        parse: Number,
      },
    },
    transform: {
      value: {
        from: (value: unknown) =>
          value instanceof Date ? value.toISOString() : value,
      },
    },
  })
}

/**
 * Returns the shared client, or null when no database is configured. Callers
 * decide whether absence is a fallback condition (anonymous discovery) or a
 * hard failure (anything authenticated).
 */
export function getDatabase(): Database | null {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return null

  // Development recreates modules on every edit; without this each reload would
  // leak a connection pool.
  if (process.env.NODE_ENV !== 'production') {
    globalForDatabase.sofraDatabase ??= createClient(connectionString)
    return globalForDatabase.sofraDatabase
  }

  globalForDatabase.sofraDatabase ??= createClient(connectionString)
  return globalForDatabase.sofraDatabase
}

export type SofraDatabase = Database
