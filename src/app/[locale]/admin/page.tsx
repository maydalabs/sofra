import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  const metrics = [
    { icon: ClipboardList, value: '1', label: t('applications') },
    { icon: CalendarCheck, value: '1', label: t('tables') },
    { icon: AlertTriangle, value: '1', label: t('incidents') },
    { icon: ShieldCheck, value: '24', label: t('audit') },
  ]
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, value, label }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className="text-primary size-5" />
              <p className="font-heading mt-5 text-4xl font-semibold">
                {value}
              </p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Needs attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdminQueueLink
            href="/admin/host-applications/demo-application"
            title="Selin & Derya household application"
            note="Submitted 2 days ago · assessment not started"
            badge="Host review"
          />
          <AdminQueueLink
            href="/admin/tables/table-ece-can-besiktas"
            title="Two hometowns at one Istanbul table"
            note="Complete menu and capacity ready for approval"
            badge="Table review"
          />
          <AdminQueueLink
            href="/admin/incidents"
            title="Confidential service-boundary demonstration"
            note="Restricted record · payout hold active"
            badge="Safety"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function AdminQueueLink({
  href,
  title,
  note,
  badge,
}: {
  href: string
  title: string
  note: string
  badge: string
}) {
  return (
    <Link
      href={href}
      className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
    >
      <div>
        <p className="font-heading text-xl font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </div>
      <Badge variant="outline">{badge}</Badge>
    </Link>
  )
}
