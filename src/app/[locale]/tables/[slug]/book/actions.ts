'use server'

import { ZodError } from 'zod'

import { developmentPolicy } from '@/features/policy/config'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertVerifiedEmail } from '@/server/authorization/roles'
import { getPaymentProvider } from '@/server/payments/mock-payment-provider'
import { getPublicSofraReadRepository } from '@/server/repositories/factory'
import {
  BookingIntentError,
  prepareBookingIntent,
  toBookingIntentReview,
} from '@/server/services/bookings'

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

  const paymentProvider = getPaymentProvider()
  if (!paymentProvider) {
    return {
      status: 'payments_disabled' as const,
      review: toBookingIntentReview(intent),
    }
  }

  const bookingId = `demo-booking-${actor.id}-${table.id}`
  const payment = await paymentProvider.createCheckout({
    bookingId,
    amountKurus: intent.guestTotalKurus,
    currency: intent.currency,
    deterministicOutcome: 'success',
  })
  return {
    status:
      payment.status === 'authorized'
        ? ('simulated_success' as const)
        : ('simulated_failure' as const),
    bookingId,
    paymentReference: payment.reference,
    review: toBookingIntentReview(intent),
  }
}
