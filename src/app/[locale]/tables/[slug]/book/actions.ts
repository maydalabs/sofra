'use server'

import { bookingRequestSchema } from '@/features/bookings/schemas'
import { getPublicDemoTable } from '@/features/hosted-tables/demo-tables'
import { assertVerifiedEmail } from '@/server/authorization/roles'
import { getCurrentActor } from '@/server/auth/current-actor'
import { getPaymentProvider } from '@/server/payments/mock-payment-provider'

export async function simulateBookingAction(slug: string, rawInput: unknown) {
  const actor = await getCurrentActor()
  if (!actor) return { status: 'authentication_required' as const }
  assertVerifiedEmail(actor)
  const input = bookingRequestSchema.parse(rawInput)
  const table = getPublicDemoTable(slug)
  if (!table) return { status: 'table_unavailable' as const }
  if (input.partySize > table.availableSeats)
    return { status: 'table_unavailable' as const }
  if (table.format === 'shared' && input.partySize > 2) {
    return { status: 'party_too_large' as const }
  }

  const paymentProvider = getPaymentProvider()
  if (!paymentProvider) {
    return { status: 'payments_disabled' as const }
  }

  const bookingId = `demo-booking-${actor.id}-${table.id}`
  const payment = await paymentProvider.createCheckout({
    bookingId,
    amountKurus: table.guestPriceKurus * input.partySize,
    currency: table.currency,
    deterministicOutcome: 'success',
  })
  return {
    status:
      payment.status === 'authorized'
        ? ('simulated_success' as const)
        : ('simulated_failure' as const),
    bookingId,
    paymentReference: payment.reference,
  }
}
