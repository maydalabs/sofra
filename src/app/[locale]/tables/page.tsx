import { CalendarSearch, Filter } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EmptyState } from '@/components/empty-state'
import { TableCard } from '@/components/table-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from '@/i18n/navigation'
import { listPublicTables } from '@/server/repositories/queries'
import { getServerTimeMilliseconds } from '@/server/time/clock'

type SearchParameters = { format?: string; area?: string; date?: string }

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
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="date-filter">{t('date')}</Label>
              <Select name="date" defaultValue={filters.date ?? 'all'}>
                <SelectTrigger id="date-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allDates')}</SelectItem>
                  <SelectItem value="soon">{t('next14Days')}</SelectItem>
                  <SelectItem value="later">{t('laterMonth')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format-filter">{t('format')}</Label>
              <Select name="format" defaultValue={filters.format ?? 'all'}>
                <SelectTrigger id="format-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allFormats')}</SelectItem>
                  <SelectItem value="shared">{t('sharedOption')}</SelectItem>
                  <SelectItem value="private">{t('privateOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-filter">{t('neighborhood')}</Label>
              <Select name="area" defaultValue={filters.area ?? 'all'}>
                <SelectTrigger id="area-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allAreas')}</SelectItem>
                  <SelectItem value="anatolian">Kadıköy · Üsküdar</SelectItem>
                  <SelectItem value="european">Beşiktaş · Şişli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              <Filter className="size-4" aria-hidden="true" />
              {t('applyFilters')}
            </Button>
          </form>
        </CardContent>
      </Card>

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
    </div>
  )
}
