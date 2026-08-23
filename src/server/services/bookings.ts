import 'server-only'

import type { PublicHostedTable } from '@/features/hosted-tables/types'
import {
  bookingRequestSchema,
  parseAdditionalGuestNames,
} from '@/features/bookings/schemas'
import {
  assertBookingCanConfirm,
  transitionBooking,
  type BookingStatus,
} from '@/features/bookings/lifecycle'
import type { MarketplacePolicy } from '@/features/policy/config'

export type BookingIntentErrorCode =
  'TABLE_UNAVAILABLE' | 'BOOKING_CLOSED' | 'PARTY_TOO_LARGE'

export class BookingIntentError extends Error {
  constructor(
    readonly code: BookingIntentErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BookingIntentError'
  }
}

export interface BookingIntent {
  partySize: number
  partyType: string
  additionalGuestNames: string[]
  privateDietaryDisclosure: string | null
  compatibilityStatus: 'not_required' | 'pending'
  guestTotalKurus: number
  currency: 'TRY'
  statusBeforePayment: 'awaiting_payment'
  statusAfterPayment: 'payment_authorized' | 'pending_minimum' | 'confirmed'
}

export interface BookingIntentReview {
  partySize: number
  guestTotalKurus: number
  compatibilityStatus: BookingIntent['compatibilityStatus']
  bookingStatus: BookingIntent['statusBeforePayment']
}

export function prepareBookingIntent(
  rawInput: unknown,
  context: {
    table: PublicHostedTable
    policy: Pick<MarketplacePolicy, 'maximumSharedBookingPartySize'>
    now: Date
  },
): BookingIntent {
  const input = bookingRequestSchema.parse(rawInput)
  const { table, policy, now } = context

  if (!['published', 'minimum_reached', 'confirmed'].includes(table.status)) {
    throw new BookingIntentError(
      'TABLE_UNAVAILABLE',
      'This table is not accepting booking requests',
    )
  }
  const bookingCutoffTime = new Date(table.bookingCutoffAt).getTime()
  if (!Number.isFinite(bookingCutoffTime)) {
    throw new BookingIntentError(
      'TABLE_UNAVAILABLE',
      'The table has an invalid booking cutoff',
    )
  }
  if (now.getTime() >= bookingCutoffTime) {
    throw new BookingIntentError(
      'BOOKING_CLOSED',
      'The booking cutoff for this table has passed',
    )
  }
  if (input.partySize > table.availableSeats) {
    throw new BookingIntentError(
      'TABLE_UNAVAILABLE',
      'The requested number of seats is no longer available',
    )
  }
  if (
    table.format === 'shared' &&
    input.partySize > policy.maximumSharedBookingPartySize
  ) {
    throw new BookingIntentError(
      'PARTY_TOO_LARGE',
      'The party exceeds the current shared-table booking limit',
    )
  }

  const compatibilityStatus =
    input.dietaryNeeds === 'review_required' ? 'pending' : 'not_required'
  const guestTotalKurus = table.guestPriceKurus * input.partySize
  if (!Number.isSafeInteger(guestTotalKurus)) {
    throw new TypeError('Booking total must be a safe integer amount in kuruş')
  }

  return {
    partySize: input.partySize,
    partyType: input.partyType,
    additionalGuestNames: parseAdditionalGuestNames(input.additionalGuests),
    privateDietaryDisclosure:
      input.dietaryNeeds === 'review_required' ? input.dietaryDisclosure : null,
    compatibilityStatus,
    guestTotalKurus,
    currency: table.currency,
    statusBeforePayment: 'awaiting_payment',
    statusAfterPayment: statusAfterPayment(
      table,
      input.partySize,
      compatibilityStatus,
    ),
  }
}

export function toBookingIntentReview(
  intent: BookingIntent,
): BookingIntentReview {
  return {
    partySize: intent.partySize,
    guestTotalKurus: intent.guestTotalKurus,
    compatibilityStatus: intent.compatibilityStatus,
    bookingStatus: intent.statusBeforePayment,
  }
}

export function prepareBookingCancellation(currentStatus: BookingStatus) {
  return {
    nextStatus: transitionBooking(currentStatus, 'cancelled'),
    refundOutcome: 'policy_pending' as const,
  }
}

function statusAfterPayment(
  table: PublicHostedTable,
  partySize: number,
  compatibilityStatus: BookingIntent['compatibilityStatus'],
): BookingIntent['statusAfterPayment'] {
  const authorizedStatus = transitionBooking(
    'awaiting_payment',
    'payment_authorized',
  ) as 'payment_authorized'
  if (compatibilityStatus === 'pending') return authorizedStatus

  const reservedTravelerCount = table.certifiedCapacity - table.availableSeats
  const minimumReached =
    reservedTravelerCount + partySize >= table.minimumGuestCount
  if (
    table.format === 'private' ||
    table.guaranteedOperation ||
    minimumReached ||
    table.status === 'minimum_reached' ||
    table.status === 'confirmed'
  ) {
    assertBookingCanConfirm({
      compatibilityRequired: false,
      compatibilityDecision: compatibilityStatus,
    })
    return transitionBooking(authorizedStatus, 'confirmed') as 'confirmed'
  }
  return transitionBooking(
    authorizedStatus,
    'pending_minimum',
  ) as 'pending_minimum'
}
