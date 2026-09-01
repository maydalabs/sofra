import 'server-only'

/**
 * The integer-kuruş ↔ provider-decimal boundary.
 *
 * The domain model stores money exclusively as integer kuruş; iyzico takes and
 * returns amounts as decimal strings ("1600.00"). Every conversion in either
 * direction goes through these two functions and nowhere else, and neither
 * direction ever touches floating point: the lira and kuruş parts are derived
 * with integer arithmetic and string padding only.
 */

export class PaymentAmountError extends TypeError {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentAmountError'
  }
}

function assertKurus(kurus: number): void {
  if (!Number.isSafeInteger(kurus) || kurus <= 0) {
    throw new PaymentAmountError(
      'Payment amount must be a positive safe integer of kuruş',
    )
  }
}

/** 160000 kuruş → "1600.00". Always exactly two decimals. */
export function toProviderAmount(kurus: number): string {
  assertKurus(kurus)
  const lira = Math.trunc(kurus / 100)
  const remainder = kurus % 100
  return `${lira}.${String(remainder).padStart(2, '0')}`
}

/**
 * "1600.00" → 160000 kuruş; also accepts "1600" and "1600.5" because the
 * provider does not promise a fixed rendering. Anything with more than two
 * decimals, a sign, an exponent, or a grouping character is rejected rather
 * than rounded: a surprising amount from the provider must surface as an
 * error, never as a silently adjusted ledger entry.
 */
export function fromProviderAmount(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) {
    throw new PaymentAmountError(
      `Provider amount "${value}" is not a plain decimal with at most two decimals`,
    )
  }
  const lira = Number.parseInt(match[1], 10)
  const decimals = match[2] ?? ''
  const kurus = Number.parseInt(decimals.padEnd(2, '0') || '0', 10)
  const total = lira * 100 + kurus
  if (!Number.isSafeInteger(total)) {
    throw new PaymentAmountError(`Provider amount "${value}" overflows`)
  }
  return total
}
