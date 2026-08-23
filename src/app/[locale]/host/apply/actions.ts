'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAuditEntry } from '@/server/audit/audit'
import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import {
  assertHasAnyRole,
  assertVerifiedEmail,
} from '@/server/authorization/roles'

const hostApplicationSchema = z.object({
  householdName: z.string().trim().min(3).max(100),
  neighborhood: z.string().trim().min(3).max(100),
  story: z.string().trim().min(30).max(2_000),
  motivation: z.string().trim().min(30).max(2_000),
  participation: z.string().trim().min(20).max(1_000),
})

export async function submitHostApplicationAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertVerifiedEmail(actor)
  assertHasAnyRole(actor, ['traveler', 'host_applicant'])
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const input = hostApplicationSchema.parse({
    householdName: formData.get('householdName'),
    neighborhood: formData.get('neighborhood'),
    story: formData.get('story'),
    motivation: formData.get('motivation'),
    participation: formData.get('participation'),
  })
  const applicationId = 'demo-host-application'
  if (!isDemoMode()) {
    redirect(`/${locale}/host/apply?application=unavailable`)
  }
  console.info(
    '[Sofra demo audit]',
    createAuditEntry({
      actorId: actor.id,
      action: 'host_application.submission_reviewed',
      entityType: 'host_application',
      entityId: applicationId,
      reason: 'Local verified-email host application review',
      previousState: { status: 'draft' },
      newState: { status: 'submitted', householdName: input.householdName },
    }),
  )
  redirect(`/${locale}/host/apply?application=reviewed`)
}
