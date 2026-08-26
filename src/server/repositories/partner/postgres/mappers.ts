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
  const f = (name: string) => `get_partner_referral_summary.${name}`
  const required = <T>(value: T | null | undefined, field: string): T => {
    if (value === null || value === undefined)
      throw new RepositoryDataError(field)
    return value
  }

  const status = required(row.organization_status, f('organization_status'))
  if (!organizationStatuses.has(status as PartnerOrganizationStatus)) {
    throw new RepositoryDataError(f('organization_status'))
  }

  return {
    organizationId: required(row.organization_id, f('organization_id')),
    organizationName: required(row.organization_name, f('organization_name')),
    organizationCode: required(row.organization_code, f('organization_code')),
    organizationStatus: status as PartnerOrganizationStatus,
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
