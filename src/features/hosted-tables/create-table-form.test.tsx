import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'

import englishMessages from '../../../messages/en.json'
import turkishMessages from '../../../messages/tr.json'
import { CreateTableForm } from './create-table-form'

afterEach(cleanup)

function renderForm(locale: 'en' | 'tr' = 'en') {
  const messages = locale === 'tr' ? turkishMessages : englishMessages
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CreateTableForm certifiedCapacity={6} />
    </NextIntlClientProvider>,
  )
}

describe('host table-creation validation', () => {
  it('publishes policy limits into accessible form constraints', () => {
    renderForm()
    const dateInput = screen.getByLabelText(/date and start time/i)
    const capacityInput = screen.getByLabelText(/proposed traveler capacity/i)
    const minimum = new Date(dateInput.getAttribute('min') ?? '')
    const maximum = new Date(dateInput.getAttribute('max') ?? '')
    const daysAway = (minimum.getTime() - Date.now()) / (24 * 60 * 60 * 1_000)
    const maximumDaysAway =
      (maximum.getTime() - Date.now()) / (24 * 60 * 60 * 1_000)
    expect(daysAway).toBeGreaterThan(6.9)
    expect(maximumDaysAway).toBeLessThanOrEqual(35.1)
    expect(capacityInput).toHaveAttribute('max', '6')
  })

  it('announces localized errors and links them to invalid fields', async () => {
    const user = userEvent.setup()
    renderForm('tr')

    await user.click(
      screen.getByRole('button', { name: 'Özel taslağı incele' }),
    )

    expect(
      await screen.findByText('İşaretli alanları kontrol edin'),
    ).toBeInTheDocument()
    const menuTitle = screen.getByLabelText('Menü başlığı')
    await waitFor(() =>
      expect(menuTitle).toHaveAttribute('aria-invalid', 'true'),
    )
    const errorId = menuTitle.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId ?? '')).toHaveTextContent(
      'Ev halkı menüsüne açıklayıcı bir başlık verin.',
    )
    expect(
      screen.queryByText(/give the household menu/i),
    ).not.toBeInTheDocument()
  })
})
