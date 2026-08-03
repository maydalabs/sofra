import type { MarketplacePolicy } from '@/features/policy/config'

const HOUR_IN_MS = 60 * 60 * 1_000
const DAY_IN_MS = 24 * HOUR_IN_MS

export interface ScheduleWindows {
  bookingCutoffAt: Date
  rosterLockAt: Date
}

export function calculateScheduleWindows(
  startsAt: Date,
  policy: Pick<MarketplacePolicy, 'bookingCutoffHours' | 'rosterLockHours'>,
): ScheduleWindows {
  return {
    bookingCutoffAt: new Date(
      startsAt.getTime() - policy.bookingCutoffHours * HOUR_IN_MS,
    ),
    rosterLockAt: new Date(
      startsAt.getTime() - policy.rosterLockHours * HOUR_IN_MS,
    ),
  }
}

export function validateTableDate(
  proposedStart: Date,
  createdAt: Date,
  policy: Pick<
    MarketplacePolicy,
    'minimumLeadDays' | 'maximumPublishingHorizonDays'
  >,
) {
  const leadMilliseconds = proposedStart.getTime() - createdAt.getTime()
  if (leadMilliseconds < policy.minimumLeadDays * DAY_IN_MS) {
    return {
      valid: false as const,
      code: 'TABLE_DATE_TOO_SOON' as const,
      message: `Dinner must be at least ${policy.minimumLeadDays} days after table creation.`,
    }
  }
  if (leadMilliseconds > policy.maximumPublishingHorizonDays * DAY_IN_MS) {
    return {
      valid: false as const,
      code: 'TABLE_DATE_TOO_FAR' as const,
      message: `Dinner must normally be within ${policy.maximumPublishingHorizonDays} days.`,
    }
  }
  return { valid: true as const }
}

export function assertCertifiedCapacity(
  proposedCapacity: number,
  certifiedCapacity: number,
) {
  if (!Number.isInteger(proposedCapacity) || proposedCapacity < 1) {
    throw new RangeError('Proposed capacity must be a positive whole number')
  }
  if (proposedCapacity > certifiedCapacity) {
    throw new RangeError(
      'Proposed capacity cannot exceed the household’s certified capacity',
    )
  }
}
