import { describe, expect, it } from 'vitest'

import { getPrivateDemoTables } from './demo-tables'
import { toPublicHostedTable } from './public-projection'

describe('public hosted-table projection', () => {
  it('removes every private home and operational field', () => {
    const privateRecord = getPrivateDemoTables()[0]
    const publicRecord = toPublicHostedTable(privateRecord)
    const serialized = JSON.stringify(publicRecord)

    expect(publicRecord).not.toHaveProperty('exactAddress')
    expect(publicRecord).not.toHaveProperty('preciseCoordinate')
    expect(publicRecord).not.toHaveProperty('arrivalInstructions')
    expect(publicRecord).not.toHaveProperty('privateAddressId')
    expect(publicRecord).not.toHaveProperty('hostNetPayoutKurus')
    expect(serialized).not.toContain('Fictional development address')
  })
})
