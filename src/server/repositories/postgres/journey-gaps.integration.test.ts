import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresSofraHostWriteRepository } from './host-write-repository'
import { PostgresSofraOperatorWriteRepository } from './operator-write-repository'
import { PostgresSofraPostDinnerWriteRepository } from './post-dinner-write-repository'
import { PostgresReadGateway } from './gateway'
import { PostgresSofraReadRepository } from './read-repository'
import { PostgresSofraWriteRepository } from './write-repository'

const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

/** From db/fixtures.sql. */
const TRAVELLER = '10000000-0000-4000-8000-000000000008'
const OPERATOR = '10000000-0000-4000-8000-000000000009'
const HOST = '10000000-0000-4000-8000-000000000001' // Ayşe, certified host

const DISCLOSURE = 'SEVERE-NUT-ALLERGY-DISCLOSURE-7d1e'

const travellerWrites = new PostgresSofraWriteRepository(sql, TRAVELLER)
const operator = new PostgresSofraOperatorWriteRepository(sql, OPERATOR)
const hostWrites = new PostgresSofraHostWriteRepository(sql, HOST)

let tableId: string

async function cleanup() {
  // Reviews reference bookings without cascade, so they go first. Deleting a
  // booking does not restore available_seats, which is exactly why each test
  // gets its own fresh table instead of draining a shared fixture.
  await sql`
    delete from public.public_experience_reviews
    where booking_id in (
      select id from public.bookings where party_type = 'other'
    )
  `
  await sql`delete from public.bookings where party_type = 'other'`
  await sql`delete from public.audit_logs where actor_profile_id in (${TRAVELLER}::uuid, ${OPERATOR}::uuid, ${HOST}::uuid)`
  await sql`delete from public.hosted_tables where slug like 'gaptest-%'`
}

beforeEach(async () => {
  await cleanup()
  const [table] = await sql<{ id: string }[]>`
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
      ${'gaptest-' + crypto.randomUUID()},
      h.id, h.owner_profile_id, a.id,
      '20000000-0000-4000-8000-000000000001',
      now() + interval '10 days', 'Kadıköy', 'shared', 'Gap test menu',
      'd', 'warm', 'Household', 'i', 'i',
      4, 4, 4, 2, 45000, 60000,
      now() + interval '8 days', now() + interval '9 days',
      'published', now()
    from public.households h
    join public.household_private_addresses a on a.household_id = h.id
    limit 1
    returning id
  `
  tableId = table.id
})

afterAll(async () => {
  await cleanup()
  await sql.end()
})

function bookingInput(overrides: Record<string, unknown> = {}) {
  return {
    tableId,
    partySize: 2,
    partyType: 'other',
    policySnapshot: { takeRateBasisPoints: 2500 },
    primaryGuestName: 'Gezgin Yolcu',
    primaryGuestEmail: 'gezgin@sofra.invalid',
    additionalGuestNames: ['Arkadaş Yolcu'],
    ...overrides,
  }
}

describe('the booking carries its party', () => {
  it('stores the primary and additional guests', async () => {
    const booking = await travellerWrites.createBooking(bookingInput())
    const guests = await sql<
      { full_name: string; is_primary: boolean; email: string | null }[]
    >`
      select full_name, is_primary, email from public.booking_guests
      where booking_id = ${booking.id}::uuid
      order by is_primary desc
    `
    expect(guests).toHaveLength(2)
    expect(guests[0]).toMatchObject({
      full_name: 'Gezgin Yolcu',
      is_primary: true,
      email: 'gezgin@sofra.invalid',
    })
    expect(guests[1]).toMatchObject({
      full_name: 'Arkadaş Yolcu',
      is_primary: false,
    })
  })

  it('keeps compatibility not_required when nothing is disclosed', async () => {
    const booking = await travellerWrites.createBooking(bookingInput())
    expect(booking.compatibilityStatus).toBe('not_required')
  })

  it('stores a disclosure unclassified and marks compatibility pending', async () => {
    const booking = await travellerWrites.createBooking(
      bookingInput({ dietaryDisclosure: DISCLOSURE }),
    )
    expect(booking.compatibilityStatus).toBe('pending')

    const [disclosure] = await sql`
      select kind, importance, explanation from public.dietary_disclosures
      where booking_id = ${booking.id}::uuid
    `
    // Unclassified on purpose: severity is the reviewer's judgement, and
    // fabricating one at insert time would be a lie in a safety field.
    expect(disclosure.kind).toBe('undetermined')
    expect(disclosure.importance).toBe('undetermined')
    expect(disclosure.explanation).toBe(DISCLOSURE)
  })

  it('never lets guest names or dietary text into the audit trail', async () => {
    await travellerWrites.createBooking(
      bookingInput({ dietaryDisclosure: DISCLOSURE }),
    )
    const audits = await sql`select * from public.audit_logs`
    const serialised = JSON.stringify(audits)
    expect(serialised).not.toContain(DISCLOSURE)
    expect(serialised).not.toContain('Gezgin Yolcu')
    expect(serialised).not.toContain('Arkadaş Yolcu')
  })
})

