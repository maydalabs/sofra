import { describe, expect, it } from 'vitest'

import {
  preparePostDinnerSafetyReport,
  preparePrivateConstructiveFeedback,
  preparePublicExperienceReview,
  toPostDinnerIntentReview,
} from './post-dinner'

describe('post-dinner trust service', () => {
  it('prepares a public review for moderation without auto-publishing it', () => {
    const intent = preparePublicExperienceReview(
      {
        rating: 5,
        title: 'A thoughtful evening',
        body: 'Dinner was warm and unhurried, with generous conversation over tea.',
        privacyAcknowledged: true,
      },
      'completed',
    )

    expect(intent).toMatchObject({
      channel: 'public_review',
      moderationStatus: 'pending_review',
      rating: 5,
    })
    const review = JSON.stringify(toPostDinnerIntentReview(intent))
    expect(review).not.toContain(intent.title)
    expect(review).not.toContain(intent.body)
  })

  it('keeps constructive feedback operations-only and out of its safe review', () => {
    const privateBody =
      'A private suggestion about making the arrival handoff clearer.'
    const intent = preparePrivateConstructiveFeedback(
      { body: privateBody },
      'completed',
    )

    expect(intent.visibility).toBe('operations_only')
    expect(JSON.stringify(toPostDinnerIntentReview(intent))).not.toContain(
      privateBody,
    )
  })

  it('opens a confidential incident and requires the linked payout hold', () => {
    const confidentialReport =
      'A fictional safety concern that must remain inside restricted operations.'
    const intent = preparePostDinnerSafetyReport(
      { severity: 'medium', confidentialReport },
      'completed',
    )
    const review = toPostDinnerIntentReview(intent)

    expect(review).toEqual({
      channel: 'safety_incident',
      incidentStatus: 'open',
      payoutStatus: 'held',
    })
    expect(JSON.stringify(review)).not.toContain(confidentialReport)
    expect(JSON.stringify(review)).not.toContain('medium')
  })

  it('rejects every post-dinner channel before completion', () => {
    expect(() =>
      preparePublicExperienceReview(
        {
          rating: 4,
          title: 'Too early to review',
          body: 'This review cannot be submitted before the dinner is complete.',
          privacyAcknowledged: true,
        },
        'confirmed',
      ),
    ).toThrow(/completed booking/i)
    expect(() =>
      preparePrivateConstructiveFeedback(
        { body: 'This private note is also too early to submit.' },
        'confirmed',
      ),
    ).toThrow(/completed booking/i)
    expect(() =>
      preparePostDinnerSafetyReport(
        {
          severity: 'medium',
          confidentialReport:
            'This post-dinner safety submission is also too early.',
        },
        'confirmed',
      ),
    ).toThrow(/completed booking/i)
  })
})
