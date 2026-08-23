import 'server-only'

import { buildPartnerReferralOverviews } from '@/features/partners/referrals'
import type { Actor } from '@/server/authorization/roles'
import { assertHasAnyRole } from '@/server/authorization/roles'

import type { SofraPartnerReadRepository } from '../contracts'
import type { SofraPartnerReadGateway } from './gateway'
import { mapPartnerReferralSummaryRow } from './mappers'

export class SupabaseSofraPartnerReadRepository implements SofraPartnerReadRepository {
  constructor(
    private readonly gateway: SofraPartnerReadGateway,
    private readonly actor: Actor,
  ) {}

  async getReferralOverviews() {
    this.assertPartner()
    const rows = await this.gateway.readReferralSummary()
    return buildPartnerReferralOverviews(rows.map(mapPartnerReferralSummaryRow))
  }

  private assertPartner() {
    assertHasAnyRole(this.actor, ['partner_user'])
  }
}
