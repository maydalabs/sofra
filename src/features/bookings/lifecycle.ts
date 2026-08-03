import { DomainTransitionError } from '@/features/hosted-tables/lifecycle'

export const bookingStatuses = [
  'draft',
  'awaiting_payment',
  'payment_authorized',
  'pending_minimum',
  'confirmed',
  'cancelled',
  'refunded',
  'completed',
  'disputed',
] as const

export type BookingStatus = (typeof bookingStatuses)[number]

const allowedBookingTransitions: Readonly<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['payment_authorized', 'cancelled'],
  payment_authorized: ['pending_minimum', 'confirmed', 'cancelled', 'disputed'],
  pending_minimum: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'disputed'],
  cancelled: ['refunded'],
  refunded: [],
  completed: ['disputed'],
  disputed: [],
}

export function transitionBooking(from: BookingStatus, to: BookingStatus) {
  if (!allowedBookingTransitions[from].includes(to)) {
    throw new DomainTransitionError(
      'ILLEGAL_BOOKING_TRANSITION',
      `A booking cannot move from ${from} to ${to}.`,
      from,
      to,
    )
  }
  return to
}

export function assertBookingCanConfirm(input: {
  compatibilityRequired: boolean
  compatibilityDecision: 'accepted' | 'declined' | 'pending' | 'not_required'
}) {
  if (
    input.compatibilityRequired &&
    input.compatibilityDecision !== 'accepted'
  ) {
    throw new DomainTransitionError(
      'COMPATIBILITY_NOT_ACCEPTED',
      'Booking cannot be confirmed until menu compatibility is accepted.',
      'pending_compatibility',
      'confirmed',
    )
  }
}
