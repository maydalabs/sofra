import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/server/database/database.types'
import { RepositoryQueryError } from '@/server/repositories/errors'

export type PartnerReferralSummaryRow =
  Database['public']['Functions']['get_my_partner_referral_summary']['Returns'][number]

export interface SofraPartnerReadGateway {
  readReferralSummary(): Promise<PartnerReferralSummaryRow[]>
}

export class SupabasePartnerReadGateway implements SofraPartnerReadGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async readReferralSummary() {
    const { data, error } = await this.client.rpc(
      'get_my_partner_referral_summary',
    )
    if (error) {
      throw new RepositoryQueryError(
        'read partner referral summary',
        error.message,
      )
    }
    return data
  }
}
