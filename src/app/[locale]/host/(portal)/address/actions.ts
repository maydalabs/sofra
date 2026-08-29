'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getCurrentActor } from '@/server/auth/current-actor'
import {
  assertHasAnyRole,
  assertVerifiedEmail,
} from '@/server/authorization/roles'
import { HostWriteError } from '@/server/repositories/write-contracts'
import {
  canPersistWrites,
  getSofraHostWriteRepository,
} from '@/server/repositories/write-factory'

const addressSchema = z.object({
  addressLine1: z.string().trim().min(5).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(10).optional(),
  arrivalInstructions: z.string().trim().max(1_000).optional(),
})

export async function submitHostAddressAction(formData: FormData) {
  const actor = await getCurrentActor()
  if (!actor) throw new Error('Authentication required')
  assertVerifiedEmail(actor)
  // An applicant enters their address during assessment; a certified host
  // maintains it afterwards. Both are legitimate.
  assertHasAnyRole(actor, ['host_applicant', 'certified_host'])
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'

  const parsed = addressSchema.safeParse({
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2') || undefined,
    district: formData.get('district'),
    city: formData.get('city'),
    postalCode: formData.get('postalCode') || undefined,
    arrivalInstructions: formData.get('arrivalInstructions') || undefined,
  })
  if (!parsed.success) {
    redirect(`/${locale}/host/address?address=incomplete`)
  }

  if (!canPersistWrites()) {
    redirect(`/${locale}/host/address?address=unavailable`)
  }

  try {
    const writes = await getSofraHostWriteRepository(actor.id)
    await writes.submitHostAddress(parsed.data)
  } catch (error) {
    if (error instanceof HostWriteError) {
      redirect(
        `/${locale}/host/address?address=${
          error.code === 'NO_HOUSEHOLD' ? 'no_household' : 'incomplete'
        }`,
      )
    }
    throw error
  }
  redirect(`/${locale}/host/address?address=saved`)
}
