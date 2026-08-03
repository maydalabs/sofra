import { z } from 'zod'

export const bookingRequestSchema = z.object({
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
  dietaryDisclosure: z.string().trim().max(1_000),
  compatibilityAcknowledged: z
    .boolean()
    .refine(Boolean, 'Compatibility acknowledgment is required'),
  tablePolicyAcknowledged: z
    .boolean()
    .refine(Boolean, 'Table policy acknowledgment is required'),
})

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>
