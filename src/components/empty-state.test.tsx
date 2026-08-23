import { render, screen } from '@testing-library/react'
import { CalendarSearch } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('exposes a semantic heading and optional action', () => {
    render(
      <EmptyState
        icon={CalendarSearch}
        title="No tables yet"
        description="Create the first household table."
        headingLevel={3}
      >
        <button type="button">Create table</button>
      </EmptyState>,
    )

    expect(
      screen.getByRole('heading', { level: 3, name: 'No tables yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create table' }),
    ).toBeInTheDocument()
  })
})
