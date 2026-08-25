import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import englishMessages from '../../../messages/en.json'
import turkishMessages from '../../../messages/tr.json'
import { BookingForm } from './booking-form'

afterEach(cleanup)

describe('guest price display', () => {
  it('shows the all-inclusive total and updates it with party size', async () => {
    const user = userEvent.setup()
    render(
      <NextIntlClientProvider locale="en" messages={englishMessages}>
        <BookingForm
          table={{
            slug: 'demo',
            format: 'shared',
            availableSeats: 2,
            guestPriceKurus: 160_000,
            maximumSharedPartySize: 2,
          }}
          locale="en"
          action={vi.fn(async () => ({
            status: 'payments_disabled' as const,
            review: {
              partySize: 1,
              guestTotalKurus: 160_000,
              compatibilityStatus: 'not_required' as const,
              bookingStatus: 'awaiting_payment' as const,
            },
          }))}
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

  it('announces field-level validation in the selected locale', async () => {
    const user = userEvent.setup()
    const action = vi.fn()
    render(
      <NextIntlClientProvider locale="tr" messages={turkishMessages}>
        <BookingForm
          table={{
            slug: 'demo',
            format: 'shared',
            availableSeats: 2,
            guestPriceKurus: 160_000,
            maximumSharedPartySize: 2,
          }}
          locale="tr"
          action={action}
        />
      </NextIntlClientProvider>,
    )

    await user.click(
      screen.getByRole('button', {
        name: /ödeme kullanılabilirliğine devam et/i,
      }),
    )

    expect(
      await screen.findByText('İşaretli alanları kontrol edin'),
    ).toBeInTheDocument()
    const nameInput = screen.getByLabelText('Ana misafirin adı')
    await waitFor(() =>
      expect(nameInput).toHaveAttribute('aria-invalid', 'true'),
    )
    const errorId = nameInput.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId ?? '')).toHaveTextContent(
      'Ana misafirin adını girin.',
    )
    expect(action).not.toHaveBeenCalled()
  })
})
