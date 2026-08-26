import 'server-only'

import type { Database } from '@/server/database/database.types'
import type { SofraDatabase } from '@/server/database/client'
import { RepositoryQueryError } from '@/server/repositories/errors'

export type PartnerReferralSummaryRow =
  Database['public']['Functions']['get_partner_referral_summary']['Returns'][number]

export interface SofraPartnerReadGateway {
  readReferralSummary(): Promise<PartnerReferralSummaryRow[]>
}

/**
 * The referral projection is scoped to the actor held here. The underlying
 * function also re-checks the partner_user role, so a profile id alone is not
 * enough to read another organisation's referrals.
 */
export class PostgresPartnerReadGateway implements SofraPartnerReadGateway {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async readReferralSummary() {
    try {
      const rows = await this.sql<PartnerReferralSummaryRow[]>`
        select * from public.get_partner_referral_summary(${this.actorId}::uuid)
      `
      return [...rows]
    } catch (error) {
      throw new RepositoryQueryError(
        'read partner referral summary',
        error instanceof Error ? error.message : String(error),
      )
    }
  }
}
