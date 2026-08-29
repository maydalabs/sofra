import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresSofraWriteRepository } from './write-repository'
import { BookingWriteError } from '../write-contracts'

/**
 * Durable booking writes against a real database, including the concurrency
 * behaviour that cannot be observed in a unit test.
 */
const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
// Bound to a separate const so the null check narrows inside the hoisted
// helper declarations below.
const sql = database

const TRAVELLER = '10000000-0000-4000-8000-000000000008' // Demo Traveler
const OTHER = '10000000-0000-4000-8000-000000000009' // Demo Operator
const POLICY = { takeRateBasisPoints: 2500, capturedAt: '2026-08-26T00:00:00Z' }

/** A fresh table per test, so seat counts are never shared between cases. */
async function createTable(seats: number, overrides = '') {
  const [row] = await sql<{ id: string }[]>`
    insert into public.hosted_tables (
      slug, household_id, lead_verified_host_id, private_address_id,
      pricing_policy_id, starts_at, public_neighborhood, format, menu_title,
      menu_description, atmosphere, expected_household_participants,
      practical_information, accessibility_information, proposed_capacity,
      certified_capacity, available_seats, minimum_guest_count,
      host_net_payout_kurus, guest_price_kurus, booking_cutoff_at,
      roster_lock_at, status, published_at
    )
    select
      ${'itest-' + crypto.randomUUID()},
      h.id, h.owner_profile_id, a.id,
      '20000000-0000-4000-8000-000000000001',
      now() + interval '10 days', 'Kadıköy', 'shared', 'Test menu',
      'd', 'warm', 'Household', 'i', 'i',
      ${seats}, ${seats}, ${seats}, 2,
      45000, 60000,
      now() + interval '8 days', now() + interval '9 days',
      'published', now()
    from public.households h
    join public.household_private_addresses a on a.household_id = h.id
    limit 1
    returning id
  `
  if (overrides) await sql.unsafe(overrides.replace('$ID', `'${row.id}'`))
  return row.id
}

async function seatsFor(tableId: string) {
  const [row] = await sql<{ available_seats: number }[]>`
    select available_seats from public.hosted_tables where id = ${tableId}::uuid
  `
  return row.available_seats
}

const writes = new PostgresSofraWriteRepository(sql, TRAVELLER)

async function cleanup() {
  // Bookings reference hosted_tables, so they must go first. booking_guests and
  // dietary_disclosures cascade from bookings.
  await sql`
    delete from public.audit_logs
    where entity_id in (
      select b.id from public.bookings b
      join public.hosted_tables t on t.id = b.hosted_table_id
      where t.slug like 'itest-%'
    )
  `
  await sql`
    delete from public.bookings
    where hosted_table_id in (
      select id from public.hosted_tables where slug like 'itest-%'
    )
  `
  await sql`delete from public.hosted_tables where slug like 'itest-%'`
}

beforeEach(cleanup)

afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('createBooking', () => {
  it('persists a booking and holds the seats', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })

    expect(booking.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(booking.partySize).toBe(2)
    expect(await seatsFor(tableId)).toBe(2)

    const [stored] = await sql`
      select * from public.bookings where id = ${booking.id}::uuid
    `
    expect(stored).toBeDefined()
    expect(stored.primary_traveler_id).toBe(TRAVELLER)
  })

  it('computes money from the table, not from the caller', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    // 2 seats at 600.00 TRY guest / 450.00 TRY host net.
    expect(booking.guestTotalKurus).toBe(120_000)
    expect(booking.hostNetPayoutKurus).toBe(90_000)
    expect(booking.sofraGrossFeeKurus).toBe(30_000)
    expect(booking.guestTotalKurus).toBe(
      booking.hostNetPayoutKurus + booking.sofraGrossFeeKurus,
    )
  })

  it('starts unpaid, never pre-confirmed', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    expect(booking.status).toBe('draft')
    expect(booking.paymentStatus).toBe('not_started')
  })

  it('writes an audit row in the same transaction', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    const [audit] = await sql`
      select * from public.audit_logs
      where entity_id = ${booking.id}::uuid and action = 'booking.created'
    `
    expect(audit).toBeDefined()
    expect(audit.actor_profile_id).toBe(TRAVELLER)
    // Money and lifecycle are recorded; nothing personal is.
    expect(audit.new_state.guest_total_kurus).toBe(120_000)
    expect(JSON.stringify(audit.new_state)).not.toMatch(/@|dietary|address/i)
  })

  it('refuses more seats than remain', async () => {
    const tableId = await createTable(2)
    await expect(
      writes.createBooking({
        tableId,
        partySize: 3,
        partyType: 'friends',
        primaryGuestName: 'Test Traveller',
        policySnapshot: POLICY,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_SEATS' })
    expect(await seatsFor(tableId)).toBe(2)
  })

  it('refuses a table past its booking cutoff', async () => {
    const tableId = await createTable(4)
    await sql`
      update public.hosted_tables
      set booking_cutoff_at = now() - interval '1 hour'
      where id = ${tableId}::uuid
    `
    await expect(
      writes.createBooking({
        tableId,
        partySize: 1,
        partyType: 'solo',
        primaryGuestName: 'Test Traveller',
        policySnapshot: POLICY,
      }),
    ).rejects.toMatchObject({ code: 'BOOKING_CUTOFF_PASSED' })
  })

  it('does not oversell under concurrent bookings for the last seats', async () => {
    const tableId = await createTable(4)

    // Four simultaneous 2-seat requests for a 4-seat table. Exactly two can win.
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        writes.createBooking({
          tableId,
          partySize: 2,
          partyType: 'couple',
          primaryGuestName: 'Test Traveller',
          policySnapshot: POLICY,
        }),
      ),
    )

    const succeeded = attempts.filter((a) => a.status === 'fulfilled')
    const failed = attempts.filter((a) => a.status === 'rejected')

    expect(succeeded).toHaveLength(2)
    expect(failed).toHaveLength(2)
    for (const failure of failed) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(
        BookingWriteError,
      )
      expect((failure as PromiseRejectedResult).reason.code).toBe(
        'INSUFFICIENT_SEATS',
      )
    }
    expect(await seatsFor(tableId)).toBe(0)
  })
})

