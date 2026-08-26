#!/usr/bin/env node
/**
 * Plain-SQL migration runner.
 *
 * Migrations are ordinary .sql files applied in filename order, each inside its
 * own transaction, recorded in public.schema_migrations. No ORM and no vendor
 * CLI -- the same runner works against local Postgres, Neon, or anything else
 * that speaks the wire protocol.
 *
 *   node db/migrate.mjs           apply pending migrations
 *   node db/migrate.mjs --reset   drop the public schema first, then apply
 *   node db/migrate.mjs --seed    also apply db/seed.sql after migrating
 */
import { readdir, readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const migrationsDir = new URL('./migrations/', import.meta.url)
const seedFile = new URL('./seed.sql', import.meta.url)

// Migrations prefer the direct (non-pooled) connection. Neon's transaction
// pooler does not support the session-level locks that DDL can take.
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!connectionString) {
  console.error(
    'DATABASE_URL is not set. Add it to .env.local, or export it for this command.',
  )
  process.exit(1)
}

const shouldReset = process.argv.includes('--reset')
const shouldSeed = process.argv.includes('--seed') || shouldReset

// Neon requires TLS; local Postgres in Docker does not offer it.
const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString)
const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
  ssl: isLocal ? false : 'require',
})

const target = connectionString.replace(/:\/\/[^@]*@/, '://***@')
console.log(`database: ${target}`)

try {
  if (shouldReset) {
    console.log('reset: dropping public schema')
    await sql.unsafe(
      'drop schema if exists public cascade; create schema public;',
    )
  }

  await sql`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `

  const appliedRows = await sql`select name from public.schema_migrations`
  const applied = new Set(appliedRows.map((row) => row.name))

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.warn('no migrations found')
  }

  let appliedCount = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip   ${file}`)
      continue
    }
    const body = await readFile(new URL(file, migrationsDir), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(body)
      await tx`insert into public.schema_migrations (name) values (${file})`
    })
    console.log(`  apply  ${file}`)
    appliedCount += 1
  }

  if (shouldSeed) {
    const seedPath = fileURLToPath(seedFile)
    const hasSeed = await access(seedFile).then(
      () => true,
      () => false,
    )
    if (hasSeed) {
      const body = await readFile(seedFile, 'utf8')
      await sql.begin(async (tx) => {
        await tx.unsafe(body)
      })
      console.log('  seed   db/seed.sql')
    } else {
      console.log(`  seed   skipped (${seedPath} not found)`)
    }
  }

  console.log(
    appliedCount === 0
      ? 'up to date'
      : `applied ${appliedCount} migration${appliedCount === 1 ? '' : 's'}`,
  )
} catch (error) {
  console.error('\nmigration failed:')
  console.error(error?.message ?? error)
  if (error?.position) console.error(`  at character ${error.position}`)
  if (error?.detail) console.error(`  detail: ${error.detail}`)
  if (error?.hint) console.error(`  hint: ${error.hint}`)
  process.exitCode = 1
} finally {
  await sql.end()
}
