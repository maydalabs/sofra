import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import messages from '../../../messages/en.json'
import { BookingForm } from './booking-form'

describe('guest price display', () => {
  it('shows the all-inclusive total and updates it with party size', async () => {
    const user = userEvent.setup()
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BookingForm
          table={{
            slug: 'demo',
            format: 'shared',
            availableSeats: 2,
            guestPriceKurus: 160_000,
          }}
          locale="en"
          action={vi.fn(async () => ({ status: 'payments_disabled' as const }))}
        />
      </NextIntlClientProvider>,
    )
    expect(screen.getAllByText(/TRY\s*1,600/).length).toBeGreaterThan(0)
    const partySize = screen.getByLabelText(/party size/i)
    await user.clear(partySize)
    await user.type(partySize, '2')
    expect(screen.getAllByText(/TRY\s*3,200/).length).toBeGreaterThan(0)
    expect(screen.getByText(/all-inclusive/i)).toBeInTheDocument()
  })
})
