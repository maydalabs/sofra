/**
 * Runs once when the server starts, before any request is handled.
 *
 * Production configuration is validated here so a bad deploy fails loudly at
 * boot rather than degrading quietly -- serving fictional demo data, or signing
 * sessions with an unstable key.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { assertProductionEnvironment } =
    await import('@/server/config/environment')
  assertProductionEnvironment()
}
