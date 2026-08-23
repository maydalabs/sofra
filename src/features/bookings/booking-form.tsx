'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, ReceiptText, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatTry } from '@/features/pricing/pricing'

import { bookingRequestSchema, type BookingRequestInput } from './schemas'

interface BookingReview {
  partySize: number
  guestTotalKurus: number
  compatibilityStatus: 'not_required' | 'pending'
  bookingStatus: 'awaiting_payment'
}

type BookingActionResult =
  | {
      status:
        | 'authentication_required'
        | 'table_unavailable'
        | 'party_too_large'
        | 'booking_closed'
        | 'invalid_request'
    }
  | {
      status: 'payments_disabled'
      review: BookingReview
    }
  | {
      status: 'simulated_success' | 'simulated_failure'
      bookingId: string
      paymentReference: string
      review: BookingReview
    }

export function BookingForm({
  table,
  locale,
  action,
}: {
  table: {
    slug: string
    format: 'shared' | 'private'
    availableSeats: number
    guestPriceKurus: number
    maximumSharedPartySize: number
  }
  locale: string
  action: (
    slug: string,
    values: BookingRequestInput,
  ) => Promise<BookingActionResult>
}) {
  const t = useTranslations('Booking')
  const common = useTranslations('Common')
  const [result, setResult] = useState<BookingActionResult | null>(null)
  const form = useForm<BookingRequestInput>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: {
      partySize: 1,
      partyType: 'solo',
      primaryName: '',
      primaryEmail: '',
      additionalGuests: '',
      dietaryNeeds: 'none',
      dietaryDisclosure: '',
      compatibilityAcknowledged: false,
      tablePolicyAcknowledged: false,
    },
  })
  const partySize = useWatch({ control: form.control, name: 'partySize' }) || 1
  const dietaryNeeds = useWatch({
    control: form.control,
    name: 'dietaryNeeds',
  })
  const maximumParty =
    table.format === 'shared'
      ? Math.min(table.maximumSharedPartySize, table.availableSeats)
      : table.availableSeats
  const errorMessage = result ? getResultErrorMessage(result.status, t) : null

  return (
    <form
      onSubmit={form.handleSubmit(async (values) =>
        setResult(await action(table.slug, values)),
      )}
      className="space-y-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label={t('partySize')}
          error={form.formState.errors.partySize?.message}
        >
          <Input
            aria-label={t('partySize')}
            type="number"
            min={1}
            max={maximumParty}
            {...form.register('partySize', { valueAsNumber: true })}
          />
        </FormField>
        <div className="space-y-2">
          <Label>{t('partyType')}</Label>
          <Controller
            control={form.control}
            name="partyType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label={t('partyType')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">{t('partyTypes.solo')}</SelectItem>
                  <SelectItem value="couple">
                    {t('partyTypes.couple')}
                  </SelectItem>
                  <SelectItem value="family">
                    {t('partyTypes.family')}
                  </SelectItem>
                  <SelectItem value="friends">
                    {t('partyTypes.friends')}
                  </SelectItem>
                  <SelectItem value="colleagues">
                    {t('partyTypes.colleagues')}
                  </SelectItem>
                  <SelectItem value="other">{t('partyTypes.other')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <FormField
          label={t('primaryName')}
          error={form.formState.errors.primaryName?.message}
        >
          <Input
            aria-label={t('primaryName')}
            autoComplete="name"
            {...form.register('primaryName')}
          />
        </FormField>
        <FormField
          label={t('email')}
          error={form.formState.errors.primaryEmail?.message}
        >
          <Input
            aria-label={t('email')}
            type="email"
            autoComplete="email"
            {...form.register('primaryEmail')}
          />
        </FormField>
      </div>
      <FormField
        label={t('additionalGuests')}
        error={form.formState.errors.additionalGuests?.message}
      >
        <Textarea
          aria-label={t('additionalGuests')}
          rows={3}
          placeholder={t('additionalGuestsPlaceholder')}
          {...form.register('additionalGuests')}
        />
      </FormField>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('dietaryNeedQuestion')}</Label>
          <Controller
            control={form.control}
            name="dietaryNeeds"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label={t('dietaryNeedQuestion')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('dietaryNone')}</SelectItem>
                  <SelectItem value="review_required">
                    {t('dietaryReview')}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {dietaryNeeds === 'review_required' ? (
          <FormField
            label={t('dietary')}
            error={form.formState.errors.dietaryDisclosure?.message}
          >
            <Textarea
              aria-label={t('dietary')}
              rows={4}
              {...form.register('dietaryDisclosure')}
            />
          </FormField>
        ) : null}
        <p className="text-muted-foreground flex gap-2 text-xs leading-5">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
          {t('dietaryHelp')}
        </p>
      </div>
      <Alert>
        <ShieldAlert className="size-4" />
        <AlertTitle>{t('menuFixedTitle')}</AlertTitle>
        <AlertDescription>{t('menuFixedBody')}</AlertDescription>
      </Alert>
      <Controller
        control={form.control}
        name="compatibilityAcknowledged"
        render={({ field }) => (
          <CheckField
            checked={field.value}
            onCheckedChange={(value) => field.onChange(value === true)}
            label={t('compatibility')}
            error={form.formState.errors.compatibilityAcknowledged?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="tablePolicyAcknowledged"
        render={({ field }) => (
          <CheckField
            checked={field.value}
            onCheckedChange={(value) => field.onChange(value === true)}
            label={t('policy')}
            error={form.formState.errors.tablePolicyAcknowledged?.message}
          />
        )}
      />
      <div className="bg-secondary rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ReceiptText className="size-4" />
            {t('summary')}
          </span>
          <span className="font-heading text-3xl font-semibold">
            {formatTry(
              table.guestPriceKurus * partySize,
              locale === 'tr' ? 'tr-TR' : 'en-US',
            )}
          </span>
        </div>
        <div className="text-muted-foreground mt-3 flex justify-between text-xs">
          <span>
            {formatTry(table.guestPriceKurus)} × {partySize}
          </span>
          <span>{common('allInclusive')}</span>
        </div>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {t('continue')}
      </Button>
      {result?.status === 'payments_disabled' ? (
        <Alert>
          <AlertTitle>{common('paymentsDisabled')}</AlertTitle>
          <AlertDescription>{t('disabledBody')}</AlertDescription>
        </Alert>
      ) : null}
      {result?.status === 'simulated_success' ? (
        <Alert>
          <AlertTitle>{t('localSuccessTitle')}</AlertTitle>
          <AlertDescription>
            {t('mockBody')} Reference: {result.bookingId}
          </AlertDescription>
        </Alert>
      ) : null}
      {result && 'review' in result ? (
        <div className="rounded-2xl border p-5">
          <h2 className="font-heading text-2xl font-semibold">
            {t('reviewTitle')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('reviewBody')}
          </p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <ReviewItem
              label={t('reviewParty')}
              value={String(result.review.partySize)}
            />
            <ReviewItem
              label={t('reviewCompatibility')}
              value={
                result.review.compatibilityStatus === 'pending'
                  ? t('reviewCompatibilityPending')
                  : t('reviewCompatibilityNotRequired')
              }
            />
            <ReviewItem
              label={t('reviewPayment')}
              value={formatTry(
                result.review.guestTotalKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            />
          </dl>
        </div>
      ) : null}
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

function getResultErrorMessage(
  status: BookingActionResult['status'],
  t: ReturnType<typeof useTranslations<'Booking'>>,
) {
  const errors: Partial<Record<BookingActionResult['status'], string>> = {
    authentication_required: t('errors.authenticationRequired'),
    table_unavailable: t('errors.tableUnavailable'),
    party_too_large: t('errors.partyTooLarge'),
    booking_closed: t('errors.bookingClosed'),
    invalid_request: t('errors.invalidRequest'),
    simulated_failure: t('errors.simulatedFailure'),
  }
  return errors[status] ?? null
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}

function CheckField({
  checked,
  onCheckedChange,
  label,
  error,
}: {
  checked: boolean
  onCheckedChange: (value: boolean | 'indeterminate') => void
  label: string
  error?: string
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-0.5"
        />
        <span className="text-sm leading-6">{label}</span>
      </label>
      {error ? <p className="text-destructive mt-1 text-sm">{error}</p> : null}
    </div>
  )
}
