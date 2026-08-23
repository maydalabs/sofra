import 'server-only'

import { cache } from 'react'

import { getPartnerSofraReadRepository } from './factory'

export const getPartnerReferralOverviews = cache(async () => {
  const repository = await getPartnerSofraReadRepository()
  return repository.getReferralOverviews()
})