describe('cancelBooking', () => {
  it('cancels and returns the seats', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    expect(await seatsFor(tableId)).toBe(2)

    const cancelled = await writes.cancelBooking(booking.id, 'changed plans')
    expect(cancelled.status).toBe('cancelled')
    expect(await seatsFor(tableId)).toBe(4)
  })

  it('refuses to cancel another traveller booking', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    const intruder = new PostgresSofraWriteRepository(sql, OTHER)
    await expect(
      intruder.cancelBooking(booking.id, 'not mine'),
    ).rejects.toMatchObject({ code: 'BOOKING_NOT_OWNED' })
    expect(await seatsFor(tableId)).toBe(3)
  })

  it('refuses to cancel twice', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    await writes.cancelBooking(booking.id, null)
    await expect(writes.cancelBooking(booking.id, null)).rejects.toMatchObject({
      code: 'BOOKING_NOT_CANCELLABLE',
    })
    // Seats returned exactly once, not twice.
    expect(await seatsFor(tableId)).toBe(4)
  })

  it('audits the cancellation with its previous state', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    await writes.cancelBooking(booking.id, 'schedule clash')
    const [audit] = await sql`
      select * from public.audit_logs
      where entity_id = ${booking.id}::uuid and action = 'booking.cancelled'
    `
    expect(audit.reason).toBe('schedule clash')
    expect(audit.previous_state.status).toBe('draft')
    expect(audit.new_state.status).toBe('cancelled')
  })
})

describe('refund policy', () => {
  /** Marks the booking as if a provider had collected the money. */
  async function markPaid(bookingId: string) {
    await sql`
      update public.bookings set payment_status = 'authorized'
      where id = ${bookingId}::uuid
    `
  }

  it('cancelling before the cutoff owes the full amount back', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    await markPaid(booking.id)

    const cancelled = await writes.cancelBooking(booking.id, 'plans changed')
    expect(cancelled.refundDueKurus).toBe(cancelled.guestTotalKurus)
    // Nothing retained, so the host is not compensated.
    expect(cancelled.hostCompensationKurus).toBe(0)

    const [row] = await sql`
      select refund_status from public.bookings where id = ${booking.id}::uuid
    `
    expect(row.refund_status).toBe('requested')
  })

  it('cancelling after the cutoff owes half, host compensated first', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    await markPaid(booking.id)
    // Push the cutoff into the past: the traveller is now cancelling late.
    await sql`
      update public.hosted_tables
      set booking_cutoff_at = now() - interval '1 hour'
      where id = ${tableId}::uuid
    `

    const cancelled = await writes.cancelBooking(booking.id, 'too late')
    // 2 seats at 600.00 guest / 450.00 host net: refund 600.00, retain 600.00.
    expect(cancelled.guestTotalKurus).toBe(120_000)
    expect(cancelled.refundDueKurus).toBe(60_000)
    // Retained 60_000 < host net 90_000: the host takes all of it.
    expect(cancelled.hostCompensationKurus).toBe(60_000)
  })

  it('rounds a partial refund in the traveller’s favour', async () => {
    const tableId = await createTable(4)
    // An odd guest total: 3 seats at 600.00 = 1,800.00 -- make it odd by
    // adjusting the stored total after booking.
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    await markPaid(booking.id)
    await sql`
      update public.bookings
      set guest_total_kurus = 60_001,
          host_net_payout_kurus = 45_001,
          sofra_gross_fee_kurus = 15_000
      where id = ${booking.id}::uuid
    `
    await sql`
      update public.hosted_tables
      set booking_cutoff_at = now() - interval '1 hour'
      where id = ${tableId}::uuid
    `
    const cancelled = await writes.cancelBooking(booking.id, null)
    // 50% of 60,001 = 30,000.5 -> the traveller gets 30,001, not 30,000.
    expect(cancelled.refundDueKurus).toBe(30_001)
    expect(cancelled.hostCompensationKurus).toBe(30_000)
  })

  it('owes nothing when nothing was collected', async () => {
    const tableId = await createTable(4)
    const booking = await writes.createBooking({
      tableId,
      partySize: 1,
      partyType: 'solo',
      primaryGuestName: 'Test Traveller',
      policySnapshot: POLICY,
    })
    const cancelled = await writes.cancelBooking(booking.id, null)
    expect(cancelled.refundDueKurus).toBe(0)
    expect(cancelled.hostCompensationKurus).toBe(0)

    const [row] = await sql`
      select refund_status from public.bookings where id = ${booking.id}::uuid
    `
    expect(row.refund_status).toBe('not_requested')
  })
})
