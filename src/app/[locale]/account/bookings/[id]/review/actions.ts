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
import { PostDinnerWriteError } from '@/server/repositories/write-contracts'
import {
  canPersistWrites,
  getSofraPostDinnerWriteRepository,
} from '@/server/repositories/write-factory'
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
  if (canPersistWrites()) {
    await persist(context, (writes) =>
      writes.submitPublicReview({
        bookingId: context.bookingId,
        rating: intent.rating,
        title: intent.title,
        body: intent.body,
      }),
    )
    redirect(
      `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=public_submitted`,
    )
  }
  finishLocalReview(context, intent, 'public_reviewed')
}

export async function reviewPrivateFeedbackAction(formData: FormData) {
  const context = await getCompletedBookingContext(formData)
  const intent = preparePrivateConstructiveFeedback(
    { body: formData.get('body') },
    context.bookingStatus,
  )
  if (canPersistWrites()) {
    await persist(context, (writes) =>
      writes.submitPrivateFeedback({
        bookingId: context.bookingId,
        body: intent.body,
      }),
    )
    redirect(
      `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=private_submitted`,
    )
  }
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
  if (canPersistWrites()) {
    await persist(context, (writes) =>
      writes.reportSafetyIncident({
        bookingId: context.bookingId,
        severity: intent.severity,
        confidentialReport: intent.confidentialReport,
      }),
    )
    // The redirect carries no detail of the report -- not even that one of the
    // three channels was the safety channel beyond this flag.
    redirect(
      `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=safety_submitted`,
    )
  }
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

/**
 * Runs one durable post-dinner write, mapping domain failures onto the flags the
 * review page renders. Nothing the traveller wrote reaches the URL.
 */
async function persist<T>(
  context: Awaited<ReturnType<typeof getCompletedBookingContext>>,
  write: (
    writes: Awaited<ReturnType<typeof getSofraPostDinnerWriteRepository>>,
  ) => Promise<T>,
) {
  try {
    const writes = await getSofraPostDinnerWriteRepository(context.actorId)
    return await write(writes)
  } catch (error) {
    if (error instanceof PostDinnerWriteError) {
      redirect(
        `/${context.locale}/account/bookings/${context.bookingId}/review?feedback=${error.code.toLowerCase()}`,
      )
    }
    throw error
  }
}
