import { describe, expect, it } from 'vitest'

import { getHostTableJourney } from './host-journey'

describe('host table journey', () => {
  it('keeps a submitted table in platform review before publication', () => {
    expect(getHostTableJourney('submitted').slice(0, 3)).toMatchObject([
      { id: 'draft', state: 'complete' },
      { id: 'review', state: 'current' },
      { id: 'publication', state: 'upcoming' },
    ])
  })

  it('returns change requests to the host without making them public', () => {
    expect(getHostTableJourney('changes_requested')[0]).toEqual({
      id: 'draft',
      state: 'attention',
    })
    expect(getHostTableJourney('changes_requested')[2]).toMatchObject({
      id: 'publication',
      state: 'upcoming',
    })
  })

  it('separates confirmation, roster lock, and completion', () => {
    expect(getHostTableJourney('minimum_reached')[3]).toMatchObject({
      id: 'bookings',
      state: 'current',
    })
    expect(getHostTableJourney('roster_locked')[4]).toMatchObject({
      id: 'dinner',
      state: 'current',
    })
    expect(
      getHostTableJourney('completed').every(
        (step) => step.state === 'complete',
      ),
    ).toBe(true)
  })
})
