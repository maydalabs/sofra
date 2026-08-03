import type { CurrencyCode, MarketplacePolicy } from '@/features/policy/config'

export interface PriceBreakdown {
  currency: CurrencyCode
  hostNetKurus: number
  guestTotalKurus: number
  sofraGrossFeeKurus: number
  partnerCommissionKurus: number
  takeRateBasisPoints: number
}

function assertIntegerMoney(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      `${field} must be a non-negative integer amount in kuruş`,
    )
  }
}

/** Integer ceiling division keeps the host payout from being rounded down. */
export function divideAndRoundUp(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new TypeError('Pricing arithmetic accepts safe integers only')
  }
  if (numerator < 0 || denominator <= 0) {
    throw new RangeError(
      'Pricing division requires a non-negative numerator and positive denominator',
    )
  }
  return Math.floor((numerator + denominator - 1) / denominator)
}

export function calculateGuestPrice(
  hostNetKurus: number,
  policy: Pick<MarketplacePolicy, 'currency' | 'takeRateBasisPoints'>,
  partnerCommissionBasisPoints = 0,
): PriceBreakdown {
  assertIntegerMoney(hostNetKurus, 'hostNetKurus')
  if (
    !Number.isInteger(policy.takeRateBasisPoints) ||
    policy.takeRateBasisPoints < 0 ||
    policy.takeRateBasisPoints >= 10_000
  ) {
    throw new RangeError(
      'Take rate must be an integer from 0 to 9,999 basis points',
    )
  }
  if (
    !Number.isInteger(partnerCommissionBasisPoints) ||
    partnerCommissionBasisPoints < 0 ||
    partnerCommissionBasisPoints > policy.takeRateBasisPoints
  ) {
    throw new RangeError('Partner commission must fit within Sofra’s fee')
  }

  const guestTotalKurus = divideAndRoundUp(
    hostNetKurus * 10_000,
    10_000 - policy.takeRateBasisPoints,
  )
  const sofraGrossFeeKurus = guestTotalKurus - hostNetKurus
  const partnerCommissionKurus = Math.floor(
    (guestTotalKurus * partnerCommissionBasisPoints) / 10_000,
  )

  return {
    currency: policy.currency,
    hostNetKurus,
    guestTotalKurus,
    sofraGrossFeeKurus,
    partnerCommissionKurus,
    takeRateBasisPoints: policy.takeRateBasisPoints,
  }
}

export function formatTry(kurus: number, locale = 'en-US') {
  assertIntegerMoney(kurus, 'kurus')
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: kurus % 100 === 0 ? 0 : 2,
  }).format(kurus / 100)
}
