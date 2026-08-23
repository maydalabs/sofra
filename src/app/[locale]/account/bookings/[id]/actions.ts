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
import { prepareBookingCancellation } from '@/server/services/bookings'

export async function reviewBookingCancellationAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertVerifiedEmail(actor)
  assertHasAnyRole(actor, ['traveler'])

  const bookingId = String(formData.get('bookingId'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const repository = await getAuthenticatedSofraReadRepository(actor.id)
  const booking = await repository.findTravelerBookingById(bookingId)
  if (!booking) throw new Error('Booking not found for the current traveler')

  if (!isDemoMode()) {
    redirect(
      `/${locale}/account/bookings/${bookingId}?cancellation=unavailable`,
    )
  }

  const result = prepareBookingCancellation(booking.status)
  const audit = createAuditEntry({
    actorId: actor.id,
    action: 'booking.cancellation_reviewed',
    entityType: 'booking',
    entityId: booking.id,
    reason:
      'Local-only cancellation transition review; refund policy remains undecided',
    previousState: { status: booking.status },
    newState: {
      status: result.nextStatus,
      refundOutcome: result.refundOutcome,
      durable: false,
    },
  })
  console.info('[Sofra demo audit]', audit)
  redirect(`/${locale}/account/bookings/${bookingId}?cancellation=reviewed`)
}
