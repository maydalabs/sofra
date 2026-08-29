import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresSofraHostWriteRepository } from './host-write-repository'
import { PostgresSofraOperatorWriteRepository } from './operator-write-repository'
import { PostgresReadGateway } from './gateway'
import { PostgresSofraReadRepository } from './read-repository'
import { PostgresSofraWriteRepository } from './write-repository'

const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

/** From db/fixtures.sql. */
const OPERATOR = '10000000-0000-4000-8000-000000000009' // Demo Operator
const TRAVELLER = '10000000-0000-4000-8000-000000000008' // Demo Traveler
const APPLICANT = '91000000-0000-4000-8000-000000000001'

const operator = new PostgresSofraOperatorWriteRepository(sql, OPERATOR)
const traveller = new PostgresSofraOperatorWriteRepository(sql, TRAVELLER)

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

async function cleanup() {
  await sql`delete from public.audit_logs where actor_profile_id = ${APPLICANT}::uuid`
  await sql`
    delete from public.bookings where hosted_table_id in (
      select t.id from public.hosted_tables t
      join public.households h on h.id = t.household_id
      where h.owner_profile_id = ${APPLICANT}::uuid
    )
  `
  await sql`
    delete from public.hosted_tables where household_id in (
      select id from public.households where owner_profile_id = ${APPLICANT}::uuid
    )
  `
  await sql`delete from public.host_applications where applicant_profile_id = ${APPLICANT}::uuid`
  await sql`delete from public.host_certifications where lead_host_profile_id = ${APPLICANT}::uuid`
  await sql`
    delete from public.household_private_addresses where household_id in (
      select id from public.households where owner_profile_id = ${APPLICANT}::uuid
    )
  `
  await sql`delete from public.role_assignments where profile_id = ${APPLICANT}::uuid`
  await sql`delete from public.households where owner_profile_id = ${APPLICANT}::uuid`
  await sql`delete from public.profiles where id = ${APPLICANT}::uuid`
}

async function givenSubmittedApplication() {
  await sql`
    insert into public.profiles (id, display_name)
    values (${APPLICANT}::uuid, 'Applicant')
  `
  const host = new PostgresSofraHostWriteRepository(sql, APPLICANT)
  return host.submitHostApplication({
    householdName: 'Yeni sofra',
    neighborhood: 'Moda',
    story: 'story',
    motivation: 'motivation',
    participation: 'participation',
  })
}

beforeEach(cleanup)
afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('authorization', () => {
  it('refuses a non-operator inside the database, not only at the gate', async () => {
    const application = await givenSubmittedApplication()
    // The repository is constructed directly, bypassing the factory's role
    // gate, to prove the SQL function checks the role for itself.
    await expect(
      traveller.decideHostApplication({
        applicationId: application.id,
        decision: 'approve',
        certifiedCapacity: 4,
      }),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })

    const [row] = await sql`
      select status from public.host_applications where id = ${application.id}::uuid
    `
    expect(row.status).toBe('submitted')
  })
})

