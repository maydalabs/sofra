import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CreateTableForm } from './create-table-form'

describe('host table-creation validation', () => {
  it('publishes policy limits into accessible form constraints', () => {
    render(<CreateTableForm certifiedCapacity={6} />)
    const dateInput = screen.getByLabelText(/date and start time/i)
    const capacityInput = screen.getByLabelText(/proposed traveler capacity/i)
    const minimum = new Date(dateInput.getAttribute('min') ?? '')
    const daysAway = (minimum.getTime() - Date.now()) / (24 * 60 * 60 * 1_000)
    expect(daysAway).toBeGreaterThan(6.9)
    expect(capacityInput).toHaveAttribute('max', '6')
  })
})
