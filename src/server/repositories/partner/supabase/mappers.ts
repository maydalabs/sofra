import type {
  PartnerOrganizationStatus,
  PartnerReferralProjectionInput,
} from '@/features/partners/referrals'
import { RepositoryDataError } from '@/server/repositories/errors'

import type { PartnerReferralSummaryRow } from './gateway'

const organizationStatuses = new Set<PartnerOrganizationStatus>([
  'active',
  'paused',
  'closed',
])

export function mapPartnerReferralSummaryRow(
  row: PartnerReferralSummaryRow,
): PartnerReferralProjectionInput {
  if (!organizationStatuses.has(row.organization_status)) {
    throw new RepositoryDataError(
      'get_my_partner_referral_summary.organization_status',
    )
  }

  return {
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationCode: row.organization_code,
    organizationStatus: row.organization_status as PartnerOrganizationStatus,
    attributionId: row.attribution_id,
    referralCode: row.referral_code,
    landedAt: row.landed_at,
    bookingId: row.booking_id,
    bookingStatus: row.booking_status,
    partySize: row.party_size,
    tableSlug: row.table_slug,
    menuTitle: row.menu_title,
    startsAt: row.starts_at,
    neighborhood: row.public_neighborhood,
  }
}
