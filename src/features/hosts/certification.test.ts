import { describe, expect, it } from 'vitest'

import { isHostCertificationActive } from './certification'

const certification = {
  id: 'certification-1',
  householdId: 'household-1',
  status: 'active' as const,
  certifiedTravelerCapacity: 6,
  validFrom: '2026-01-01T00:00:00.000Z',
  validUntil: '2027-01-01T00:00:00.000Z',
}

describe('host certification availability', () => {
  it('accepts an active certification inside its validity window', () => {
    expect(
      isHostCertificationActive(
        certification,
        new Date('2026-08-24T00:00:00.000Z'),
      ),
    ).toBe(true)
  })

  it('fails closed for suspended, future, and expired certifications', () => {
    const now = new Date('2026-08-24T00:00:00.000Z')
    expect(
      isHostCertificationActive({ ...certification, status: 'suspended' }, now),
    ).toBe(false)
    expect(
      isHostCertificationActive(
        { ...certification, validFrom: '2026-09-01T00:00:00.000Z' },
        now,
      ),
    ).toBe(false)
    expect(
      isHostCertificationActive(
        { ...certification, validUntil: '2026-08-01T00:00:00.000Z' },
        now,
      ),
    ).toBe(false)
    expect(
      isHostCertificationActive(
        { ...certification, validUntil: 'not-a-date' },
        now,
      ),
    ).toBe(false)
  })
})
