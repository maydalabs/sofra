import 'server-only'

import { buildPartnerReferralOverviews } from '@/features/partners/referrals'
import { getDemoPartnerReferralRows } from '@/server/demo/partner-records'
import type { Actor } from '@/server/authorization/roles'
import { assertHasAnyRole } from '@/server/authorization/roles'

import type { SofraPartnerReadRepository } from './contracts'

export class DemoSofraPartnerReadRepository implements SofraPartnerReadRepository {
  constructor(private readonly actor: Actor) {}

  async getReferralOverviews() {
    this.assertPartner()
    return buildPartnerReferralOverviews(getDemoPartnerReferralRows())
  }

  private assertPartner() {
    assertHasAnyRole(this.actor, ['partner_user'])
  }
}
