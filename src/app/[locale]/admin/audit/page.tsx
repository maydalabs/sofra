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

export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  const rows = [
    {
      action: 'hosted_table.submitted',
      entity: 'table-ece-can-besiktas',
      actor: 'demo-host',
      reason: 'Host submitted complete table',
    },
    {
      action: 'host_application.submitted',
      entity: 'demo-application',
      actor: 'demo-applicant',
      reason: 'Verified email application',
    },
    {
      action: 'payout.held',
      entity: 'demo-payout-1',
      actor: 'demo-operator',
      reason: 'Related safety incident open',
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('audit')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.action}>
                <TableCell className="font-mono text-xs">
                  {row.action}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.entity}
                </TableCell>
                <TableCell>{row.actor}</TableCell>
                <TableCell>{row.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
