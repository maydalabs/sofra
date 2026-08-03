import 'server-only'

import {
  createHostedTableSchema,
  type CreateHostedTableInput,
} from '@/features/hosted-tables/schemas'
import {
  assertCertifiedCapacity,
  validateTableDate,
} from '@/features/hosted-tables/scheduling'
import { transitionHostedTable } from '@/features/hosted-tables/lifecycle'
import { developmentPolicy } from '@/features/policy/config'
import { calculateGuestPrice } from '@/features/pricing/pricing'

export interface CreateHostedTableContext {
  now: Date
  actorId: string
  actorSuspended: boolean
  certifiedCapacity: number
  activeUpcomingTableCount: number
  dinnersInTargetWeek: number
}

export interface HostedTableDraftResult {
  id: string
  status: 'draft'
  input: CreateHostedTableInput
  guestPriceKurus: number
  hostNetPayoutKurus: number
}

export function createHostedTableDraft(
  rawInput: unknown,
  context: CreateHostedTableContext,
): HostedTableDraftResult {
  if (context.actorSuspended)
    throw new Error('A suspended host cannot create new tables')
  if (
    context.activeUpcomingTableCount >=
    developmentPolicy.newHostActiveTableLimit
  ) {
    throw new Error('The current active-table limit has been reached')
  }
  if (
    context.dinnersInTargetWeek >= developmentPolicy.newHostWeeklyDinnerLimit
  ) {
    throw new Error('The current weekly dinner limit has been reached')
  }

  const input = createHostedTableSchema.parse(rawInput)
  assertCertifiedCapacity(input.proposedCapacity, context.certifiedCapacity)
  if (input.minimumGuestCount > input.proposedCapacity) {
    throw new RangeError('Minimum guest count cannot exceed proposed capacity')
  }

  const dateResult = validateTableDate(
    new Date(input.startsAt),
    context.now,
    developmentPolicy,
  )
  if (!dateResult.valid) throw new RangeError(dateResult.message)

  const hostNetPayoutKurus = input.hostNetPayoutTry * 100
  const price = calculateGuestPrice(hostNetPayoutKurus, developmentPolicy)
  return {
    id: `demo-draft-${context.actorId}`,
    status: 'draft',
    input,
    guestPriceKurus: price.guestTotalKurus,
    hostNetPayoutKurus,
  }
}

export function submitHostedTable(input: {
  currentStatus: 'draft' | 'changes_requested'
  actorSuspended: boolean
}) {
  if (input.actorSuspended)
    throw new Error('A suspended host cannot submit tables')
  return transitionHostedTable(input.currentStatus, 'submitted')
}

export function approveHostedTable(input: {
  currentStatus: 'submitted'
  actorRoles: readonly string[]
}) {
  if (
    !input.actorRoles.some(
      (role) => role === 'operator' || role === 'administrator',
    )
  ) {
    throw new Error(
      'Only an operator or administrator may approve a hosted table',
    )
  }
  return transitionHostedTable(input.currentStatus, 'approved')
}
