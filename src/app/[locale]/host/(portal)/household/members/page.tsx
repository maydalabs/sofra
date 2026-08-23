import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { requireHostPageActor } from '../../authorize'

export default async function HouseholdMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireHostPageActor(locale)
  const t = await getTranslations('HostPortal')
  const members = [
    {
      name: 'Ayşe',
      role: t('leadVerifiedHost'),
      participation: t('dinnerAndTea'),
    },
    {
      name: 'Levent',
      role: t('verifiedAdultHost'),
      participation: t('dinnerAndConversation'),
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('members')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div
            key={member.name}
            className="flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-heading text-xl font-semibold">
                {member.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {member.participation}
              </p>
            </div>
            <Badge variant="outline">{member.role}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
