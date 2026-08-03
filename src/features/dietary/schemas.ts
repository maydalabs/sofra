import { z } from 'zod'

export const dietaryDisclosureSchema = z.object({
  kind: z.enum([
    'allergy',
    'intolerance',
    'dietary_restriction',
    'religious_food_restriction',
    'preference',
  ]),
  importance: z.enum(['low', 'important', 'severe']),
  explanation: z
    .string()
    .trim()
    .min(4, 'Please explain what the household needs to assess')
    .max(1_000),
})

export type DietaryDisclosureInput = z.infer<typeof dietaryDisclosureSchema>

/** Deliberately emits no dietary fields. */
export function dietaryAnalyticsProperties(input: DietaryDisclosureInput) {
  return {
    disclosureRecorded: Boolean(input.explanation),
    requiresCompatibilityReview: input.kind !== 'preference',
  }
}
