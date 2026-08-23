import type { HostedTableStatus } from './types'

export type HostJourneyStepState =
  'complete' | 'current' | 'upcoming' | 'attention'

export interface HostJourneyStep {
  id: 'draft' | 'review' | 'publication' | 'bookings' | 'dinner'
  state: HostJourneyStepState
}

const stageByStatus: Record<HostedTableStatus, number> = {
  draft: 0,
  changes_requested: 0,
  submitted: 1,
  approved: 2,
  published: 3,
  minimum_reached: 3,
  confirmed: 4,
  roster_locked: 4,
  completed: 5,
  archived: 5,
  cancelled: 0,
}

const stepIds: HostJourneyStep['id'][] = [
  'draft',
  'review',
  'publication',
  'bookings',
  'dinner',
]

export function getHostTableJourney(
  status: HostedTableStatus,
): HostJourneyStep[] {
  if (status === 'cancelled') {
    return stepIds.map((id, index) => ({
      id,
      state: index === 0 ? 'attention' : 'upcoming',
    }))
  }

  const activeStage = stageByStatus[status]
  return stepIds.map((id, index) => ({
    id,
    state:
      status === 'changes_requested' && index === 0
        ? 'attention'
        : index < activeStage
          ? 'complete'
          : index === activeStage
            ? 'current'
            : 'upcoming',
  }))
}
