import { afterAll, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresReadGateway } from './gateway'
import { PostgresSofraReadRepository } from './read-repository'

/**
 * Exercises the real query path against a real PostgreSQL database.
 *
 * The unit suite covers mapping logic with fabricated rows; this covers what
 * the database actually returns -- column names, null shapes, timestamp and
 * numeric types, and the privacy boundaries of the public projection.
 */
const sql = getDatabase()
if (!sql) throw new Error('DATABASE_URL is required for integration tests')

/** Ayşe, a certified host, from db/fixtures.sql. */
const HOST_PROFILE_ID = '10000000-0000-4000-8000-000000000001'

afterAll(async () => {
  await sql.end()
})

describe('public discovery', () => {
  const repository = new PostgresSofraReadRepository(
    new PostgresReadGateway(sql),
  )

  it('reads published tables from the database', async () => {
    const tables = await repository.listPublicTables()
    expect(tables.length).toBeGreaterThan(0)
  })

  it('returns types the domain expects, not raw driver values', async () => {
    const [table] = await repository.listPublicTables()
    // timestamptz must arrive as an ISO string, not a Date instance.
    expect(typeof table.startsAt).toBe('string')
    expect(table.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // numeric must arrive as a number, not a string. The fixtures carry
    // coordinates; a table without them is valid and renders by neighbourhood.
    expect(typeof table.publicCoordinate?.latitude).toBe('number')
    expect(typeof table.guestPriceKurus).toBe('number')
    expect(Number.isInteger(table.guestPriceKurus)).toBe(true)
    expect(table.currency).toBe('TRY')
  })

  it('never exposes private household data in the public projection', async () => {
    const tables = await repository.listPublicTables()
    const serialised = JSON.stringify(tables)

    // The fixtures mark every private address line with this sentinel.
    expect(serialised).not.toContain('DEMO ONLY')
    expect(serialised).not.toContain('Never expose publicly')

    for (const table of tables) {
      expect(table).not.toHaveProperty('exactAddress')
      expect(table).not.toHaveProperty('preciseCoordinate')
      expect(table).not.toHaveProperty('arrivalInstructions')
      expect(table).not.toHaveProperty('privateAddressId')
    }
  })

  it('only publishes tables in a publishable status', async () => {
    const tables = await repository.listPublicTables()
    for (const table of tables) {
      expect([
        'published',
        'minimum_reached',
        'confirmed',
        'roster_locked',
      ]).toContain(table.status)
    }
  })

  it('finds a table by slug and returns nothing for an unknown one', async () => {
    const [first] = await repository.listPublicTables()
    const found = await repository.findPublicTableBySlug(first.slug)
    expect(found?.id).toBe(first.id)
    expect(
      await repository.findPublicTableBySlug('no-such-table'),
    ).toBeUndefined()
  })
})

describe('host workspace', () => {
  const repository = new PostgresSofraReadRepository(
    new PostgresReadGateway(sql, HOST_PROFILE_ID),
    HOST_PROFILE_ID,
  )

  it('reads only the actor-owned tables', async () => {
    const tables = await repository.listHostTables()
    expect(tables.length).toBeGreaterThan(0)

    const ownedHouseholds = await sql<{ id: string }[]>`
      select id from public.households
      where owner_profile_id = ${HOST_PROFILE_ID}::uuid
    `
    const ownedIds = new Set(ownedHouseholds.map((row) => row.id))
    for (const table of tables) {
      expect(ownedIds.has(table.householdId)).toBe(true)
    }
  })

  it('reads the actor certification', async () => {
    const certification = await repository.findHostCertification()
    expect(certification).toBeDefined()
    expect(certification?.status).toBe('active')
    expect(typeof certification?.certifiedTravelerCapacity).toBe('number')
  })

  it('keeps guest identity and dietary text out of the roster', async () => {
    const [table] = await repository.listHostTables()
    const roster = await repository.listHostRoster(table.id)
    const serialised = JSON.stringify(roster)

    for (const party of roster) {
      expect(party).not.toHaveProperty('guestName')
      expect(party).not.toHaveProperty('fullName')
      expect(party).not.toHaveProperty('dietary')
      expect(['confirmed', 'completed']).toContain(party.bookingStatus)
    }
    // Guest names from the fixtures must never appear.
    const guests = await sql<{ full_name: string }[]>`
      select full_name from public.booking_guests
    `
    for (const guest of guests) {
      expect(serialised).not.toContain(guest.full_name)
    }
  })

  it('refuses a roster for a table the actor does not own', async () => {
    const foreign = await sql<{ id: string }[]>`
      select ht.id from public.hosted_tables ht
      join public.households h on h.id = ht.household_id
      where h.owner_profile_id <> ${HOST_PROFILE_ID}::uuid
      limit 1
    `
    expect(foreign.length).toBeGreaterThan(0)
    await expect(repository.listHostRoster(foreign[0].id)).rejects.toThrow()
  })
})
