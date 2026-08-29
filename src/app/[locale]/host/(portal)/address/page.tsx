import { LockKeyhole } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isDemoMode } from '@/server/auth/demo-session'
import { getAuthenticatedSofraReadRepository } from '@/server/repositories/factory'

import { requireHostOrApplicantPageActor } from '../authorize'
import { submitHostAddressAction } from './actions'

export default async function PrivateAddressPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ address?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const actor = await requireHostOrApplicantPageActor(locale)
  const t = await getTranslations('HostPortal')
  const { address: outcome } = await searchParams

  // The demo walkthrough keeps the read-only preview; with a real database the
  // record belongs to the host and they maintain it here.
  const demo = isDemoMode()
  const repository = await getAuthenticatedSofraReadRepository(actor.id)
  const current = await repository.findOwnHouseholdAddress()

  const notice =
    outcome === 'saved'
      ? { tone: 'default' as const, text: t('addressSaved') }
      : outcome === 'incomplete'
        ? { tone: 'destructive' as const, text: t('addressIncomplete') }
        : outcome === 'no_household'
          ? { tone: 'destructive' as const, text: t('addressNoHousehold') }
          : outcome === 'unavailable'
            ? { tone: 'destructive' as const, text: t('addressUnavailable') }
            : null

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
            {t('privateRecordBody')} {t('verificationPendingNote')}
          </AlertDescription>
        </Alert>
        {notice ? (
          <Alert
            variant={notice.tone}
            role={notice.tone === 'destructive' ? 'alert' : 'status'}
          >
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        ) : null}
        <form
          action={demo ? undefined : submitHostAddressAction}
          aria-describedby="private-address-note"
          className="grid gap-5 sm:grid-cols-2"
        >
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-line">{t('addressLine')}</Label>
            <Input
              id="address-line"
              name="addressLine1"
              placeholder={t('addressPlaceholder')}
              defaultValue={current?.addressLine1 ?? ''}
              readOnly={demo}
              required={!demo}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-line-2">{t('addressLine2')}</Label>
            <Input
              id="address-line-2"
              name="addressLine2"
              defaultValue={current?.addressLine2 ?? ''}
              readOnly={demo}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">{t('district')}</Label>
            <Input
              id="district"
              name="district"
              defaultValue={current?.district ?? ''}
              readOnly={demo}
              required={!demo}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t('city')}</Label>
            <Input
              id="city"
              name="city"
              defaultValue={current?.city ?? ''}
              readOnly={demo}
              required={!demo}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dwelling-type">{t('dwellingType')}</Label>
            <select
              id="dwelling-type"
              name="dwellingType"
              defaultValue={current?.dwellingType ?? ''}
              disabled={demo}
              required={!demo}
              aria-describedby="dwelling-type-help"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                —
              </option>
              <option value="apartment_flat">{t('dwellingApartment')}</option>
              <option value="detached_house">{t('dwellingDetached')}</option>
              <option value="other">{t('dwellingOther')}</option>
            </select>
            <p
              id="dwelling-type-help"
              className="text-muted-foreground text-xs"
            >
              {t('dwellingTypeHelp')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal-code">{t('postalCode')}</Label>
            <Input
              id="postal-code"
              name="postalCode"
              defaultValue={current?.postalCode ?? ''}
              readOnly={demo}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="arrival">{t('arrivalInstructions')}</Label>
            <Textarea
              id="arrival"
              name="arrivalInstructions"
              rows={4}
              placeholder={t('arrivalPlaceholder')}
              defaultValue={current?.arrivalInstructions ?? ''}
              readOnly={demo}
            />
          </div>
          {demo ? (
            <Button type="button" disabled>
              {t('addressEditingUnavailable')}
            </Button>
          ) : (
            <Button type="submit">{t('saveAddress')}</Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
