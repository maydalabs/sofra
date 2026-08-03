'use server'

import { redirect } from 'next/navigation'

import { createAuditEntry } from '@/server/audit/audit'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'
import { submitHostedTable } from '@/server/services/hosted-tables'

export async function submitHostedTableAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertHasAnyRole(actor, ['certified_host'])
  const tableId = String(formData.get('tableId'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const status = submitHostedTable({
    currentStatus: 'draft',
    actorSuspended: false,
  })
  const audit = createAuditEntry({
    actorId: actor.id,
    action: 'hosted_table.submitted',
    entityType: 'hosted_table',
    entityId: tableId,
    reason: 'Host submitted complete development draft',
    previousState: { status: 'draft' },
    newState: { status },
  })
  console.info('[Sofra demo audit]', audit)
  redirect(`/${locale}/host/tables/${tableId}/edit?submitted=1`)
}
