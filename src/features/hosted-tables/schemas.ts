import { z } from 'zod'

export interface CreateHostedTableValidationMessages {
  menuTitleMin: string
  menuTitleMax: string
  menuDescriptionMin: string
  menuDescriptionMax: string
  startsAtRequired: string
  startsAtInvalid: string
  startsAtTooEarly: (minimumLeadDays: number) => string
  startsAtTooLate: (maximumPublishingHorizonDays: number) => string
  capacityNumber: string
  capacityInteger: string
  capacityRange: (maximum: number) => string
  minimumGuestCountNumber: string
  minimumGuestCountInteger: string
  minimumGuestCountRange: (maximum: number) => string
  minimumExceedsCapacity: string
  payoutNumber: string
  payoutInteger: string
  payoutRange: string
  atmosphereMin: string
  atmosphereMax: string
  participantsMin: string
  participantsMax: string
  practicalMin: string
  practicalMax: string
}

interface CreateHostedTableValidationLimits {
  certifiedCapacity?: number
  minimumStartsAt?: string
  maximumStartsAt?: string
  minimumLeadDays?: number
  maximumPublishingHorizonDays?: number
}

const defaultValidationMessages: CreateHostedTableValidationMessages = {
  menuTitleMin: 'Give the household menu a clear title',
  menuTitleMax: 'Keep the menu title under 100 characters',
  menuDescriptionMin: 'Describe the complete host-selected menu',
  menuDescriptionMax: 'Keep the menu description under 1,200 characters',
  startsAtRequired: 'Choose a dinner date and time',
  startsAtInvalid: 'Choose a valid dinner date and time',
  startsAtTooEarly: (minimumLeadDays) =>
    `Choose a time at least ${minimumLeadDays} days away`,
  startsAtTooLate: (maximumPublishingHorizonDays) =>
    `Choose a time within ${maximumPublishingHorizonDays} days`,
  capacityNumber: 'Enter a proposed traveler capacity',
  capacityInteger: 'Proposed capacity must be a whole number',
  capacityRange: (maximum) =>
    `Choose a proposed capacity between 1 and ${maximum}`,
  minimumGuestCountNumber: 'Enter a minimum guest count',
  minimumGuestCountInteger: 'Minimum guest count must be a whole number',
  minimumGuestCountRange: (maximum) =>
    `Choose a minimum guest count between 1 and ${maximum}`,
  minimumExceedsCapacity: 'Minimum guest count cannot exceed proposed capacity',
  payoutNumber: 'Enter a desired net payout',
  payoutInteger: 'Desired net payout must be a whole TRY amount',
  payoutRange: 'Choose a desired net payout between TRY 100 and TRY 100,000',
  atmosphereMin: 'Describe the atmosphere in at least 10 characters',
  atmosphereMax: 'Keep the atmosphere under 240 characters',
  participantsMin:
    'Describe the expected household participants in at least 10 characters',
  participantsMax: 'Keep household participants under 240 characters',
  practicalMin: 'Add practical home information in at least 10 characters',
  practicalMax: 'Keep practical home information under 500 characters',
}

export function createHostedTableValidationSchema({
  messages = defaultValidationMessages,
  limits = {},
}: {
  messages?: CreateHostedTableValidationMessages
  limits?: CreateHostedTableValidationLimits
} = {}) {
  const maximumCapacity = limits.certifiedCapacity ?? 12

  return z
    .object({
      menuTitle: z
        .string()
        .trim()
        .min(5, messages.menuTitleMin)
        .max(100, messages.menuTitleMax),
      menuDescription: z
        .string()
        .trim()
        .min(30, messages.menuDescriptionMin)
        .max(1_200, messages.menuDescriptionMax),
      startsAt: z
        .string()
        .min(1, messages.startsAtRequired)
        .refine(
          (value) => !Number.isNaN(new Date(value).getTime()),
          messages.startsAtInvalid,
        ),
      format: z.enum(['shared', 'private']),
      proposedCapacity: z
        .number({ error: messages.capacityNumber })
        .int(messages.capacityInteger)
        .min(1, messages.capacityRange(maximumCapacity))
        .max(maximumCapacity, messages.capacityRange(maximumCapacity)),
      minimumGuestCount: z
        .number({ error: messages.minimumGuestCountNumber })
        .int(messages.minimumGuestCountInteger)
        .min(1, messages.minimumGuestCountRange(maximumCapacity))
        .max(maximumCapacity, messages.minimumGuestCountRange(maximumCapacity)),
      hostNetPayoutTry: z
        .number({ error: messages.payoutNumber })
        .int(messages.payoutInteger)
        .min(100, messages.payoutRange)
        .max(100_000, messages.payoutRange),
      atmosphere: z
        .string()
        .trim()
        .min(10, messages.atmosphereMin)
        .max(240, messages.atmosphereMax),
      expectedHouseholdParticipants: z
        .string()
        .trim()
        .min(10, messages.participantsMin)
        .max(240, messages.participantsMax),
      practicalInformation: z
        .string()
        .trim()
        .min(10, messages.practicalMin)
        .max(500, messages.practicalMax),
    })
    .superRefine((input, context) => {
      if (input.minimumGuestCount > input.proposedCapacity) {
        context.addIssue({
          code: 'custom',
          path: ['minimumGuestCount'],
          message: messages.minimumExceedsCapacity,
        })
      }

      const startsAt = new Date(input.startsAt)
      if (Number.isNaN(startsAt.getTime())) return

      if (
        limits.minimumStartsAt &&
        startsAt < new Date(limits.minimumStartsAt)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['startsAt'],
          message: messages.startsAtTooEarly(limits.minimumLeadDays ?? 0),
        })
      }
      if (
        limits.maximumStartsAt &&
        startsAt > new Date(limits.maximumStartsAt)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['startsAt'],
          message: messages.startsAtTooLate(
            limits.maximumPublishingHorizonDays ?? 0,
          ),
        })
      }
    })
}

export const createHostedTableSchema = createHostedTableValidationSchema()

export type CreateHostedTableInput = z.infer<typeof createHostedTableSchema>
