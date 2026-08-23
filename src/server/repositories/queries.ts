import 'server-only'

import { cache } from 'react'

import {
  getAuthenticatedSofraReadRepository,
  getPublicSofraReadRepository,
} from './factory'

export const listPublicTables = cache(async () => {
  const repository = await getPublicSofraReadRepository()
  return repository.listPublicTables()
})

export const findPublicTableBySlug = cache(async (slug: string) => {
  const repository = await getPublicSofraReadRepository()
  return repository.findPublicTableBySlug(slug)
})

export const listTravelerBookings = cache(async (actorId: string) => {
  const repository = await getAuthenticatedSofraReadRepository(actorId)
  return repository.listTravelerBookings()
})

export const findTravelerBookingById = cache(
  async (actorId: string, bookingId: string) => {
    const repository = await getAuthenticatedSofraReadRepository(actorId)
    return repository.findTravelerBookingById(bookingId)
  },
)

export const listHostTables = cache(async (actorId: string) => {
  const repository = await getAuthenticatedSofraReadRepository(actorId)
  return repository.listHostTables()
})

export const findHostTableById = cache(
  async (actorId: string, tableId: string) => {
    const repository = await getAuthenticatedSofraReadRepository(actorId)
    return repository.findHostTableById(tableId)
  },
)

export const findHostCertification = cache(async (actorId: string) => {
  const repository = await getAuthenticatedSofraReadRepository(actorId)
  return repository.findHostCertification()
})

export const listHostRoster = cache(
  async (actorId: string, tableId: string) => {
    const repository = await getAuthenticatedSofraReadRepository(actorId)
    return repository.listHostRoster(tableId)
  },
)
