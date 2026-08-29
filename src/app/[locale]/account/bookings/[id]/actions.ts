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
import { BookingWriteError } from '@/server/repositories/write-contracts'
import {
  canPersistWrites,
  getSofraWriteRepository,
} from '@/server/repositories/write-factory'
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

  if (canPersistWrites()) {
    let cancelled
    try {
      const writes = await getSofraWriteRepository(actor.id)
      cancelled = await writes.cancelBooking(
        booking.id,
        'Cancelled by the traveller',
      )
    } catch (error) {
      if (error instanceof BookingWriteError) {
        redirect(`/${locale}/account/bookings/${bookingId}?cancellation=failed`)
      }
      throw error
    }
    // The refund amount is the traveller's own figure; carrying it in the
    // redirect keeps the read model untouched.
    const outcome =
      cancelled.refundDueKurus === 0
        ? 'cancelled_unpaid'
        : cancelled.refundDueKurus >= cancelled.guestTotalKurus
          ? 'cancelled_full'
          : 'cancelled_half'
    redirect(
      `/${locale}/account/bookings/${bookingId}?cancellation=${outcome}&refund=${cancelled.refundDueKurus}`,
    )
  }

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
