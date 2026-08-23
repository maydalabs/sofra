import { LockKeyhole } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function PrivateAddressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('address')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <LockKeyhole className="size-4" />
          <AlertTitle>Private operational record</AlertTitle>
          <AlertDescription>
            This record is separate from the public neighborhood. It must never
            enter listing HTML, public map inputs, analytics, metadata, or
            public database views. Protected address writes are not connected,
            so this preview does not save or echo an exact address.
          </AlertDescription>
        </Alert>
        <form className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-line">Address line</Label>
            <Input id="address-line" placeholder="Not populated in demo data" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" defaultValue="Kadıköy" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" defaultValue="Istanbul" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="arrival">
              Post-confirmation arrival instructions
            </Label>
            <Textarea id="arrival" rows={4} />
          </div>
          <Button type="button" disabled>
            Protected address editing not connected
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
