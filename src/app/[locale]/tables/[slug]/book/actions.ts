'use server'

import { ZodError } from 'zod'

import { developmentPolicy } from '@/features/policy/config'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertVerifiedEmail } from '@/server/authorization/roles'
import { getPaymentProvider } from '@/server/payments/mock-payment-provider'
import { getPublicSofraReadRepository } from '@/server/repositories/factory'
import {
  canPersistWrites,
  getSofraWriteRepository,
} from '@/server/repositories/write-factory'
import { BookingWriteError } from '@/server/repositories/write-contracts'
import {
  BookingIntentError,
  prepareBookingIntent,
  toBookingIntentReview,
} from '@/server/services/bookings'

/**
 * Maps a database-enforced write failure onto the same status vocabulary the
 * page already handles. The database is the authority: it re-checks seats,
 * cutoff, and party limits under a row lock, so a race that slips past the
 * in-process validation above still lands here rather than overselling.
 */
const statusByWriteCode = {
  TABLE_NOT_FOUND: 'table_unavailable',
  TABLE_NOT_BOOKABLE: 'table_unavailable',
  BOOKING_CUTOFF_PASSED: 'booking_closed',
  INSUFFICIENT_SEATS: 'seats_unavailable',
  PARTY_SIZE_INVALID: 'party_too_large',
  PRICING_POLICY_MISSING: 'table_unavailable',
  PRICING_INCONSISTENT: 'table_unavailable',
  BOOKING_NOT_OWNED: 'table_unavailable',
  BOOKING_NOT_FOUND: 'table_unavailable',
  BOOKING_NOT_CANCELLABLE: 'table_unavailable',
} as const

export async function simulateBookingAction(slug: string, rawInput: unknown) {
  const actor = await getCurrentActor()
  if (!actor) return { status: 'authentication_required' as const }
  assertVerifiedEmail(actor)
  const repository = await getPublicSofraReadRepository()
  const table = await repository.findPublicTableBySlug(slug)
  if (!table) return { status: 'table_unavailable' as const }

  let intent
  try {
    intent = prepareBookingIntent(rawInput, {
      table,
      policy: developmentPolicy,
      now: new Date(),
    })
  } catch (error) {
    if (error instanceof ZodError) return { status: 'invalid_request' as const }
    if (error instanceof BookingIntentError) {
      const statusByCode = {
        TABLE_UNAVAILABLE: 'table_unavailable',
        BOOKING_CLOSED: 'booking_closed',
        PARTY_TOO_LARGE: 'party_too_large',
      } as const
      return { status: statusByCode[error.code] }
    }
    throw error
  }

  const review = toBookingIntentReview(intent)

  // Without a durable store there is nothing honest to do but show the review.
  if (!canPersistWrites()) {
    return { status: 'payments_disabled' as const, review }
  }

  let booking
  try {
    const writes = await getSofraWriteRepository(actor.id)
    booking = await writes.createBooking({
      tableId: table.id,
      partySize: intent.partySize,
      partyType: intent.partyType,
      policySnapshot: {
        takeRateBasisPoints: developmentPolicy.takeRateBasisPoints,
        bookingCutoffHours: developmentPolicy.bookingCutoffHours,
        maximumSharedBookingPartySize:
          developmentPolicy.maximumSharedBookingPartySize,
        capturedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof BookingWriteError) {
      return { status: statusByWriteCode[error.code], review }
    }
    throw error
  }

  // The seat is now genuinely held. Payment is a separate, still-unmade
  // product decision, so we say so rather than implying the booking is paid.
  const paymentProvider = getPaymentProvider()
  if (!paymentProvider) {
    return {
      status: 'reserved_payment_pending' as const,
      bookingId: booking.id,
      review,
    }
  }

  const payment = await paymentProvider.createCheckout({
    bookingId: booking.id,
    amountKurus: booking.guestTotalKurus,
    currency: booking.currency,
    deterministicOutcome: 'success',
  })

  return {
    status:
      payment.status === 'authorized'
        ? ('simulated_success' as const)
        : ('simulated_failure' as const),
    bookingId: booking.id,
    paymentReference: payment.reference,
    review,
  }
}
