'use server'

import { redirect } from 'next/navigation'

import { createAuditEntry } from '@/server/audit/audit'
import { getCurrentActor } from '@/server/auth/current-actor'
import {
  assertHasAnyRole,
  assertVerifiedEmail,
} from '@/server/authorization/roles'
import type { IncidentStatus } from '@/server/database/database.types'
import { OperatorWriteError } from '@/server/repositories/write-contracts'
import {
  canPersistWrites,
  getSofraOperatorWriteRepository,
} from '@/server/repositories/write-factory'
import { approveHostedTable } from '@/server/services/hosted-tables'

async function requireOperator() {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertHasAnyRole(actor, ['operator', 'administrator'])
  return actor
}

function localeOf(formData: FormData) {
  return formData.get('locale') === 'tr' ? 'tr' : 'en'
}

/** Turns a domain failure into a query flag the admin pages already render. */
function outcomeOf(error: unknown) {
  if (error instanceof OperatorWriteError) return error.code.toLowerCase()
  throw error
}

export async function approveTableAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const tableId = String(formData.get('tableId'))
  const locale = localeOf(formData)

  if (canPersistWrites()) {
    try {
      const writes = await getSofraOperatorWriteRepository(actor)
      await writes.reviewHostedTable({ tableId, decision: 'approve' })
    } catch (error) {
      redirect(`/${locale}/admin/tables/${tableId}?error=${outcomeOf(error)}`)
    }
    redirect(`/${locale}/admin/tables/${tableId}?approved=1`)
  }

  const status = approveHostedTable({
    currentStatus: 'submitted',
    actorRoles: actor.roles,
  })
  console.info(
    '[Sofra demo audit]',
    createAuditEntry({
      actorId: actor.id,
      action: 'hosted_table.approved',
      entityType: 'hosted_table',
      entityId: tableId,
      reason: 'Development approval action',
      previousState: { status: 'submitted' },
      newState: { status },
    }),
  )
  redirect(`/${locale}/admin/tables/${tableId}?approved=1`)
}

export async function requestTableChangesAction(formData: FormData) {
  const actor = await requireOperator()
  const tableId = String(formData.get('tableId'))
  const locale = localeOf(formData)
  const reason = String(
    formData.get('reason') ?? 'Clarify household participation',
  )

  if (canPersistWrites()) {
    try {
      const writes = await getSofraOperatorWriteRepository(actor)
      await writes.reviewHostedTable({
        tableId,
        decision: 'changes_requested',
        reason,
      })
    } catch (error) {
      redirect(`/${locale}/admin/tables/${tableId}?error=${outcomeOf(error)}`)
    }
    redirect(`/${locale}/admin/tables/${tableId}?changes=1`)
  }

  console.info(
    '[Sofra demo audit]',
    createAuditEntry({
      actorId: actor.id,
      action: 'hosted_table.changes_requested',
      entityType: 'hosted_table',
      entityId: tableId,
      reason,
      previousState: { status: 'submitted' },
      newState: { status: 'changes_requested' },
    }),
  )
  redirect(`/${locale}/admin/tables/${tableId}?changes=1`)
}

/**
 * Publication is the act that makes a table bookable, kept separate from
 * approval so an operator can approve now and publish later.
 */
export async function publishTableAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const tableId = String(formData.get('tableId'))
  const locale = localeOf(formData)

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/tables/${tableId}?publish=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.publishHostedTable(tableId)
  } catch (error) {
    redirect(`/${locale}/admin/tables/${tableId}?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/tables/${tableId}?published=1`)
}

export async function decideHostApplicationAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const applicationId = String(formData.get('applicationId'))
  const locale = localeOf(formData)
  const rawDecision = String(formData.get('decision'))
  const decision =
    rawDecision === 'approve' ||
    rawDecision === 'changes_requested' ||
    rawDecision === 'decline'
      ? rawDecision
      : null
  if (!decision) throw new Error('Unknown decision')

  const rawCapacity = formData.get('certifiedCapacity')
  const certifiedCapacity = rawCapacity ? Number(rawCapacity) : null
  const reason = formData.get('reason') ? String(formData.get('reason')) : null

  if (!canPersistWrites()) {
    redirect(
      `/${locale}/admin/host-applications/${applicationId}?decision=unavailable`,
    )
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.decideHostApplication({
      applicationId,
      decision,
      reason,
      certifiedCapacity,
    })
  } catch (error) {
    redirect(
      `/${locale}/admin/host-applications/${applicationId}?error=${outcomeOf(error)}`,
    )
  }
  redirect(
    `/${locale}/admin/host-applications/${applicationId}?decision=${decision}`,
  )
}

