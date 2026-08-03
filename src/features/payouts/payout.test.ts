import { describe, expect, it } from 'vitest'

import { assertPayoutCanRelease, determinePayoutStatus } from './payout'

describe('payout holds', () => {
  it('holds payout while a related safety incident is open', () => {
    expect(
      determinePayoutStatus({
        currentStatus: 'eligible',
        hasOpenSafetyIncident: true,
      }),
    ).toBe('held')
    expect(() =>
      assertPayoutCanRelease({ status: 'held', hasOpenSafetyIncident: true }),
    ).toThrow(/safety incident/i)
  })

  it('permits an eligible payout after the hold clears', () => {
    expect(
      determinePayoutStatus({
        currentStatus: 'held',
        hasOpenSafetyIncident: false,
      }),
    ).toBe('eligible')
    expect(() =>
      assertPayoutCanRelease({
        status: 'eligible',
        hasOpenSafetyIncident: false,
      }),
    ).not.toThrow()
  })
})
