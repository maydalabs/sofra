import { CalendarSearch, Filter } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EmptyState } from '@/components/empty-state'
import { TableCard } from '@/components/table-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { createPublicPageMetadata } from '@/features/seo/metadata'
import { getAppLocale } from '@/i18n/routing'
import { NativeSelect } from '@/components/ui/native-select'
import { Link } from '@/i18n/navigation'
import { listPublicTables } from '@/server/repositories/queries'
import { getServerTimeMilliseconds } from '@/server/time/clock'

type SearchParameters = { format?: string; area?: string; date?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const appLocale = getAppLocale(locale)
  const t = await getTranslations({ locale: appLocale, namespace: 'Meta' })
  return createPublicPageMetadata({
    locale: appLocale,
    path: '/tables',
    title: t('tablesTitle'),
    description: t('tablesDescription'),
    socialImageAlt: t('socialImageAlt'),
  })
}

export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParameters>
}) {
  const { locale } = await params
  const filters = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('Discovery')
  const allTables = await listPublicTables()
  const now = getServerTimeMilliseconds()
  const tables = allTables.filter((table) => {
    const daysAway =
      (new Date(table.startsAt).getTime() - now) / (24 * 60 * 60 * 1_000)
    if (
      filters.format &&
      filters.format !== 'all' &&
      table.format !== filters.format
    )
      return false
    if (
      filters.area === 'anatolian' &&
      !['Kadıköy', 'Üsküdar'].some((area) => table.neighborhood.includes(area))
    )
      return false
    if (
      filters.area === 'european' &&
      !['Beşiktaş', 'Şişli'].some((area) => table.neighborhood.includes(area))
    )
      return false
    if (filters.date === 'soon' && daysAway > 14) return false
    if (filters.date === 'later' && daysAway <= 14) return false
    return true
  })

  return (
    <div className="container-shell py-14 sm:py-20">
      <div className="max-w-4xl">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-4 text-5xl leading-none font-medium tracking-tight sm:text-7xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
          {t('intro')}
        </p>
      </div>

      <Card className="bg-card/80 mt-10">
        <CardContent className="p-5">
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
            aria-label={t('filterLegend')}
          >
            <div className="space-y-2">
              <Label htmlFor="date-filter">{t('date')}</Label>
              <NativeSelect
                name="date"
                id="date-filter"
                defaultValue={filters.date ?? 'all'}
              >
                <option value="all">{t('allDates')}</option>
                <option value="soon">{t('next14Days')}</option>
                <option value="later">{t('laterMonth')}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format-filter">{t('format')}</Label>
              <NativeSelect
                name="format"
                id="format-filter"
                defaultValue={filters.format ?? 'all'}
              >
                <option value="all">{t('allFormats')}</option>
                <option value="shared">{t('sharedOption')}</option>
                <option value="private">{t('privateOption')}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-filter">{t('neighborhood')}</Label>
              <NativeSelect
                name="area"
                id="area-filter"
                defaultValue={filters.area ?? 'all'}
              >
                <option value="all">{t('allAreas')}</option>
                <option value="anatolian">Kadıköy · Üsküdar</option>
                <option value="european">Beşiktaş · Şişli</option>
              </NativeSelect>
            </div>
            <Button type="submit">
              <Filter className="size-4" aria-hidden="true" />
              {t('applyFilters')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-label={t('resultsRegion')}>
        <div className="mt-12 flex items-center justify-between border-b pb-4">
          <h2 className="font-heading text-2xl font-medium">
            {t('results', { count: tables.length })}
          </h2>
          <p className="text-muted-foreground text-xs">{t('demoClusters')}</p>
        </div>
        {tables.length ? (
          <div className="mt-9 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title={t('emptyTitle')}
            description={t('emptyBody')}
            headingLevel={3}
            className="bg-card mt-8 rounded-3xl"
          >
            <Button variant="outline" asChild>
              <Link href="/tables">{t('clearFilters')}</Link>
            </Button>
          </EmptyState>
        )}
      </section>
    </div>
  )
}
