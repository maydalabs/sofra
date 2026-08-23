import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import { DietaryDisclosureForm } from './dietary-disclosure-form'
import { dietaryAnalyticsProperties } from './schemas'
import messages from '../../../messages/en.json'

describe('dietary disclosure privacy', () => {
  it('records a private disclosure while analytics receive only safe booleans', async () => {
    const user = userEvent.setup()
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DietaryDisclosureForm />
      </NextIntlClientProvider>,
    )
    const explanation = 'Severe sesame allergy; cross-contact must be assessed.'
    await user.type(
      screen.getByLabelText(/what should the compatibility reviewer/i),
      explanation,
    )
    await user.click(
      screen.getByRole('button', { name: /save private disclosure/i }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      /no analytics payload/i,
    )

    const analytics = dietaryAnalyticsProperties({
      kind: 'allergy',
      importance: 'severe',
      explanation,
    })
    expect(analytics).toEqual({
      disclosureRecorded: true,
      requiresCompatibilityReview: true,
    })
    expect(JSON.stringify(analytics)).not.toContain('sesame')
  })
})
