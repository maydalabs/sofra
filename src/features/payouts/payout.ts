export type PayoutStatus = 'pending' | 'eligible' | 'held' | 'released'

export function determinePayoutStatus(input: {
  currentStatus: PayoutStatus
  hasOpenSafetyIncident: boolean
}): PayoutStatus {
  if (input.currentStatus === 'released') return 'released'
  if (input.hasOpenSafetyIncident) return 'held'
  if (input.currentStatus === 'held') return 'eligible'
  return input.currentStatus
}

export function assertPayoutCanRelease(input: {
  status: PayoutStatus
  hasOpenSafetyIncident: boolean
}) {
  if (input.hasOpenSafetyIncident || input.status === 'held') {
    throw new Error(
      'Payout cannot be released while a related safety incident is open',
    )
  }
  if (input.status !== 'eligible') {
    throw new Error('Only an eligible payout can be released')
  }
}
