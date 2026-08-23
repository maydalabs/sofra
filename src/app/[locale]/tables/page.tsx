import { Filter } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

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
                  <SelectItem value="soon">Next 14 days</SelectItem>
                  <SelectItem value="later">Later this month</SelectItem>
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
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
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
              <Filter className="size-4" /> Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-12 flex items-center justify-between border-b pb-4">
        <h2 className="font-heading text-2xl font-medium">
          {t('results', { count: tables.length })}
        </h2>
        <p className="text-muted-foreground text-xs">Istanbul demo clusters</p>
      </div>
      {tables.length ? (
        <div className="mt-9 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="bg-card mt-8 rounded-3xl border p-12 text-center">
          <h2 className="text-3xl">No tables match those filters.</h2>
          <p className="text-muted-foreground mt-2">
            Try both formats or a wider date window.
          </p>
        </div>
      )}
    </div>
  )
}
