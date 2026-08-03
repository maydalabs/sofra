import { describe, expect, it } from 'vitest'

import { MockPaymentProvider } from './mock-payment-provider'

describe('local mock payment provider', () => {
  it('supports deterministic success, failure, refunds, and payout holds without card data', async () => {
    const provider = new MockPaymentProvider()
    const success = await provider.createCheckout({
      bookingId: 'booking-1',
      amountKurus: 160_000,
      currency: 'TRY',
      deterministicOutcome: 'success',
    })
    const failure = await provider.createCheckout({
      bookingId: 'booking-2',
      amountKurus: 160_000,
      currency: 'TRY',
      deterministicOutcome: 'failure',
    })
    expect(success.status).toBe('authorized')
    expect(failure.status).toBe('failed')
    expect(
      await provider.refundPayment({
        reference: success.reference,
        amountKurus: 160_000,
        reason: 'test',
      }),
    ).toMatchObject({ status: 'refunded' })
    expect(
      await provider.releaseHostPayout({
        payoutId: 'payout-1',
        amountKurus: 120_000,
        held: true,
      }),
    ).toMatchObject({ status: 'held' })
  })
})
