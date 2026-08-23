import { describe, expect, it } from 'vitest'

import {
  approveHostedTable,
  createHostedTableDraft,
  submitHostedTable,
} from './hosted-tables'

const validInput = {
  menuTitle: 'A complete Sunday menu',
  menuDescription:
    'Lentil soup, stuffed vegetables, rice, seasonal salad, dessert, and tea.',
  startsAt: '2026-08-15T19:00:00',
  format: 'shared' as const,
  proposedCapacity: 4,
  minimumGuestCount: 2,
  hostNetPayoutTry: 1_200,
  atmosphere: 'Warm, easygoing, and conversational',
  expectedHouseholdParticipants:
    'Two verified adult hosts join dinner and tea.',
  practicalInformation:
    'Shoes are left near the entrance and slippers are offered.',
}

const context = {
  now: new Date('2026-08-03T12:00:00.000Z'),
  actorId: 'host-1',
  actorSuspended: false,
  certifiedCapacity: 6,
  activeUpcomingTableCount: 0,
  dinnersInTargetWeek: 0,
}

describe('hosted-table service integration', () => {
  it('creates a valid private draft with calculated guest price', () => {
    const result = createHostedTableDraft(validInput, context)
    expect(result.status).toBe('draft')
    expect(result.guestPriceKurus).toBe(160_000)
  })

  it('rejects a date under seven days and capacity over certification', () => {
    expect(() =>
      createHostedTableDraft(
        { ...validInput, startsAt: '2026-08-08T19:00:00' },
        context,
      ),
    ).toThrow(/at least 7 days/i)
    expect(() =>
      createHostedTableDraft({ ...validInput, proposedCapacity: 7 }, context),
    ).toThrow(/certified capacity/i)
  })

  it('authorizes approval server-side', () => {
    expect(() =>
      approveHostedTable({
        currentStatus: 'submitted',
        actorRoles: ['traveler'],
      }),
    ).toThrow(/operator or administrator/i)
    expect(
      approveHostedTable({
        currentStatus: 'submitted',
        actorRoles: ['operator'],
      }),
    ).toBe('approved')
  })

  it('allows editable host states to enter review and stops suspended hosts', () => {
    expect(
      submitHostedTable({
        currentStatus: 'changes_requested',
        actorSuspended: false,
        certificationActive: true,
      }),
    ).toBe('submitted')
    expect(() =>
      submitHostedTable({
        currentStatus: 'draft',
        actorSuspended: true,
        certificationActive: true,
      }),
    ).toThrow(/suspended host/i)
    expect(() =>
      submitHostedTable({
        currentStatus: 'draft',
        actorSuspended: false,
        certificationActive: false,
      }),
    ).toThrow(/active host certification/i)
  })
})
