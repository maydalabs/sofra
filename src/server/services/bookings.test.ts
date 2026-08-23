import { describe, expect, it } from 'vitest'

import { getPublicDemoTables } from '@/features/hosted-tables/demo-tables'
import { developmentPolicy } from '@/features/policy/config'

import {
  BookingIntentError,
  prepareBookingCancellation,
  prepareBookingIntent,
  toBookingIntentReview,
} from './bookings'

const table = getPublicDemoTables().find(
  (candidate) => candidate.slug === 'ayse-levent-sunday-table',
)!

const validRequest = {
  partySize: 1,
  partyType: 'solo' as const,
  primaryName: 'Demo Traveler',
  primaryEmail: 'traveler@sofra.example',
  additionalGuests: '',
  dietaryNeeds: 'none' as const,
  dietaryDisclosure: '',
  compatibilityAcknowledged: true,
  tablePolicyAcknowledged: true,
}

describe('booking service', () => {
  it('prepares an integer-price intent from the current policy and table state', () => {
    const intent = prepareBookingIntent(validRequest, {
      table,
      policy: developmentPolicy,
      now: new Date(),
    })

    expect(intent).toMatchObject({
      partySize: 1,
      compatibilityStatus: 'not_required',
      guestTotalKurus: table.guestPriceKurus,
      currency: 'TRY',
      statusBeforePayment: 'awaiting_payment',
      statusAfterPayment: 'confirmed',
    })
    expect(Number.isSafeInteger(intent.guestTotalKurus)).toBe(true)
  })

  it('keeps a booking payment-authorized while compatibility is pending', () => {
    const intent = prepareBookingIntent(
      {
        ...validRequest,
        dietaryNeeds: 'review_required',
        dietaryDisclosure: 'A fictional allergy for compatibility review.',
      },
      { table, policy: developmentPolicy, now: new Date() },
    )

    expect(intent.compatibilityStatus).toBe('pending')
    expect(intent.statusAfterPayment).toBe('payment_authorized')
    expect(intent.privateDietaryDisclosure).toContain('fictional allergy')
    expect(JSON.stringify(toBookingIntentReview(intent))).not.toContain(
      'fictional allergy',
    )
  })

  it('enforces configurable shared-party capacity and the booking cutoff', () => {
    expect(() =>
      prepareBookingIntent(
        {
          ...validRequest,
          partySize: 3,
          partyType: 'friends',
          additionalGuests: 'Guest One\nGuest Two',
        },
        { table, policy: developmentPolicy, now: new Date() },
      ),
    ).toThrow(BookingIntentError)

    expect(() =>
      prepareBookingIntent(validRequest, {
        table,
        policy: developmentPolicy,
        now: new Date(table.bookingCutoffAt),
      }),
    ).toThrow(/cutoff/i)
  })

  it('requires one private additional-guest name per extra seat', () => {
    expect(() =>
      prepareBookingIntent(
        { ...validRequest, partySize: 2, partyType: 'couple' },
        { table, policy: developmentPolicy, now: new Date() },
      ),
    ).toThrow(/exactly 1 additional guest name/i)
  })

  it('validates cancellation without deciding the open refund policy', () => {
    expect(prepareBookingCancellation('confirmed')).toEqual({
      nextStatus: 'cancelled',
      refundOutcome: 'policy_pending',
    })
    expect(() => prepareBookingCancellation('completed')).toThrow(
      /cannot move/i,
    )
  })
})
