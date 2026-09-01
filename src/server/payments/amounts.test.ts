import { describe, expect, it } from 'vitest'

import {
  PaymentAmountError,
  fromProviderAmount,
  toProviderAmount,
} from './amounts'

describe('provider amount codec', () => {
  it('formats kuruş as exactly two decimals without float math', () => {
    expect(toProviderAmount(160_000)).toBe('1600.00')
    expect(toProviderAmount(1)).toBe('0.01')
    expect(toProviderAmount(10)).toBe('0.10')
    expect(toProviderAmount(120_005)).toBe('1200.05')
    // The classic float trap: 0.1 + 0.2. 30 kuruş must render as 0.30.
    expect(toProviderAmount(30)).toBe('0.30')
    expect(toProviderAmount(9_007_199_254_740_991)).toBe('90071992547409.91')
  })

  it('rejects non-positive, fractional, and unsafe outgoing amounts', () => {
    for (const bad of [0, -1, 0.5, 100.5, Number.NaN, 2 ** 53]) {
      expect(() => toProviderAmount(bad)).toThrow(PaymentAmountError)
    }
  })

  it('parses provider decimals exactly', () => {
    expect(fromProviderAmount('1600.00')).toBe(160_000)
    expect(fromProviderAmount('1600')).toBe(160_000)
    expect(fromProviderAmount('1600.5')).toBe(160_050)
    expect(fromProviderAmount('0.01')).toBe(1)
    expect(fromProviderAmount(' 1600.00 ')).toBe(160_000)
  })

  it('rejects anything it would otherwise have to round or reinterpret', () => {
    for (const bad of [
      '1600.005',
      '1,600.00',
      '-1600.00',
      '+1600.00',
      '1.6e3',
      '1600.',
      '.5',
      'NaN',
      '',
    ]) {
      expect(() => fromProviderAmount(bad)).toThrow(PaymentAmountError)
    }
  })

  it('round-trips every representable amount shape', () => {
    // Deterministic sweep across magnitudes and kuruş remainders instead of
    // random inputs, so a failure is reproducible from the test output alone.
    for (const lira of [0, 1, 7, 99, 1_200, 1_600, 123_456, 10 ** 12]) {
      for (const kurus of [1, 5, 9, 10, 50, 99]) {
        const amount = lira * 100 + kurus
        expect(fromProviderAmount(toProviderAmount(amount))).toBe(amount)
      }
    }
  })
})
