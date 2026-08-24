import type { PublicHostedTable } from '@/features/hosted-tables/types'
import type { AppLocale } from '@/i18n/routing'

export function createPublicTableEventJsonLd(
  table: PublicHostedTable,
  locale: AppLocale,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: table.menuTitle,
    description: table.menuDescription,
    startDate: table.startsAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    inLanguage: locale,
    location: {
      '@type': 'Place',
      name: table.neighborhood,
    },
    organizer: {
      '@type': 'Organization',
      name: 'Sofra',
    },
    offers: {
      '@type': 'Offer',
      price: (table.guestPriceKurus / 100).toFixed(2),
      priceCurrency: table.currency,
      availability:
        table.availableSeats > 0 && table.status !== 'roster_locked'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
    },
  } as const
}

export function serializeJsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
