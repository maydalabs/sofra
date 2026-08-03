'use server'

import { createAuditEntry } from '@/server/audit/audit'
import { redirect } from 'next/navigation'
import { getCurrentActor } from '@/server/auth/current-actor'
import {
  assertHasAnyRole,
  assertVerifiedEmail,
} from '@/server/authorization/roles'
import { approveHostedTable } from '@/server/services/hosted-tables'

export async function approveTableAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertVerifiedEmail(actor)
  assertHasAnyRole(actor, ['operator', 'administrator'])
  const tableId = String(formData.get('tableId'))
  const status = approveHostedTable({
    currentStatus: 'submitted',
    actorRoles: actor.roles,
  })
  const audit = createAuditEntry({
    actorId: actor.id,
    action: 'hosted_table.approved',
    entityType: 'hosted_table',
    entityId: tableId,
    reason: 'Development approval action',
    previousState: { status: 'submitted' },
    newState: { status },
  })
  console.info('[Sofra demo audit]', audit)
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  redirect(`/${locale}/admin/tables/${tableId}?approved=1`)
}

export async function requestTableChangesAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertHasAnyRole(actor, ['operator', 'administrator'])
  const tableId = String(formData.get('tableId'))
  const reason = String(
    formData.get('reason') ?? 'Clarify household participation',
  )
  const audit = createAuditEntry({
    actorId: actor.id,
    action: 'hosted_table.changes_requested',
    entityType: 'hosted_table',
    entityId: tableId,
    reason,
    previousState: { status: 'submitted' },
    newState: { status: 'changes_requested' },
  })
  console.info('[Sofra demo audit]', audit)
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  redirect(`/${locale}/admin/tables/${tableId}?changes=1`)
}
