import { describe, expect, it } from 'vitest'

import { developmentPolicy } from '@/features/policy/config'

import {
  assertCertifiedCapacity,
  calculateScheduleWindows,
  validateTableDate,
} from './scheduling'

describe('hosted-table scheduling', () => {
  const createdAt = new Date('2026-08-03T12:00:00.000Z')

  it('enforces the minimum seven-day lead', () => {
    expect(
      validateTableDate(
        new Date('2026-08-10T12:00:00.000Z'),
        createdAt,
        developmentPolicy,
      ),
    ).toEqual({ valid: true })
    expect(
      validateTableDate(
        new Date('2026-08-10T11:59:59.000Z'),
        createdAt,
        developmentPolicy,
      ),
    ).toMatchObject({ valid: false, code: 'TABLE_DATE_TOO_SOON' })
  })

  it('calculates booking cutoff and roster lock from policy', () => {
    const windows = calculateScheduleWindows(
      new Date('2026-08-20T16:00:00.000Z'),
      developmentPolicy,
    )
    expect(windows.bookingCutoffAt.toISOString()).toBe(
      '2026-08-19T04:00:00.000Z',
    )
    expect(windows.rosterLockAt.toISOString()).toBe('2026-08-19T16:00:00.000Z')
  })

  it('rejects a proposal above certified traveler capacity', () => {
    expect(() => assertCertifiedCapacity(7, 6)).toThrow(/certified capacity/i)
    expect(() => assertCertifiedCapacity(6, 6)).not.toThrow()
  })
})
