import { z } from 'zod'

export interface BookingValidationMessages {
  partySizeNumber: string
  partySizeInteger: string
  partySizeRange: (maximum: number) => string
  primaryName: string
  primaryNameTooLong: string
  email: string
  additionalGuestsTooLong: string
  dietaryDisclosureTooLong: string
  compatibilityAcknowledgment: string
  tablePolicyAcknowledgment: string
  additionalGuestNames: (count: number) => string
  dietaryDisclosure: string
}

const defaultValidationMessages: BookingValidationMessages = {
  partySizeNumber: 'Enter a party size',
  partySizeInteger: 'Party size must be a whole number',
  partySizeRange: (maximum) => `Choose a party size between 1 and ${maximum}`,
  primaryName: 'Enter the primary traveler’s name',
  primaryNameTooLong: 'Keep the primary traveler’s name under 100 characters',
  email: 'Enter a valid email address',
  additionalGuestsTooLong: 'Keep additional guest names under 600 characters',
  dietaryDisclosureTooLong:
    'Keep the private dietary disclosure under 1,000 characters',
  compatibilityAcknowledgment: 'Compatibility acknowledgment is required',
  tablePolicyAcknowledgment: 'Table policy acknowledgment is required',
  additionalGuestNames: (count) =>
    `Add exactly ${count} additional guest name${count === 1 ? '' : 's'}`,
  dietaryDisclosure: 'Explain what the household needs to assess',
}

export function createBookingRequestSchema({
  messages = defaultValidationMessages,
  maximumPartySize = 12,
}: {
  messages?: BookingValidationMessages
  maximumPartySize?: number
} = {}) {
  return z
    .object({
      partySize: z
        .number({ error: messages.partySizeNumber })
        .int(messages.partySizeInteger)
        .min(1, messages.partySizeRange(maximumPartySize))
        .max(maximumPartySize, messages.partySizeRange(maximumPartySize)),
      partyType: z.enum([
        'solo',
        'couple',
        'family',
        'friends',
        'colleagues',
        'other',
      ]),
      primaryName: z
        .string()
        .trim()
        .min(2, messages.primaryName)
        .max(100, messages.primaryNameTooLong),
      primaryEmail: z.string().trim().email(messages.email),
      additionalGuests: z
        .string()
        .trim()
        .max(600, messages.additionalGuestsTooLong),
      dietaryNeeds: z.enum(['none', 'review_required']),
      dietaryDisclosure: z
        .string()
        .trim()
        .max(1_000, messages.dietaryDisclosureTooLong),
      compatibilityAcknowledged: z
        .boolean()
        .refine(Boolean, messages.compatibilityAcknowledgment),
      tablePolicyAcknowledged: z
        .boolean()
        .refine(Boolean, messages.tablePolicyAcknowledgment),
    })
    .superRefine((input, context) => {
      if (Number.isInteger(input.partySize)) {
        const guestNames = parseAdditionalGuestNames(input.additionalGuests)
        const expectedGuests = input.partySize - 1
        if (guestNames.length !== expectedGuests) {
          context.addIssue({
            code: 'custom',
            path: ['additionalGuests'],
            message: messages.additionalGuestNames(expectedGuests),
          })
        }
      }
      if (
        input.dietaryNeeds === 'review_required' &&
        input.dietaryDisclosure.length < 4
      ) {
        context.addIssue({
          code: 'custom',
          path: ['dietaryDisclosure'],
          message: messages.dietaryDisclosure,
        })
      }
    })
}

export const bookingRequestSchema = createBookingRequestSchema()

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>

export function parseAdditionalGuestNames(value: string) {
  return value
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
}
