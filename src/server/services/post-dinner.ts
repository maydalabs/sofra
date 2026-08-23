import 'server-only'

import {
  confidentialSafetyReportSchema,
  privateConstructiveFeedbackSchema,
  publicExperienceReviewSchema,
  type ConfidentialSafetyReportInput,
  type PrivateConstructiveFeedbackInput,
  type PublicExperienceReviewInput,
} from '@/features/feedback/schemas'
import { determinePayoutStatus } from '@/features/payouts/payout'
import type { BookingStatus } from '@/server/database/database.types'

export interface PublicReviewIntent extends PublicExperienceReviewInput {
  channel: 'public_review'
  moderationStatus: 'pending_review'
}

export interface PrivateFeedbackIntent extends PrivateConstructiveFeedbackInput {
  channel: 'private_feedback'
  visibility: 'operations_only'
}

export interface SafetyIncidentIntent extends ConfidentialSafetyReportInput {
  channel: 'safety_incident'
  incidentStatus: 'open'
  payoutStatus: 'held'
}

export type PostDinnerIntent =
  PublicReviewIntent | PrivateFeedbackIntent | SafetyIncidentIntent

export type PostDinnerIntentReview =
  | {
      channel: 'public_review'
      moderationStatus: 'pending_review'
      rating: number
    }
  | {
      channel: 'private_feedback'
      visibility: 'operations_only'
    }
  | {
      channel: 'safety_incident'
      incidentStatus: 'open'
      payoutStatus: 'held'
    }

export function preparePublicExperienceReview(
  rawInput: unknown,
  bookingStatus: BookingStatus,
): PublicReviewIntent {
  assertCompletedBooking(bookingStatus)
  return {
    ...publicExperienceReviewSchema.parse(rawInput),
    channel: 'public_review',
    moderationStatus: 'pending_review',
  }
}

export function preparePrivateConstructiveFeedback(
  rawInput: unknown,
  bookingStatus: BookingStatus,
): PrivateFeedbackIntent {
  assertCompletedBooking(bookingStatus)
  return {
    ...privateConstructiveFeedbackSchema.parse(rawInput),
    channel: 'private_feedback',
    visibility: 'operations_only',
  }
}

export function preparePostDinnerSafetyReport(
  rawInput: unknown,
  bookingStatus: BookingStatus,
): SafetyIncidentIntent {
  assertCompletedBooking(bookingStatus)
  const input = confidentialSafetyReportSchema.parse(rawInput)
  const payoutStatus = determinePayoutStatus({
    currentStatus: 'eligible',
    hasOpenSafetyIncident: true,
  })
  if (payoutStatus !== 'held') {
    throw new Error('An open safety incident must require a payout hold')
  }
  return {
    ...input,
    channel: 'safety_incident',
    incidentStatus: 'open',
    payoutStatus,
  }
}

export function toPostDinnerIntentReview(
  intent: PostDinnerIntent,
): PostDinnerIntentReview {
  if (intent.channel === 'public_review') {
    return {
      channel: intent.channel,
      moderationStatus: intent.moderationStatus,
      rating: intent.rating,
    }
  }
  if (intent.channel === 'private_feedback') {
    return {
      channel: intent.channel,
      visibility: intent.visibility,
    }
  }
  return {
    channel: intent.channel,
    incidentStatus: intent.incidentStatus,
    payoutStatus: intent.payoutStatus,
  }
}

function assertCompletedBooking(status: BookingStatus) {
  if (status !== 'completed') {
    throw new Error('Post-dinner feedback requires a completed booking')
  }
}
