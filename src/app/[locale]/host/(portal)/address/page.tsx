import { LockKeyhole } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { requireHostPageActor } from '../authorize'

export default async function PrivateAddressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireHostPageActor(locale)
  const t = await getTranslations('HostPortal')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('address')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <LockKeyhole className="size-4" />
          <AlertTitle>{t('privateRecordTitle')}</AlertTitle>
          <AlertDescription id="private-address-note">
            {t('privateRecordBody')}
          </AlertDescription>
        </Alert>
        <form
          aria-describedby="private-address-note"
          className="grid gap-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-line">{t('addressLine')}</Label>
            <Input
              id="address-line"
              placeholder={t('addressPlaceholder')}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">{t('district')}</Label>
            <Input id="district" defaultValue="Kadıköy" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t('city')}</Label>
            <Input id="city" defaultValue="İstanbul" readOnly />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="arrival">{t('arrivalInstructions')}</Label>
            <Textarea
              id="arrival"
              rows={4}
              placeholder={t('arrivalPlaceholder')}
              readOnly
            />
          </div>
          <Button type="button" disabled>
            {t('addressEditingUnavailable')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
