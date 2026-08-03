import { describe, expect, it } from 'vitest'

import { assertBookingCanConfirm, transitionBooking } from './lifecycle'

describe('booking lifecycle', () => {
  it('moves an authorized booking through minimum to confirmation', () => {
    expect(transitionBooking('payment_authorized', 'pending_minimum')).toBe(
      'pending_minimum',
    )
    expect(transitionBooking('pending_minimum', 'confirmed')).toBe('confirmed')
  })

  it('rejects confirmation when required compatibility is pending', () => {
    expect(() =>
      assertBookingCanConfirm({
        compatibilityRequired: true,
        compatibilityDecision: 'pending',
      }),
    ).toThrow(/compatibility/i)
  })

  it('does not return refunded bookings to a live state', () => {
    expect(() => transitionBooking('refunded', 'confirmed')).toThrow(
      /cannot move/i,
    )
  })
})
