import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresSofraHostWriteRepository } from './host-write-repository'
import { PostgresSofraPaymentWriteRepository } from './payment-write-repository'
import { PostgresSofraWriteRepository } from './write-repository'

/**
 * The check-in artefact: the only production path that completes bookings,
 * closes the table, and creates the payout row. Exercised through the real
 * chain — book, pay, time-travel past the start, confirm attendance.
 */
const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

const TRAVELLER = '10000000-0000-4000-8000-000000000008' // Demo Traveler
const POLICY = { takeRateBasisPoints: 2500, capturedAt: '2026-08-26T00:00:00Z' }

interface HostContext {
  hostId: string
  tableId: string
}

/**
 * A fresh table owned by whichever fixture household exists, with the owner
 * as the acting host. Booked and paid while the dinner is in the future.
 */
async function createTable(minimum = 1): Promise<HostContext> {
  const [row] = await sql<{ id: string; host_id: string }[]>`
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
      ${'dinnertest-' + crypto.randomUUID()},
      h.id, h.owner_profile_id, a.id,
      '20000000-0000-4000-8000-000000000001',
      now() + interval '10 days', 'Kadıköy', 'shared', 'Test menu',
      'd', 'warm', 'Household', 'i', 'i',
      6, 6, 6, ${minimum},
      45000, 60000,
      now() + interval '8 days', now() + interval '9 days',
      'published', now()
    from public.households h
    join public.household_private_addresses a on a.household_id = h.id
    limit 1
    returning id, lead_verified_host_id as host_id
  `
  return { hostId: row.host_id, tableId: row.id }
}

const bookings = new PostgresSofraWriteRepository(sql, TRAVELLER)
const ledger = new PostgresSofraPaymentWriteRepository(sql, TRAVELLER)

async function paidBooking(
  tableId: string,
  partySize = 2,
  dietaryDisclosure: string | null = null,
) {
  const booking = await bookings.createBooking({
    tableId,
    partySize,
    partyType: 'couple',
    primaryGuestName: 'Dinner Test',
    dietaryDisclosure,
    policySnapshot: POLICY,
  })
  await ledger.recordPaymentAuthorized({
    bookingId: booking.id,
    providerCode: 'mock',
    providerReference: `dinner-${booking.id}`,
    amountKurus: booking.guestTotalKurus,
    simulated: true,
  })
  return booking
}

/** The dinner is over: move every timestamp of the table into the past. */
async function timeTravelPastDinner(tableId: string) {
  await sql`
    update public.hosted_tables
    set starts_at = now() - interval '3 hours',
        booking_cutoff_at = now() - interval '2 days',
        roster_lock_at = now() - interval '1 day'
    where id = ${tableId}::uuid
  `
}

function host(hostId: string) {
  return new PostgresSofraHostWriteRepository(sql, hostId)
}

async function cleanup() {
  const scoped = sql`
    select b.id from public.bookings b
    join public.hosted_tables t on t.id = b.hosted_table_id
    where t.slug like 'dinnertest-%'
  `
  await sql`delete from public.audit_logs where entity_id in (${scoped})`
  await sql`
    delete from public.audit_logs
    where entity_id in (
      select id from public.hosted_tables where slug like 'dinnertest-%'
    )
  `
  await sql`delete from public.booking_check_ins where booking_id in (${scoped})`
  await sql`delete from public.refunds where booking_id in (${scoped})`
  await sql`delete from public.payment_records where booking_id in (${scoped})`
  await sql`
    delete from public.payout_records
    where hosted_table_id in (
      select id from public.hosted_tables where slug like 'dinnertest-%'
    )
  `
  await sql`
    delete from public.bookings
    where hosted_table_id in (
      select id from public.hosted_tables where slug like 'dinnertest-%'
    )
  `
  await sql`delete from public.hosted_tables where slug like 'dinnertest-%'`
}

