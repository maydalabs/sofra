import { describe, expect, it } from 'vitest'

import {
  createHostedTableValidationSchema,
  type CreateHostedTableValidationMessages,
} from './schemas'

const messages: CreateHostedTableValidationMessages = {
  menuTitleMin: 'menu-title-min',
  menuTitleMax: 'menu-title-max',
  menuDescriptionMin: 'menu-description-min',
  menuDescriptionMax: 'menu-description-max',
  startsAtRequired: 'starts-at-required',
  startsAtInvalid: 'starts-at-invalid',
  startsAtTooEarly: (days) => `starts-at-too-early-${days}`,
  startsAtTooLate: (days) => `starts-at-too-late-${days}`,
  capacityNumber: 'capacity-number',
  capacityInteger: 'capacity-integer',
  capacityRange: (maximum) => `capacity-range-${maximum}`,
  minimumGuestCountNumber: 'minimum-number',
  minimumGuestCountInteger: 'minimum-integer',
  minimumGuestCountRange: (maximum) => `minimum-range-${maximum}`,
  minimumExceedsCapacity: 'minimum-exceeds-capacity',
  payoutNumber: 'payout-number',
  payoutInteger: 'payout-integer',
  payoutRange: 'payout-range',
  atmosphereMin: 'atmosphere-min',
  atmosphereMax: 'atmosphere-max',
  participantsMin: 'participants-min',
  participantsMax: 'participants-max',
  practicalMin: 'practical-min',
  practicalMax: 'practical-max',
}

const validDraft = {
  menuTitle: 'Sunday dinner',
  menuDescription: 'A complete household-selected dinner menu for the evening.',
  startsAt: '2026-09-10T19:00',
  format: 'shared' as const,
  proposedCapacity: 4,
  minimumGuestCount: 2,
  hostNetPayoutTry: 1_200,
  atmosphere: 'Warm and conversational',
  expectedHouseholdParticipants: 'Ayşe and Levent will join',
  practicalInformation: 'One flight of stairs at the entrance',
}

describe('hosted-table validation schema', () => {
  it('uses the certified capacity as the draft ceiling', () => {
    const schema = createHostedTableValidationSchema({
      messages,
      limits: { certifiedCapacity: 3 },
    })

    const result = schema.safeParse({ ...validDraft, proposedCapacity: 4 })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['proposedCapacity'],
        message: 'capacity-range-3',
      }),
    )
  })

  it('keeps schedule and guest-minimum rules in the shared schema', () => {
    const schema = createHostedTableValidationSchema({
      messages,
      limits: {
        certifiedCapacity: 6,
        minimumStartsAt: '2026-09-12T19:00',
        maximumStartsAt: '2026-10-01T19:00',
        minimumLeadDays: 7,
        maximumPublishingHorizonDays: 35,
      },
    })

    const result = schema.safeParse({
      ...validDraft,
      minimumGuestCount: 5,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['minimumGuestCount'],
          message: 'minimum-exceeds-capacity',
        }),
        expect.objectContaining({
          path: ['startsAt'],
          message: 'starts-at-too-early-7',
        }),
      ]),
    )
  })
})