describe('dietary compatibility decision', () => {
  it('moves pending to accepted and records the decision', async () => {
    const booking = await travellerWrites.createBooking(
      bookingInput({ dietaryDisclosure: DISCLOSURE }),
    )
    const decided = await operator.decideDietaryCompatibility(
      booking.id,
      'accepted',
      'Household confirmed a nut-free kitchen for this evening.',
    )
    expect(decided.compatibilityStatus).toBe('accepted')

    const [decision] = await sql`
      select * from public.dietary_compatibility_decisions
      where booking_id = ${booking.id}::uuid
    `
    expect(decision.reviewer_profile_id).toBe(OPERATOR)
  })

  it('refuses a decision from a non-operator, inside the database', async () => {
    const booking = await travellerWrites.createBooking(
      bookingInput({ dietaryDisclosure: DISCLOSURE }),
    )
    const intruder = new PostgresSofraOperatorWriteRepository(sql, TRAVELLER)
    await expect(
      intruder.decideDietaryCompatibility(booking.id, 'accepted'),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
  })

  it('refuses to decide twice', async () => {
    const booking = await travellerWrites.createBooking(
      bookingInput({ dietaryDisclosure: DISCLOSURE }),
    )
    await operator.decideDietaryCompatibility(booking.id, 'declined')
    await expect(
      operator.decideDietaryCompatibility(booking.id, 'accepted'),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })
})

describe('host address', () => {
  const address = {
    addressLine1: 'Cadde 12, Daire 3',
    district: 'Moda',
    city: 'İstanbul',
    arrivalInstructions: 'Ring the middle bell.',
  }

  it('saves and prefills through the read repository', async () => {
    const saved = await hostWrites.submitHostAddress(address)
    expect(saved.district).toBe('Moda')
    expect(saved.verifiedAt).toBeNull()

    const reads = new PostgresSofraReadRepository(
      new PostgresReadGateway(sql, HOST),
      HOST,
    )
    const current = await reads.findOwnHouseholdAddress()
    expect(current).toMatchObject({
      addressLine1: 'Cadde 12, Daire 3',
      arrivalInstructions: 'Ring the middle bell.',
    })
  })

  it('clears verification on every edit', async () => {
    await hostWrites.submitHostAddress(address)
    await sql`
      update public.household_private_addresses a
      set verified_at = now(), verified_by = ${OPERATOR}::uuid
      from public.households h
      where h.id = a.household_id and h.owner_profile_id = ${HOST}::uuid
    `
    const edited = await hostWrites.submitHostAddress({
      ...address,
      addressLine1: 'Yeni Cadde 5',
    })
    expect(edited.verifiedAt).toBeNull()
  })

  it('never writes the address text into the audit trail', async () => {
    await hostWrites.submitHostAddress(address)
    const audits = await sql`
      select * from public.audit_logs
      where action like 'household_address.%'
    `
    expect(audits.length).toBeGreaterThan(0)
    expect(JSON.stringify(audits)).not.toContain('Cadde')
    expect(JSON.stringify(audits)).not.toContain('Ring the middle bell')
  })

  it('rejects an address with the required parts missing', async () => {
    await expect(
      hostWrites.submitHostAddress({
        addressLine1: '   ',
        district: 'Moda',
        city: 'İstanbul',
      }),
    ).rejects.toMatchObject({ code: 'ADDRESS_INCOMPLETE' })
  })
})

describe('review moderation', () => {
  async function givenPendingReview() {
    const [booking] = await sql<{ id: string }[]>`
      insert into public.bookings (
        hosted_table_id, primary_traveler_id, party_size, party_type, status,
        host_net_payout_kurus, sofra_gross_fee_kurus, guest_total_kurus,
        take_rate_basis_points, policy_snapshot
      ) values (
        ${tableId}::uuid, ${TRAVELLER}::uuid, 2, 'other', 'completed',
        90000, 30000, 120000, 2500, '{}'::jsonb
      ) returning id
    `
    const postDinner = new PostgresSofraPostDinnerWriteRepository(
      sql,
      TRAVELLER,
    )
    return postDinner.submitPublicReview({
      bookingId: booking.id,
      rating: 5,
      title: 'GAPTEST A generous evening',
      body: 'A review body long enough for the domain rules to accept it.',
    })
  }

  it('publishing makes the review publicly visible', async () => {
    const review = await givenPendingReview()
    const moderated = await operator.moderatePublicReview(review.id, 'publish')
    expect(moderated.publishedAt).not.toBeNull()
    expect(moderated.rejectedAt).toBeNull()

    const visible = await sql`
      select 1 from public.public_experience_reviews
      where id = ${review.id}::uuid and published_at is not null
    `
    expect(visible).toHaveLength(1)
  })

  it('rejecting keeps the review, unpublished, with the decider recorded', async () => {
    const review = await givenPendingReview()
    const moderated = await operator.moderatePublicReview(
      review.id,
      'reject',
      'Names a private individual.',
    )
    expect(moderated.publishedAt).toBeNull()
    expect(moderated.rejectedAt).not.toBeNull()

    const [row] = await sql`
      select moderated_by, published_at from public.public_experience_reviews
      where id = ${review.id}::uuid
    `
    expect(row.moderated_by).toBe(OPERATOR)
    expect(row.published_at).toBeNull()
  })

  it('refuses to moderate the same review twice', async () => {
    const review = await givenPendingReview()
    await operator.moderatePublicReview(review.id, 'publish')
    await expect(
      operator.moderatePublicReview(review.id, 'reject'),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('never copies the review body into the audit trail', async () => {
    const review = await givenPendingReview()
    await operator.moderatePublicReview(review.id, 'publish')
    const audits = await sql`
      select * from public.audit_logs where action like 'public_review.%'
    `
    expect(JSON.stringify(audits)).not.toContain('long enough for the domain')
  })
})
