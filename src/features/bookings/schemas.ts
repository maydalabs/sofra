import { z } from 'zod'

export const bookingRequestSchema = z
  .object({
    partySize: z.number().int().min(1).max(12),
    partyType: z.enum([
      'solo',
      'couple',
      'family',
      'friends',
      'colleagues',
      'other',
    ]),
    primaryName: z.string().trim().min(2).max(100),
    primaryEmail: z.string().trim().email(),
    additionalGuests: z.string().trim().max(600),
    dietaryNeeds: z.enum(['none', 'review_required']),
    dietaryDisclosure: z.string().trim().max(1_000),
    compatibilityAcknowledged: z
      .boolean()
      .refine(Boolean, 'Compatibility acknowledgment is required'),
    tablePolicyAcknowledged: z
      .boolean()
      .refine(Boolean, 'Table policy acknowledgment is required'),
  })
  .superRefine((input, context) => {
    const guestNames = parseAdditionalGuestNames(input.additionalGuests)
    const expectedGuests = input.partySize - 1
    if (guestNames.length !== expectedGuests) {
      context.addIssue({
        code: 'custom',
        path: ['additionalGuests'],
        message: `Add exactly ${expectedGuests} additional guest name${expectedGuests === 1 ? '' : 's'}`,
      })
    }
    if (
      input.dietaryNeeds === 'review_required' &&
      input.dietaryDisclosure.length < 4
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dietaryDisclosure'],
        message: 'Explain what the household needs to assess',
      })
    }
  })

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>

export function parseAdditionalGuestNames(value: string) {
  return value
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
}