export async function triageIncidentAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const incidentId = String(formData.get('incidentId'))
  const locale = localeOf(formData)
  const status = String(formData.get('status')) as IncidentStatus
  const reason = formData.get('reason') ? String(formData.get('reason')) : null

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/incidents?triage=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.triageIncident(incidentId, status, reason)
  } catch (error) {
    redirect(`/${locale}/admin/incidents?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/incidents?triaged=1`)
}

export async function holdPayoutAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const payoutId = String(formData.get('payoutId'))
  const locale = localeOf(formData)
  const holdReason = String(formData.get('holdReason') ?? 'Operations review')

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/payouts?hold=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.holdPayout(payoutId, holdReason)
  } catch (error) {
    redirect(`/${locale}/admin/payouts?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/payouts?held=1`)
}

export async function releasePayoutAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const payoutId = String(formData.get('payoutId'))
  const locale = localeOf(formData)
  const reason = formData.get('reason') ? String(formData.get('reason')) : null

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/payouts?release=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.releasePayout(payoutId, reason)
  } catch (error) {
    redirect(`/${locale}/admin/payouts?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/payouts?released=1`)
}

export async function decideCompatibilityAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const bookingId = String(formData.get('bookingId'))
  const locale = localeOf(formData)
  const rawDecision = String(formData.get('decision'))
  const decision =
    rawDecision === 'accepted' || rawDecision === 'declined'
      ? rawDecision
      : null
  if (!decision) throw new Error('Unknown compatibility decision')
  const privateReason = formData.get('privateReason')
    ? String(formData.get('privateReason'))
    : null

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/compatibility?compat=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.decideDietaryCompatibility(bookingId, decision, privateReason)
  } catch (error) {
    redirect(`/${locale}/admin/compatibility?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/compatibility?compat=decided`)
}

export async function moderateReviewAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const reviewId = String(formData.get('reviewId'))
  const locale = localeOf(formData)
  const rawDecision = String(formData.get('decision'))
  const decision =
    rawDecision === 'publish' || rawDecision === 'reject' ? rawDecision : null
  if (!decision) throw new Error('Unknown moderation decision')
  const reason = formData.get('reason') ? String(formData.get('reason')) : null

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/reviews?moderation=unavailable`)
  }

  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    await writes.moderatePublicReview(reviewId, decision, reason)
  } catch (error) {
    redirect(`/${locale}/admin/reviews?error=${outcomeOf(error)}`)
  }
  redirect(`/${locale}/admin/reviews?moderation=done`)
}

/**
 * Platform cancellation of a scheduled dinner. Every open booking is refunded
 * 100% -- the decided rule -- and the outcome figures ride back in the redirect
 * so the operator sees exactly what their action did.
 */
export async function cancelPublishedTableAction(formData: FormData) {
  const actor = await requireOperator()
  assertVerifiedEmail(actor)
  const tableId = String(formData.get('tableId'))
  const locale = localeOf(formData)
  const reason = String(formData.get('reason') ?? '').trim()

  if (!canPersistWrites()) {
    redirect(`/${locale}/admin/tables/${tableId}?dinnerCancel=unavailable`)
  }

  let outcome
  try {
    const writes = await getSofraOperatorWriteRepository(actor)
    outcome = await writes.cancelPublishedTable(tableId, reason)
  } catch (error) {
    redirect(`/${locale}/admin/tables/${tableId}?error=${outcomeOf(error)}`)
  }
  redirect(
    `/${locale}/admin/tables/${tableId}?dinnerCancelled=1&bookings=${outcome.bookingsCancelled}&refund=${outcome.refundDueTotalKurus}&payoutsHeld=${outcome.payoutsHeld}`,
  )
}
