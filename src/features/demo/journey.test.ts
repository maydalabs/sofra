import { describe, expect, it } from 'vitest'

import {
  demoJourneyChapterIds,
  demoJourneySteps,
  getDemoJourneyStep,
} from './journey'

describe('demo journey', () => {
  it('covers every lifecycle chapter and role transition', () => {
    expect(new Set(demoJourneySteps.map((step) => step.chapter))).toEqual(
      new Set(demoJourneyChapterIds),
    )
    expect(new Set(demoJourneySteps.map((step) => step.persona))).toEqual(
      new Set(['traveler', 'host', 'operator']),
    )
    expect(demoJourneySteps.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        'application',
        'certification',
        'draft',
        'moderation',
        'discovery',
        'booking',
        'roster',
        'confirmed',
        'feedback',
        'incident',
        'payout',
        'audit',
      ]),
    )
  })

  it('contains navigation metadata only and no sensitive fields', () => {
    const serialized = JSON.stringify(demoJourneySteps)
    expect(serialized).not.toMatch(
      /exactAddress|preciseCoordinate|arrivalInstructions|dietaryDisclosure|assessmentNotes|incidentDetails/i,
    )
    expect(getDemoJourneyStep('discovery')?.boundary).toBe('public')
    expect(getDemoJourneyStep('incident')?.boundary).toBe('restricted')
  })
})
