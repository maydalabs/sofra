import { z } from 'zod'

export const publicExperienceReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(5).max(100),
  body: z.string().trim().min(30).max(2_000),
  privacyAcknowledged: z.literal(true),
})

export const privateConstructiveFeedbackSchema = z.object({
  body: z.string().trim().min(20).max(2_000),
})

export const confidentialSafetyReportSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidentialReport: z.string().trim().min(20).max(4_000),
})

export type PublicExperienceReviewInput = z.infer<
  typeof publicExperienceReviewSchema
>
export type PrivateConstructiveFeedbackInput = z.infer<
  typeof privateConstructiveFeedbackSchema
>
export type ConfidentialSafetyReportInput = z.infer<
  typeof confidentialSafetyReportSchema
>
