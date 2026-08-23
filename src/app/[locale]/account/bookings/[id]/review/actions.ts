'use server'

import { redirect } from 'next/navigation'

import { createAuditEntry } from '@/server/audit/audit'
import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import {
  assertHasAnyRole,
  assertVerifiedEmail,
} from '@/server/authorization/roles'
import { getAuthenticatedSofraReadRepository } from '@/server/repositories/factory'
import {
  preparePostDinnerSafetyReport,
  preparePrivateConstructiveFeedback,
  preparePublicExperienceReview,
  toPostDinnerIntentReview,
  type PostDinnerIntent,
} from '@/server/services/post-dinner'

export async function reviewPublicExperienceAction(formData: FormData) {
  const context = await getCompletedBookingContext(formData)
  const intent = preparePublicExperienceReview(
    {
      rating: formData.get('rating'),
      title: formData.get('title'),
      body: formData.get('body'),
      privacyAcknowledged: formData.get('privacyAcknowledged') === 'on',
    },
    context.bookingStatus,
  )
  finishLocalReview(context, intent, 'public_reviewed')
}

export async function reviewPrivateFeedbackAction(formData: FormData) {
  const context = await getCompletedBookingContext(formData)
  const intent = preparePrivateConstructiveFeedback(
    { body: formData.get('body') },
    context.bookingStatus,
  )
  finishLocalReview(context, intent, 'private_reviewed')
}

export async function reviewSafetyReportAction(formData: FormData) {
  const context = await getCompletedBookingContext(formData)
  const intent = preparePostDinnerSafetyReport(
    {
      severity: formData.get('severity'),
      confidentialReport: formData.get('confidentialReport'),
    },
    context.bookingStatus,
  )
  finishLocalReview(context, intent, 'safety_reviewed')
}

async function getCompletedBookingContext(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertVerifiedEmail(actor)
  assertHasAnyRole(actor, ['traveler'])

  const bookingId = String(formData.get('bookingId'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const repository = await getAuthenticatedSofraReadRepository(actor.id)
  const booking = await repository.findTravelerBookingById(bookingId)
  if (!booking) throw new Error('Booking not found for the current traveler')

  return {
    actorId: actor.id,
    bookingId: booking.id,
    bookingStatus: booking.status,
    locale,
  }
}

function finishLocalReview(
  context: Awaited<ReturnType<typeof getCompletedBookingContext>>,
  intent: PostDinnerIntent,
  result: 'public_reviewed' | 'private_reviewed' | 'safety_reviewed',
): never {
  if (!isDemoMode()) {
    redirect(
      `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=unavailable`,
    )
  }

  const review = toPostDinnerIntentReview(intent)
  console.info(
    '[Sofra demo audit]',
    createAuditEntry({
      actorId: context.actorId,
      action: `post_dinner.${intent.channel}_reviewed`,
      entityType: 'booking',
      entityId: context.bookingId,
      reason: 'Local-only post-dinner trust workflow review',
      previousState: null,
      newState: { ...review, durable: false },
    }),
  )
  redirect(
    `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=${result}`,
  )
}
