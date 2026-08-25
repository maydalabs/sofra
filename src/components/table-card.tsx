import { CalendarDays, Languages, MapPin, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { EditorialPhoto } from '@/components/editorial-photo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PublicHostedTable } from '@/features/hosted-tables/types'
import { Link } from '@/i18n/navigation'
import { getAppLocale } from '@/i18n/routing'
import { formatTableDate } from '@/lib/date'
import { formatTry } from '@/features/pricing/pricing'
import { formatTableLanguages } from '@/lib/language'

export async function TableCard({
  table,
  locale,
}: {
  table: PublicHostedTable
  locale: string
}) {
  const t = await getTranslations('Common')
  const discovery = await getTranslations('Discovery')
  const appLocale = getAppLocale(locale)

  return (
    <Card className="group overflow-hidden border-0 bg-transparent py-0 shadow-none">
      <Link
        href={`/tables/${table.slug}`}
        className="block"
        aria-label={`${t('viewTable')}: ${table.menuTitle}`}
      >
        <EditorialPhoto
          label={discovery('tablePhotoLabel', { title: table.menuTitle })}
          className="aspect-[4/3] min-h-0 transition-transform duration-500 group-hover:scale-[1.015]"
          tone={table.format === 'private' ? 'sage' : 'warm'}
        />
      </Link>
      <CardContent className="space-y-4 px-1 pt-5 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {table.format === 'shared' ? t('shared') : t('private')}
          </Badge>
          {table.guaranteedOperation ? (
            <Badge variant="outline">{t('guaranteed')}</Badge>
          ) : null}
          {table.status === 'published' && !table.guaranteedOperation ? (
            <Badge variant="outline">{discovery('minimumPending')}</Badge>
          ) : null}
        </div>
        <div>
          <Link href={`/tables/${table.slug}`}>
            <h3 className="group-hover:text-primary text-[1.7rem] leading-[1.05] font-medium transition-colors">
              {table.menuTitle}
            </h3>
          </Link>
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">
            {table.menuDescription}
          </p>
        </div>
        <div className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatTableDate(table.startsAt, locale)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="size-3.5" aria-hidden="true" />
            {table.neighborhood}
          </span>
          <span className="flex items-center gap-2">
            <Languages className="size-3.5" aria-hidden="true" />
            {formatTableLanguages(table.languages, appLocale).join(' · ')}
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-3.5" aria-hidden="true" />
            {t('seatsLeft', { count: table.availableSeats })}
          </span>
        </div>
        <div className="border-border/70 flex items-end justify-between border-t pt-4">
          <div>
            <p className="font-heading text-2xl font-semibold">
              {formatTry(
                table.guestPriceKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('allInclusive')} · {t('perPerson')}
            </p>
          </div>
          <span
            className="text-primary text-sm font-semibold"
            aria-hidden="true"
          >
            {t('viewTable')} →
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
