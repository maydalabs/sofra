import 'server-only'

import { cache } from 'react'

import { getOperatorSofraReadRepository } from './factory'

export const listOperatorHostApplications = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listHostApplications()
})

export const findOperatorHostApplicationById = cache(async (id: string) => {
  const repository = await getOperatorSofraReadRepository()
  return repository.findHostApplicationById(id)
})

export const listOperatorTableReviews = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listTableReviews()
})

export const findOperatorTableReviewById = cache(async (id: string) => {
  const repository = await getOperatorSofraReadRepository()
  return repository.findTableReviewById(id)
})

export const listOperatorBookings = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listBookings()
})

export const listOperatorIncidents = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listIncidents()
})

export const listOperatorPayouts = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listPayouts()
})

export const listOperatorAuditEvents = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  return repository.listAuditEvents()
})

export const getOperatorOverview = cache(async () => {
  const repository = await getOperatorSofraReadRepository()
  const [applications, tables, incidents, payouts, auditEvents] =
    await Promise.all([
      repository.listHostApplications(),
      repository.listTableReviews(),
      repository.listIncidents(),
      repository.listPayouts(),
      repository.listAuditEvents(),
    ])
  return { applications, tables, incidents, payouts, auditEvents }
})