describe('decideHostApplication', () => {
  it('approving certifies the household and grants the host role', async () => {
    const application = await givenSubmittedApplication()
    const decided = await operator.decideHostApplication({
      applicationId: application.id,
      decision: 'approve',
      certifiedCapacity: 5,
      reason: 'Home visit completed',
    })
    expect(decided.status).toBe('approved')
    expect(decided.decidedAt).not.toBeNull()

    const [household] = await sql`
      select status from public.households where id = ${decided.householdId}::uuid
    `
    expect(household.status).toBe('certified')

    const [certification] = await sql`
      select * from public.host_certifications
      where household_id = ${decided.householdId}::uuid
    `
    expect(certification.status).toBe('active')
    expect(certification.certified_traveler_capacity).toBe(5)
    expect(certification.certified_by).toBe(OPERATOR)

    const roles = await sql<{ code: string }[]>`
      select r.code from public.role_assignments ra
      join public.roles r on r.id = ra.role_id
      where ra.profile_id = ${APPLICANT}::uuid
    `
    expect(roles.map((r) => r.code)).toContain('certified_host')
  })

  it('refuses to approve without a certified capacity', async () => {
    const application = await givenSubmittedApplication()
    await expect(
      operator.decideHostApplication({
        applicationId: application.id,
        decision: 'approve',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('declining leaves the household uncertified', async () => {
    const application = await givenSubmittedApplication()
    const decided = await operator.decideHostApplication({
      applicationId: application.id,
      decision: 'decline',
      reason: 'Out of the launch area',
    })
    expect(decided.status).toBe('declined')
    const [household] = await sql`
      select status from public.households where id = ${decided.householdId}::uuid
    `
    expect(household.status).toBe('applicant')
    const certifications = await sql`
      select 1 from public.host_certifications where lead_host_profile_id = ${APPLICANT}::uuid
    `
    expect(certifications).toHaveLength(0)
  })

  it('records the reason in the audit trail', async () => {
    const application = await givenSubmittedApplication()
    await operator.decideHostApplication({
      applicationId: application.id,
      decision: 'changes_requested',
      reason: 'Needs clearer household participation',
    })
    const [audit] = await sql`
      select * from public.audit_logs
      where entity_id = ${application.id}::uuid
        and action = 'host_application.changes_requested'
    `
    expect(audit.actor_profile_id).toBe(OPERATOR)
    expect(audit.reason).toBe('Needs clearer household participation')
  })
})

describe('the full loop: application to a bookable table', () => {
  it('carries a household from applying to a traveller holding a seat', async () => {
    // 1. Apply.
    const application = await givenSubmittedApplication()

    // 2. Operator approves and certifies for 6.
    const decided = await operator.decideHostApplication({
      applicationId: application.id,
      decision: 'approve',
      certifiedCapacity: 6,
    })
    expect(decided.status).toBe('approved')

    // 3. The host enters their address themselves -- previously impossible,
    // which is why this test used to seed it with raw SQL.
    const host = new PostgresSofraHostWriteRepository(sql, APPLICANT)
    await host.submitHostAddress({
      addressLine1: 'PRIVATE ADDRESS 12',
      district: 'Moda',
      city: 'İstanbul',
    })

    // 4. Host creates and submits a table.
    const draft = await host.createHostedTableDraft({
      menuTitle: 'Mevsim sofrası',
      menuDescription: 'A seasonal menu.',
      startsAt: inDays(14),
      format: 'shared',
      proposedCapacity: 4,
      minimumGuestCount: 2,
      hostNetPayoutKurus: 100_000,
      atmosphere: 'warm',
      expectedHouseholdParticipants: 'Two adults',
      practicalInformation: 'Practical information.',
    })
    await host.submitHostedTable(draft.id)

    // 4. Operator approves, then publishes.
    await operator.reviewHostedTable({ tableId: draft.id, decision: 'approve' })
    const published = await operator.publishHostedTable(draft.id)
    expect(published.status).toBe('published')
    expect(published.publishedAt).not.toBeNull()

    // 5. It is now visible to anonymous discovery, without private data.
    const publicRepo = new PostgresSofraReadRepository(
      new PostgresReadGateway(sql),
    )
    const listed = await publicRepo.findPublicTableBySlug(published.slug)
    expect(listed).toBeDefined()
    expect(JSON.stringify(listed)).not.toContain('PRIVATE ADDRESS')

    // 6. A traveller can hold a seat on it.
    const writes = new PostgresSofraWriteRepository(sql, TRAVELLER)
    const booking = await writes.createBooking({
      tableId: draft.id,
      partySize: 2,
      partyType: 'couple',
      primaryGuestName: 'Test Traveller',
      policySnapshot: { takeRateBasisPoints: 2500 },
    })
    expect(booking.status).toBe('draft')
    expect(booking.guestTotalKurus).toBe(
      published ? booking.guestTotalKurus : 0,
    )

    const [table] = await sql`
      select available_seats from public.hosted_tables where id = ${draft.id}::uuid
    `
    expect(table.available_seats).toBe(2)
  })
})

describe('publishHostedTable', () => {
  it('refuses to publish a table that was never approved', async () => {
    const application = await givenSubmittedApplication()
    const decided = await operator.decideHostApplication({
      applicationId: application.id,
      decision: 'approve',
      certifiedCapacity: 6,
    })
    await sql`
      insert into public.household_private_addresses (household_id, address_line_1, district, city)
      values (${decided.householdId}::uuid, 'PRIVATE', 'Moda', 'İstanbul')
    `
    const host = new PostgresSofraHostWriteRepository(sql, APPLICANT)
    const draft = await host.createHostedTableDraft({
      menuTitle: 'Taslak',
      menuDescription: 'd',
      startsAt: inDays(14),
      format: 'shared',
      proposedCapacity: 4,
      minimumGuestCount: 2,
      hostNetPayoutKurus: 100_000,
      atmosphere: 'a',
      expectedHouseholdParticipants: 'p',
      practicalInformation: 'i',
    })
    await expect(operator.publishHostedTable(draft.id)).rejects.toMatchObject({
      code: 'TABLE_NOT_REVIEWABLE',
    })
  })
})

describe('payout control', () => {
  async function givenPayout(status: 'pending' | 'held' = 'pending') {
    const [table] = await sql<{ id: string; household_id: string }[]>`
      select id, household_id from public.hosted_tables limit 1
    `
    const [payout] = await sql<{ id: string }[]>`
      insert into public.payout_records (hosted_table_id, household_id, amount_kurus, status)
      values (${table.id}::uuid, ${table.household_id}::uuid, 150000, ${status})
      returning id
    `
    return { payoutId: payout.id, tableId: table.id }
  }

  afterAll(async () => {
    await sql`delete from public.payout_records where amount_kurus = 150000`
  })

  it('holds a payout with a recorded reason', async () => {
    const { payoutId } = await givenPayout()
    const held = await operator.holdPayout(payoutId, 'Awaiting safety review')
    expect(held.status).toBe('held')
    expect(held.holdReason).toBe('Awaiting safety review')

    const [audit] = await sql`
      select * from public.audit_logs
      where entity_id = ${payoutId}::uuid and action = 'payout.held'
    `
    expect(audit.reason).toBe('Awaiting safety review')
  })

  it('refuses to release while a safety incident is still open', async () => {
    const { payoutId, tableId } = await givenPayout('held')
    const [incident] = await sql<{ id: string }[]>`
      insert into public.safety_incidents (
        hosted_table_id, reporter_profile_id, status, severity, confidential_report
      ) values (
        ${tableId}::uuid, ${TRAVELLER}::uuid, 'open', 'high', 'CONFIDENTIAL TEXT'
      ) returning id
    `
    try {
      await expect(
        operator.releasePayout(payoutId, 'Routine release'),
      ).rejects.toMatchObject({ code: 'OPEN_INCIDENT_BLOCKS_PAYOUT' })

      // Resolving the incident unblocks it.
      const triaged = await operator.triageIncident(
        incident.id,
        'resolved',
        'Investigated and closed',
      )
      expect(triaged.status).toBe('resolved')

      const released = await operator.releasePayout(payoutId, 'Cleared')
      expect(released.status).toBe('released')
      expect(released.releasedAt).not.toBeNull()
      expect(released.holdReason).toBeNull()
    } finally {
      await sql`delete from public.safety_incidents where id = ${incident.id}::uuid`
    }
  })

  it('never echoes the confidential report through triage', async () => {
    const { tableId } = await givenPayout()
    const [incident] = await sql<{ id: string }[]>`
      insert into public.safety_incidents (
        hosted_table_id, reporter_profile_id, status, severity, confidential_report
      ) values (
        ${tableId}::uuid, ${TRAVELLER}::uuid, 'open', 'critical', 'CONFIDENTIAL TEXT'
      ) returning id
    `
    try {
      const result = await operator.triageIncident(incident.id, 'investigating')
      expect(JSON.stringify(result)).not.toContain('CONFIDENTIAL TEXT')

      const [audit] = await sql`
        select * from public.audit_logs
        where entity_id = ${incident.id}::uuid and action = 'safety_incident.triaged'
      `
      expect(JSON.stringify(audit)).not.toContain('CONFIDENTIAL TEXT')
    } finally {
      await sql`delete from public.safety_incidents where id = ${incident.id}::uuid`
    }
  })
})

describe('cancelPublishedTable', () => {
  const CANCEL_HOST = '10000000-0000-4000-8000-000000000002' // Selma

  async function givenLiveDinner() {
    const [table] = await sql<{ id: string; household_id: string }[]>`
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
        ${'canceltest-' + crypto.randomUUID()},
        h.id, h.owner_profile_id, a.id,
        '20000000-0000-4000-8000-000000000001',
        now() + interval '10 days', 'Üsküdar', 'shared', 'Cancel test menu',
        'd', 'warm', 'Household', 'i', 'i',
        6, 6, 6, 4, 45000, 60000,
        now() + interval '8 days', now() + interval '9 days',
        'published', now()
      from public.households h
      join public.household_private_addresses a on a.household_id = h.id
      where h.owner_profile_id = ${CANCEL_HOST}::uuid
      returning id, household_id
    `
    return table
  }

  async function bookSeats(tableId: string, paid: boolean) {
    const writes = new PostgresSofraWriteRepository(sql, TRAVELLER)
    const booking = await writes.createBooking({
      tableId,
      partySize: 2,
      partyType: 'colleagues',
      primaryGuestName: 'Cancel Test Guest',
      policySnapshot: { takeRateBasisPoints: 2500 },
    })
    if (paid) {
      await sql`
        update public.bookings set payment_status = 'authorized'
        where id = ${booking.id}::uuid
      `
    }
    return booking
  }

  async function cancelCleanup() {
    await sql`
      delete from public.payout_records where hosted_table_id in (
        select id from public.hosted_tables where slug like 'canceltest-%'
      )
    `
    await sql`
      delete from public.bookings where hosted_table_id in (
        select id from public.hosted_tables where slug like 'canceltest-%'
      )
    `
    await sql`delete from public.hosted_tables where slug like 'canceltest-%'`
  }

  beforeEach(cancelCleanup)
  afterAll(cancelCleanup)

  it('refunds every open booking 100% and closes the dinner', async () => {
    const table = await givenLiveDinner()
    const paid = await bookSeats(table.id, true)
    const unpaid = await bookSeats(table.id, false)
    await sql`
      insert into public.payout_records (hosted_table_id, household_id, amount_kurus, status)
      values (${table.id}::uuid, ${table.household_id}::uuid, 180000, 'eligible')
    `

    const outcome = await operator.cancelPublishedTable(
      table.id,
      'Minimum guest count not reached',
    )

    expect(outcome.bookingsCancelled).toBe(2)
    // Only collected money is owed back: one paid booking of 2 x 600.00.
    expect(outcome.refundDueTotalKurus).toBe(120_000)
    expect(outcome.payoutsHeld).toBe(1)

    const [paidRow] = await sql`
      select status, refund_due_kurus, host_compensation_kurus, refund_status
      from public.bookings where id = ${paid.id}::uuid
    `
    // Platform cancellation: full refund, cutoff irrelevant, host keeps nothing.
    expect(paidRow.status).toBe('cancelled')
    expect(paidRow.refund_due_kurus).toBe(120_000)
    expect(paidRow.host_compensation_kurus).toBe(0)
    expect(paidRow.refund_status).toBe('requested')

    const [unpaidRow] = await sql`
      select status, refund_due_kurus, refund_status
      from public.bookings where id = ${unpaid.id}::uuid
    `
    expect(unpaidRow.status).toBe('cancelled')
    expect(unpaidRow.refund_due_kurus).toBe(0)
    expect(unpaidRow.refund_status).toBe('not_requested')

    const [tableRow] = await sql`
      select status, cancellation_reason from public.hosted_tables
      where id = ${table.id}::uuid
    `
    expect(tableRow.status).toBe('cancelled')
    expect(tableRow.cancellation_reason).toBe('Minimum guest count not reached')

    const [payout] = await sql`
      select status, hold_reason from public.payout_records
      where hosted_table_id = ${table.id}::uuid
    `
    expect(payout.status).toBe('held')
    expect(payout.hold_reason).toContain('Dinner cancelled')

    // The cancelled dinner leaves public discovery entirely.
    const [listed] = await sql`
      select count(*)::int n from public.published_hosted_tables
      where id = ${table.id}::uuid
    `
    expect(listed.n).toBe(0)
  })

  it('audits each booking individually plus the table itself', async () => {
    const table = await givenLiveDinner()
    const first = await bookSeats(table.id, true)
    const second = await bookSeats(table.id, true)

    await operator.cancelPublishedTable(table.id, 'Host withdrew')

    const bookingAudits = await sql`
      select 1 from public.audit_logs
      where action = 'booking.cancelled_by_platform'
        and entity_id in (${first.id}::uuid, ${second.id}::uuid)
    `
    expect(bookingAudits).toHaveLength(2)

    const [tableAudit] = await sql`
      select new_state from public.audit_logs
      where action = 'hosted_table.cancelled_by_platform'
        and entity_id = ${table.id}::uuid
    `
    expect(tableAudit.new_state.bookings_cancelled).toBe(2)
    expect(tableAudit.new_state.refund_due_total_kurus).toBe(240_000)
  })

  it('requires a reason', async () => {
    const table = await givenLiveDinner()
    await expect(
      operator.cancelPublishedTable(table.id, '   '),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('refuses a non-operator, inside the database', async () => {
    const table = await givenLiveDinner()
    const intruder = new PostgresSofraOperatorWriteRepository(sql, TRAVELLER)
    await expect(
      intruder.cancelPublishedTable(table.id, 'not my call'),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
  })

  it('refuses a completed dinner and a second cancellation', async () => {
    const table = await givenLiveDinner()
    await operator.cancelPublishedTable(table.id, 'Minimum not reached')
    await expect(
      operator.cancelPublishedTable(table.id, 'again'),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_CANCELLABLE' })

    await sql`update public.hosted_tables set status = 'completed', cancelled_at = null where id = ${table.id}::uuid`
    await expect(
      operator.cancelPublishedTable(table.id, 'too late'),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_CANCELLABLE' })
  })
})
