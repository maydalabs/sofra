import { getPrivateDemoTables } from '@/features/hosted-tables/demo-tables'

export interface DemoBooking {
  id: string
  tableId: string
  tableSlug: string
  menuTitle: string
  householdName: string
  startsAt: string
  neighborhood: string
  partySize: number
  partyType: string
  status: 'pending_minimum' | 'confirmed' | 'completed'
  compatibilityStatus: 'accepted' | 'not_required'
  paymentStatus: 'authorized'
  guestTotalKurus: number
}

export function getDemoBookings(): DemoBooking[] {
  const tables = getPrivateDemoTables()
  const upcoming = tables.find(
    (table) => table.id === 'table-mercimek-kadikoy',
  )!
  const confirmed = tables.find((table) => table.id === 'table-ozdemir-sisli')!
  const completed = tables.find((table) => table.id === 'table-cem-completed')!

  return [
    {
      id: 'booking-demo-pending',
      tableId: upcoming.id,
      tableSlug: upcoming.slug,
      menuTitle: upcoming.menuTitle,
      householdName: upcoming.householdName,
      startsAt: upcoming.startsAt,
      neighborhood: upcoming.neighborhood,
      partySize: 1,
      partyType: 'solo',
      status: 'pending_minimum',
      compatibilityStatus: 'accepted',
      paymentStatus: 'authorized',
      guestTotalKurus: upcoming.guestPriceKurus,
    },
    {
      id: 'booking-demo-confirmed',
      tableId: confirmed.id,
      tableSlug: confirmed.slug,
      menuTitle: confirmed.menuTitle,
      householdName: confirmed.householdName,
      startsAt: confirmed.startsAt,
      neighborhood: confirmed.neighborhood,
      partySize: 2,
      partyType: 'couple',
      status: 'confirmed',
      compatibilityStatus: 'not_required',
      paymentStatus: 'authorized',
      guestTotalKurus: confirmed.guestPriceKurus * 2,
    },
    {
      id: 'booking-demo-completed',
      tableId: completed.id,
      tableSlug: completed.slug,
      menuTitle: completed.menuTitle,
      householdName: completed.householdName,
      startsAt: completed.startsAt,
      neighborhood: completed.neighborhood,
      partySize: 2,
      partyType: 'friends',
      status: 'completed',
      compatibilityStatus: 'accepted',
      paymentStatus: 'authorized',
      guestTotalKurus: completed.guestPriceKurus * 2,
    },
  ]
}

export function getDemoBooking(id: string) {
  return getDemoBookings().find((booking) => booking.id === id)
}
