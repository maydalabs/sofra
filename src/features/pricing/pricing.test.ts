import { describe, expect, it } from 'vitest'

import { developmentPolicy } from '@/features/policy/config'

import { calculateGuestPrice, divideAndRoundUp } from './pricing'

describe('pricing', () => {
  it('calculates a 25% take rate from the final guest total', () => {
    expect(calculateGuestPrice(120_000, developmentPolicy)).toEqual({
      currency: 'TRY',
      hostNetKurus: 120_000,
      guestTotalKurus: 160_000,
      sofraGrossFeeKurus: 40_000,
      partnerCommissionKurus: 0,
      takeRateBasisPoints: 2_500,
    })
  })

  it('rounds the guest total up using integer arithmetic', () => {
    expect(divideAndRoundUp(1_000_000, 7_500)).toBe(134)
    const result = calculateGuestPrice(100, developmentPolicy)
    expect(result.guestTotalKurus).toBe(134)
    expect(result.sofraGrossFeeKurus).toBe(34)
  })

  it('keeps partner commission within Sofra’s gross fee', () => {
    const result = calculateGuestPrice(120_000, developmentPolicy, 500)
    expect(result.partnerCommissionKurus).toBe(8_000)
    expect(result.partnerCommissionKurus).toBeLessThan(
      result.sofraGrossFeeKurus,
    )
  })
})