beforeEach(cleanup)
afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('completing a dinner', () => {
  it('records attendance, completes bookings and table, and queues the payout', async () => {
    const { hostId, tableId } = await createTable()
    const attendedBooking = await paidBooking(tableId, 2)
    const noShowBooking = await paidBooking(tableId, 1)
    await timeTravelPastDinner(tableId)

    const result = await host(hostId).completeDinner({
      tableId,
      attendedBookingIds: [attendedBooking.id],
      noShowBookingIds: [noShowBooking.id],
    })

    expect(result.attendedCount).toBe(1)
    expect(result.noShowCount).toBe(1)
    // Both seats pay the host: the no-show tier refunds nothing.
    expect(result.payoutAmountKurus).toBe(
      attendedBooking.hostNetPayoutKurus + noShowBooking.hostNetPayoutKurus,
    )
    expect(result.payoutId).toBeTruthy()

    const rows = await sql<
      { id: string; status: string; completed_at: string | null }[]
    >`
      select id, status, completed_at from public.bookings
      where hosted_table_id = ${tableId}::uuid
      order by created_at
    `
    for (const row of rows) {
      expect(row.status).toBe('completed')
      expect(row.completed_at).not.toBeNull()
    }

    const checkIns = await sql<{ booking_id: string; attended: boolean }[]>`
      select booking_id, attended from public.booking_check_ins
      where hosted_table_id = ${tableId}::uuid
    `
    expect(
      checkIns.find((c) => c.booking_id === attendedBooking.id)?.attended,
    ).toBe(true)
    expect(
      checkIns.find((c) => c.booking_id === noShowBooking.id)?.attended,
    ).toBe(false)

    const [table] = await sql<{ status: string }[]>`
      select status from public.hosted_tables where id = ${tableId}::uuid
    `
    expect(table.status).toBe('completed')

    const [payout] = await sql<{ amount_kurus: number; status: string }[]>`
      select amount_kurus, status from public.payout_records
      where hosted_table_id = ${tableId}::uuid
    `
    expect(payout.status).toBe('pending')
    expect(payout.amount_kurus).toBe(result.payoutAmountKurus)

    const [audit] = await sql<
      { new_state: { attended_bookings: number; no_show_bookings: number } }[]
    >`
      select new_state from public.audit_logs
      where action = 'dinner.completed' and entity_id = ${tableId}::uuid
    `
    expect(audit.new_state.attended_bookings).toBe(1)
    expect(audit.new_state.no_show_bookings).toBe(1)

    // Completion is what unlocks the post-dinner channels: the traveller can
    // now review, which SF030 blocked before.
    const [completable] = await sql<{ status: string }[]>`
      select status from public.bookings where id = ${attendedBooking.id}::uuid
    `
    expect(completable.status).toBe('completed')
  })

  it('refuses before the start time', async () => {
    const { hostId, tableId } = await createTable()
    const booking = await paidBooking(tableId, 2)
    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [booking.id],
        noShowBookingIds: [],
      }),
    ).rejects.toMatchObject({ code: 'DINNER_NOT_STARTED' })
  })

  it('demands the lists cover exactly the confirmed roster', async () => {
    const { hostId, tableId } = await createTable()
    const first = await paidBooking(tableId, 2)
    const second = await paidBooking(tableId, 1)
    await timeTravelPastDinner(tableId)

    // Leaving one out, inventing one, and double-listing all fail.
    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [first.id],
        noShowBookingIds: [],
      }),
    ).rejects.toMatchObject({ code: 'ROSTER_MISMATCH' })
    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [first.id, crypto.randomUUID()],
        noShowBookingIds: [second.id],
      }),
    ).rejects.toMatchObject({ code: 'ROSTER_MISMATCH' })
    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [first.id, second.id],
        noShowBookingIds: [second.id],
      }),
    ).rejects.toMatchObject({ code: 'ROSTER_MISMATCH' })
  })

  it('refuses while a paid booking is still undecided', async () => {
    const { hostId, tableId } = await createTable()
    const confirmed = await paidBooking(tableId, 2)
    // A dietary disclosure parks the paid booking at payment_authorized
    // until operations decide compatibility — money is held, nothing final.
    const undecided = await paidBooking(tableId, 1, 'severe nut allergy')
    await timeTravelPastDinner(tableId)

    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [confirmed.id, undecided.id],
        noShowBookingIds: [],
      }),
    ).rejects.toMatchObject({ code: 'UNRESOLVED_BOOKINGS' })
  })

  it('cannot complete twice, and only the owning host can complete', async () => {
    const { hostId, tableId } = await createTable()
    const booking = await paidBooking(tableId, 2)
    await timeTravelPastDinner(tableId)

    await expect(
      host(TRAVELLER).completeDinner({
        tableId,
        attendedBookingIds: [booking.id],
        noShowBookingIds: [],
      }),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_FOUND' })

    await host(hostId).completeDinner({
      tableId,
      attendedBookingIds: [booking.id],
      noShowBookingIds: [],
    })
    await expect(
      host(hostId).completeDinner({
        tableId,
        attendedBookingIds: [booking.id],
        noShowBookingIds: [],
      }),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_EDITABLE' })
  })
})
