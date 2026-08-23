import { describe, expect, it } from 'vitest'

import { getTravelerBookingJourney } from './traveler-journey'

describe('traveler booking journey', () => {
  it('shows an authorized booking waiting for the shared-table minimum', () => {
    const steps = getTravelerBookingJourney({
      bookingStatus: 'pending_minimum',
      compatibilityStatus: 'accepted',
      paymentStatus: 'authorized',
    })

    expect(steps).toMatchObject([
      { id: 'reservation', state: 'complete' },
      { id: 'compatibility', state: 'complete' },
      { id: 'payment', state: 'complete' },
      { id: 'table', state: 'current', message: 'tablePendingMinimum' },
      { id: 'dinner', state: 'upcoming' },
    ])
  })

  it('keeps a pending compatibility decision visible before confirmation', () => {
    const steps = getTravelerBookingJourney({
      bookingStatus: 'payment_authorized',
      compatibilityStatus: 'pending',
      paymentStatus: 'authorized',
    })

    expect(steps.find((step) => step.id === 'compatibility')).toMatchObject({
      state: 'current',
      message: 'compatibilityPending',
    })
    expect(steps.find((step) => step.id === 'table')).toMatchObject({
      state: 'upcoming',
    })
  })

  it('marks a cancelled journey as stopped without inventing a refund result', () => {
    const steps = getTravelerBookingJourney({
      bookingStatus: 'cancelled',
      compatibilityStatus: 'not_required',
      paymentStatus: 'authorized',
    })

    expect(steps.find((step) => step.id === 'table')).toMatchObject({
      state: 'attention',
      message: 'tableCancelled',
    })
    expect(steps.find((step) => step.id === 'dinner')).toMatchObject({
      state: 'attention',
      message: 'dinnerStopped',
    })
  })
})
