'use server'

import { redirect } from 'next/navigation'

import { isHostCertificationActive } from '@/features/hosts/certification'
import { createAuditEntry } from '@/server/audit/audit'
import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import { assertHasAnyRole } from '@/server/authorization/roles'
import {
  findHostCertification,
  findHostTableById,
} from '@/server/repositories/queries'
import {
  canPersistWrites,
  getSofraHostWriteRepository,
} from '@/server/repositories/write-factory'
import { HostWriteError } from '@/server/repositories/write-contracts'
import { submitHostedTable } from '@/server/services/hosted-tables'
import { getServerTimeMilliseconds } from '@/server/time/clock'

export async function submitHostedTableAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertHasAnyRole(actor, ['certified_host'])
  const tableId = String(formData.get('tableId'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const [table, certification] = await Promise.all([
    findHostTableById(actor.id, tableId),
    findHostCertification(actor.id),
  ])
  if (!table) throw new Error('Hosted table not found')
  if (table.status !== 'draft' && table.status !== 'changes_requested') {
    throw new Error('Only an editable host-owned table may be submitted')
  }
  const certificationActive = isHostCertificationActive(
    certification,
    new Date(getServerTimeMilliseconds()),
  )
  const status = submitHostedTable({
    currentStatus: table.status,
    actorSuspended: certification?.status === 'suspended',
    certificationActive,
  })
  if (canPersistWrites()) {
    try {
      const writes = await getSofraHostWriteRepository(actor.id)
      await writes.submitHostedTable(table.id)
    } catch (error) {
      if (error instanceof HostWriteError) {
        redirect(`/${locale}/host/tables/${table.id}/edit?submission=failed`)
      }
      throw error
    }
    redirect(`/${locale}/host/tables/${table.id}/edit?submission=submitted`)
  }

  if (!isDemoMode()) {
    redirect(`/${locale}/host/tables/${table.id}/edit?submission=unavailable`)
  }
  const audit = createAuditEntry({
    actorId: actor.id,
    action: 'hosted_table.submission_reviewed',
    entityType: 'hosted_table',
    entityId: tableId,
    reason: 'Local host submission transition review',
    previousState: { status: table.status },
    newState: { status },
  })
  console.info('[Sofra demo audit]', audit)
  redirect(`/${locale}/host/tables/${table.id}/edit?submission=reviewed`)
}

const checkInOutcomeByCode = {
  DINNER_NOT_STARTED: 'not_started',
  ROSTER_MISMATCH: 'roster_changed',
  UNRESOLVED_BOOKINGS: 'unresolved',
  TABLE_NOT_EDITABLE: 'already_completed',
} as const

export async function completeDinnerAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertHasAnyRole(actor, ['certified_host'])
  const tableId = String(formData.get('tableId'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const rosterPath = `/${locale}/host/tables/${tableId}/roster`

  // One radio group per booking: attendance-<bookingId> = attended | no_show.
  const attended: string[] = []
  const noShow: string[] = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('attendance-')) continue
    const bookingId = key.slice('attendance-'.length)
    if (value === 'attended') attended.push(bookingId)
    else if (value === 'no_show') noShow.push(bookingId)
  }

  if (!canPersistWrites()) {
    redirect(`${rosterPath}?checkin=unavailable`)
  }

  try {
    const writes = await getSofraHostWriteRepository(actor.id)
    await writes.completeDinner({
      tableId,
      attendedBookingIds: attended,
      noShowBookingIds: noShow,
    })
  } catch (error) {
    if (error instanceof HostWriteError) {
      const outcome =
        error.code in checkInOutcomeByCode
          ? checkInOutcomeByCode[
              error.code as keyof typeof checkInOutcomeByCode
            ]
          : 'failed'
      redirect(`${rosterPath}?checkin=${outcome}`)
    }
    throw error
  }
  redirect(`${rosterPath}?checkin=completed`)
}
