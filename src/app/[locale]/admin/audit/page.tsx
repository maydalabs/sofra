import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listOperatorAuditEvents } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const rows = await listOperatorAuditEvents()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('audit')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('actionColumn')}</TableHead>
              <TableHead>{t('entityColumn')}</TableHead>
              <TableHead>{t('actorColumn')}</TableHead>
              <TableHead>{t('reasonColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">
                  {row.action}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.entityId}
                </TableCell>
                <TableCell>{row.actorId ?? t('systemActor')}</TableCell>
                <TableCell>{row.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
