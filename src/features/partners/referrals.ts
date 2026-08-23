import type { BookingStatus } from '@/server/database/database.types'

export type PartnerOrganizationStatus = 'active' | 'paused' | 'closed'
export type PartnerReferralStage = 'landed' | 'booked' | 'completed' | 'closed'

export interface PartnerReferralProjectionInput {
  organizationId: string
  organizationName: string
  organizationCode: string
  organizationStatus: PartnerOrganizationStatus
  attributionId: string | null
  referralCode: string | null
  landedAt: string | null
  bookingId: string | null
  bookingStatus: BookingStatus | null
  partySize: number | null
  tableSlug: string | null
  menuTitle: string | null
  startsAt: string | null
  neighborhood: string | null
}

export interface PartnerReferralActivity {
  id: string
  attributionId: string
  referralCode: string
  landedAt: string
  bookingId: string | null
  bookingStatus: BookingStatus | null
  partySize: number | null
  tableSlug: string | null
  menuTitle: string | null
  startsAt: string | null
  neighborhood: string | null
  stage: PartnerReferralStage
}

export interface PartnerReferralOverview {
  organizationId: string
  organizationName: string
  organizationCode: string
  organizationStatus: PartnerOrganizationStatus
  attributedVisits: number
  attributedBookings: number
  completedBookings: number
  completedTravelers: number
  activity: PartnerReferralActivity[]
}

export function buildPartnerReferralOverviews(
  rows: readonly PartnerReferralProjectionInput[],
): PartnerReferralOverview[] {
  const rowsByOrganization = new Map<string, PartnerReferralProjectionInput[]>()

  for (const row of rows) {
    const organizationRows = rowsByOrganization.get(row.organizationId) ?? []
    organizationRows.push(row)
    rowsByOrganization.set(row.organizationId, organizationRows)
  }

  return [...rowsByOrganization.values()].map((organizationRows) => {
    const organization = organizationRows[0]
    const activities = organizationRows.flatMap((row) => {
      if (!row.attributionId || !row.referralCode || !row.landedAt) return []
      return [
        {
          id: `${row.attributionId}:${row.bookingId ?? 'landing'}`,
          attributionId: row.attributionId,
          referralCode: row.referralCode,
          landedAt: row.landedAt,
          bookingId: row.bookingId,
          bookingStatus: row.bookingStatus,
          partySize: row.partySize,
          tableSlug: row.tableSlug,
          menuTitle: row.menuTitle,
          startsAt: row.startsAt,
          neighborhood: row.neighborhood,
          stage: referralStage(row.bookingId, row.bookingStatus),
        } satisfies PartnerReferralActivity,
      ]
    })
    const attributionIds = new Set(
      activities.map((activity) => activity.attributionId),
    )
    const bookingById = new Map(
      activities.flatMap((activity) =>
        activity.bookingId ? [[activity.bookingId, activity] as const] : [],
      ),
    )
    const completed = [...bookingById.values()].filter(
      (activity) => activity.bookingStatus === 'completed',
    )

    return {
      organizationId: organization.organizationId,
      organizationName: organization.organizationName,
      organizationCode: organization.organizationCode,
      organizationStatus: organization.organizationStatus,
      attributedVisits: attributionIds.size,
      attributedBookings: bookingById.size,
      completedBookings: completed.length,
      completedTravelers: completed.reduce(
        (total, activity) => total + (activity.partySize ?? 0),
        0,
      ),
      activity: activities.sort(
        (left, right) =>
          new Date(right.landedAt).getTime() -
          new Date(left.landedAt).getTime(),
      ),
    }
  })
}

function referralStage(
  bookingId: string | null,
  bookingStatus: BookingStatus | null,
): PartnerReferralStage {
  if (!bookingId) return 'landed'
  if (bookingStatus === 'completed') return 'completed'
  if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') {
    return 'closed'
  }
  return 'booked'
}
