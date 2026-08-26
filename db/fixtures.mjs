#!/usr/bin/env node
/**
 * Applies db/fixtures.sql -- fictional development data.
 *
 * Refuses to run against anything that is not a local database, because the
 * fixtures contain invented people, households, and addresses.
 */
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}
if (!/@(localhost|127\.0\.0\.1)/.test(url)) {
  console.error(
    'Refusing to apply development fixtures to a non-local database.\n' +
      'These contain fictional people and must never reach a deployed environment.',
  )
  process.exit(1)
}

const sql = postgres(url, { max: 1, ssl: false, onnotice: () => {} })
try {
  const body = await readFile(
    new URL('./fixtures.sql', import.meta.url),
    'utf8',
  )
  await sql.begin(async (tx) => {
    await tx.unsafe(body)
  })
  const [{ count }] =
    await sql`select count(*)::int as count from public.hosted_tables`
  console.log(`fixtures applied — ${count} hosted tables`)
} catch (error) {
  console.error('fixtures failed:', error?.message ?? error)
  if (error?.detail) console.error('  detail:', error.detail)
  process.exitCode = 1
} finally {
  await sql.end()
}
