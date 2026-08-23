import type {
  BookingStatus,
  CompatibilityStatus,
  PaymentStatus,
} from '@/server/database/database.types'

export type BookingJourneyStepState =
  'complete' | 'current' | 'upcoming' | 'attention'

export type BookingJourneyMessage =
  | 'reservationRecorded'
  | 'compatibilityAccepted'
  | 'compatibilityNotRequired'
  | 'compatibilityPending'
  | 'compatibilityDeclined'
  | 'paymentAuthorized'
  | 'paymentCreated'
  | 'paymentNotStarted'
  | 'paymentFailed'
  | 'paymentRefunded'
  | 'paymentHeld'
  | 'tableAwaitingPrerequisites'
  | 'tablePendingMinimum'
  | 'tableConfirmed'
  | 'tableCompleted'
  | 'tableCancelled'
  | 'tableDisputed'
  | 'dinnerCompleted'
  | 'dinnerUpcoming'
  | 'dinnerStopped'

export interface BookingJourneyStep {
  id: 'reservation' | 'compatibility' | 'payment' | 'table' | 'dinner'
  state: BookingJourneyStepState
  message: BookingJourneyMessage
}

export function getTravelerBookingJourney(input: {
  bookingStatus: BookingStatus
  compatibilityStatus: CompatibilityStatus
  paymentStatus: PaymentStatus
}): BookingJourneyStep[] {
  return [
    {
      id: 'reservation',
      state: 'complete',
      message: 'reservationRecorded',
    },
    compatibilityStep(input.compatibilityStatus),
    paymentStep(input.paymentStatus),
    tableStep(input.bookingStatus),
    dinnerStep(input.bookingStatus),
  ]
}

function compatibilityStep(status: CompatibilityStatus): BookingJourneyStep {
  const variants: Record<
    CompatibilityStatus,
    Pick<BookingJourneyStep, 'state' | 'message'>
  > = {
    accepted: { state: 'complete', message: 'compatibilityAccepted' },
    not_required: {
      state: 'complete',
      message: 'compatibilityNotRequired',
    },
    pending: { state: 'current', message: 'compatibilityPending' },
    declined: { state: 'attention', message: 'compatibilityDeclined' },
  }
  return { id: 'compatibility', ...variants[status] }
}

function paymentStep(status: PaymentStatus): BookingJourneyStep {
  const variants: Record<
    PaymentStatus,
    Pick<BookingJourneyStep, 'state' | 'message'>
  > = {
    authorized: { state: 'complete', message: 'paymentAuthorized' },
    created: { state: 'current', message: 'paymentCreated' },
    not_started: { state: 'upcoming', message: 'paymentNotStarted' },
    failed: { state: 'attention', message: 'paymentFailed' },
    refunded: { state: 'complete', message: 'paymentRefunded' },
    held: { state: 'attention', message: 'paymentHeld' },
  }
  return { id: 'payment', ...variants[status] }
}

function tableStep(status: BookingStatus): BookingJourneyStep {
  if (status === 'pending_minimum') {
    return {
      id: 'table',
      state: 'current',
      message: 'tablePendingMinimum',
    }
  }
  if (status === 'confirmed') {
    return { id: 'table', state: 'complete', message: 'tableConfirmed' }
  }
  if (status === 'completed') {
    return { id: 'table', state: 'complete', message: 'tableCompleted' }
  }
  if (status === 'cancelled' || status === 'refunded') {
    return { id: 'table', state: 'attention', message: 'tableCancelled' }
  }
  if (status === 'disputed') {
    return { id: 'table', state: 'attention', message: 'tableDisputed' }
  }
  return {
    id: 'table',
    state: 'upcoming',
    message: 'tableAwaitingPrerequisites',
  }
}

function dinnerStep(status: BookingStatus): BookingJourneyStep {
  if (status === 'completed') {
    return { id: 'dinner', state: 'complete', message: 'dinnerCompleted' }
  }
  if (
    status === 'cancelled' ||
    status === 'refunded' ||
    status === 'disputed'
  ) {
    return { id: 'dinner', state: 'attention', message: 'dinnerStopped' }
  }
  return { id: 'dinner', state: 'upcoming', message: 'dinnerUpcoming' }
}
