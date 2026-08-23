import 'server-only'

import type { PartnerReferralOverview } from '@/features/partners/referrals'

export interface SofraPartnerReadRepository {
  getReferralOverviews(): Promise<PartnerReferralOverview[]>
}
