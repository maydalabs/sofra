import { describe, expect, it } from 'vitest'

import { MockPaymentProvider } from './mock-payment-provider'
import type { CreateCheckoutInput } from './types'

const baseInput: Omit<CreateCheckoutInput, 'bookingId'> = {
  amountKurus: 160_000,
  hostNetPayoutKurus: 120_000,
  hostPayeeReference: null,
  currency: 'TRY',
  buyer: {
    id: 'traveler-1',
    name: 'Alex',
    surname: 'Traveller',
    email: 'alex@example.com',
    ip: '127.0.0.1',
  },
  callbackUrl: 'http://localhost:3000/api/payments/callback',
}

describe('local mock payment provider', () => {
  it('supports deterministic success, failure, refunds, and payout holds without card data', async () => {
    const provider = new MockPaymentProvider()
    const success = await provider.createCheckout({
      ...baseInput,
      bookingId: 'booking-1',
      deterministicOutcome: 'success',
    })
    const failure = await provider.createCheckout({
      ...baseInput,
      bookingId: 'booking-2',
      deterministicOutcome: 'failure',
    })
    expect(success.status).toBe('authorized')
    expect(failure.status).toBe('failed')

    const settled = await provider.getCheckoutStatus(success.reference)
    expect(settled.status).toBe('authorized')
    expect(settled.paidAmountKurus).toBe(160_000)
    expect(settled.hostPayoutAmountKurus).toBe(120_000)
    expect(settled.providerItemReference).toBeTruthy()

    expect(
      await provider.refundPayment({
        providerItemReference: settled.providerItemReference as string,
        amountKurus: 160_000,
        reason: 'test',
      }),
    ).toMatchObject({ status: 'refunded' })
    expect(
      await provider.releaseHostPayout({
        payoutId: 'payout-1',
        providerItemReference: settled.providerItemReference as string,
        amountKurus: 120_000,
        held: true,
      }),
    ).toMatchObject({ status: 'held' })
  })
})
