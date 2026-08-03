import type { HostedTableStatus } from './types'

export class DomainTransitionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly from: string,
    readonly to: string,
  ) {
    super(message)
    this.name = 'DomainTransitionError'
  }
}

const allowedTableTransitions: Readonly<
  Record<HostedTableStatus, readonly HostedTableStatus[]>
> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['changes_requested', 'approved', 'cancelled'],
  changes_requested: ['submitted', 'cancelled'],
  approved: ['published', 'cancelled'],
  published: ['minimum_reached', 'confirmed', 'cancelled'],
  minimum_reached: ['confirmed', 'cancelled'],
  confirmed: ['roster_locked', 'cancelled'],
  roster_locked: ['completed', 'cancelled'],
  completed: ['archived'],
  cancelled: ['archived'],
  archived: [],
}

export function transitionHostedTable(
  from: HostedTableStatus,
  to: HostedTableStatus,
) {
  if (!allowedTableTransitions[from].includes(to)) {
    throw new DomainTransitionError(
      'ILLEGAL_HOSTED_TABLE_TRANSITION',
      `A hosted table cannot move from ${from} to ${to}.`,
      from,
      to,
    )
  }
  return to
}
