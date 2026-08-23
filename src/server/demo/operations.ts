import 'server-only'

import type { PayoutStatus } from '@/features/payouts/payout'

export interface DemoPayoutRecord {
  id: string
  tableId: string
  tableLabel: string
  hostPayoutKurus: number
  status: PayoutStatus
  incidentStatus: 'none' | 'open'
  holdReason: string | null
}

const demoPayouts: readonly DemoPayoutRecord[] = [
  {
    id: 'demo-payout-held',
    tableId: 'table-cem-completed',
    tableLabel: 'A spring table with old records',
    hostPayoutKurus: 480_000,
    status: 'held',
    incidentStatus: 'open',
    holdReason: 'Related operator-only safety review remains open',
  },
  {
    id: 'demo-payout-eligible',
    tableId: 'table-ozdemir-sisli',
    tableLabel: 'Three generations, one table',
    hostPayoutKurus: 520_000,
    status: 'eligible',
    incidentStatus: 'none',
    holdReason: null,
  },
]

export function getDemoPayouts() {
  return demoPayouts
}
