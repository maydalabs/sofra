import { z } from 'zod'

export const createHostedTableSchema = z.object({
  menuTitle: z
    .string()
    .trim()
    .min(5, 'Give the household menu a clear title')
    .max(100),
  menuDescription: z
    .string()
    .trim()
    .min(30, 'Describe the complete host-selected menu')
    .max(1_200),
  startsAt: z
    .string()
    .min(1, 'Choose a dinner date and time')
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      'Choose a valid dinner date and time',
    ),
  format: z.enum(['shared', 'private']),
  proposedCapacity: z.number().int().min(1).max(12),
  minimumGuestCount: z.number().int().min(1).max(12),
  hostNetPayoutTry: z.number().int().min(100).max(100_000),
  atmosphere: z.string().trim().min(10).max(240),
  expectedHouseholdParticipants: z.string().trim().min(10).max(240),
  practicalInformation: z.string().trim().min(10).max(500),
})

export type CreateHostedTableInput = z.infer<typeof createHostedTableSchema>
