'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, ReceiptText, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ReactNode } from 'react'
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

import { createBookingRequestSchema, type BookingRequestInput } from './schemas'

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
        | 'unexpected_error'
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
  const maximumParty =
    table.format === 'shared'
      ? Math.min(table.maximumSharedPartySize, table.availableSeats)
      : table.availableSeats
  const validationSchema = useMemo(
    () =>
      createBookingRequestSchema({
        maximumPartySize: maximumParty,
        messages: {
          partySizeNumber: t('validation.partySizeNumber'),
          partySizeInteger: t('validation.partySizeInteger'),
          partySizeRange: (maximum) =>
            t('validation.partySizeRange', { maximum }),
          primaryName: t('validation.primaryName'),
          primaryNameTooLong: t('validation.primaryNameTooLong'),
          email: t('validation.email'),
          additionalGuestsTooLong: t('validation.additionalGuestsTooLong'),
          dietaryDisclosureTooLong: t('validation.dietaryDisclosureTooLong'),
          compatibilityAcknowledgment: t(
            'validation.compatibilityAcknowledgment',
          ),
          tablePolicyAcknowledgment: t('validation.tablePolicyAcknowledgment'),
          additionalGuestNames: (count) =>
            t('validation.additionalGuestNames', { count }),
          dietaryDisclosure: t('validation.dietaryDisclosure'),
        },
      }),
    [maximumParty, t],
  )
  const form = useForm<BookingRequestInput>({
    resolver: zodResolver(validationSchema),
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
  const errorMessage = result ? getResultErrorMessage(result.status, t) : null
  const validationErrorCount = Object.keys(form.formState.errors).length

  const submit = form.handleSubmit(async (values) => {
    setResult(null)
    try {
      setResult(await action(table.slug, values))
    } catch {
      setResult({ status: 'unexpected_error' })
    }
  })

  return (
    <form
      aria-label={t('formLabel')}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={submit}
      className="space-y-7"
    >
      {form.formState.submitCount > 0 && validationErrorCount > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{t('validationTitle')}</AlertTitle>
          <AlertDescription>
            {t('validationSummary', { count: validationErrorCount })}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="booking-party-size"
          label={t('partySize')}
          error={form.formState.errors.partySize?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="number"
              min={1}
              max={maximumParty}
              {...form.register('partySize', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <div className="space-y-2">
          <Label htmlFor="booking-party-type">{t('partyType')}</Label>
          <Controller
            control={form.control}
            name="partyType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="booking-party-type">
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
          id="booking-primary-name"
          label={t('primaryName')}
          error={form.formState.errors.primaryName?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              autoComplete="name"
              {...form.register('primaryName')}
            />
          )}
        </FormField>
        <FormField
          id="booking-primary-email"
          label={t('email')}
          error={form.formState.errors.primaryEmail?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="email"
              autoComplete="email"
              {...form.register('primaryEmail')}
            />
          )}
        </FormField>
      </div>
      <FormField
        id="booking-additional-guests"
        label={t('additionalGuests')}
        error={form.formState.errors.additionalGuests?.message}
      >
        {(accessibilityProps) => (
          <Textarea
            {...accessibilityProps}
            rows={3}
            placeholder={t('additionalGuestsPlaceholder')}
            {...form.register('additionalGuests')}
          />
        )}
      </FormField>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="booking-dietary-needs">
            {t('dietaryNeedQuestion')}
          </Label>
          <Controller
            control={form.control}
            name="dietaryNeeds"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="booking-dietary-needs">
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
            id="booking-dietary-disclosure"
            label={t('dietary')}
            error={form.formState.errors.dietaryDisclosure?.message}
          >
            {(accessibilityProps) => (
              <Textarea
                {...accessibilityProps}
                rows={4}
                {...form.register('dietaryDisclosure')}
              />
            )}
          </FormField>
        ) : null}
        <p className="text-muted-foreground flex gap-2 text-xs leading-5">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
          />
          {t('dietaryHelp')}
        </p>
      </div>
      <Alert>
        <ShieldAlert aria-hidden="true" className="size-4" />
        <AlertTitle>{t('menuFixedTitle')}</AlertTitle>
        <AlertDescription>{t('menuFixedBody')}</AlertDescription>
      </Alert>
      <Controller
        control={form.control}
        name="compatibilityAcknowledged"
        render={({ field }) => (
          <CheckField
            id="booking-compatibility-acknowledgment"
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
            id="booking-policy-acknowledgment"
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
            <ReceiptText aria-hidden="true" className="size-4" />
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
            {formatTry(
              table.guestPriceKurus,
              locale === 'tr' ? 'tr-TR' : 'en-US',
            )}{' '}
            × {partySize}
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
        {form.formState.isSubmitting ? t('submitting') : t('continue')}
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
    unexpected_error: t('errors.unexpected'),
  }
  return errors[status] ?? null
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: (props: {
    id: string
    'aria-invalid': true | undefined
    'aria-describedby': string | undefined
  }) => ReactNode
}) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function CheckField({
  id,
  checked,
  onCheckedChange,
  label,
  error,
}: {
  id: string
  checked: boolean
  onCheckedChange: (value: boolean | 'indeterminate') => void
  label: string
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div>
      <div className="flex items-start gap-3 rounded-2xl border p-4">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="cursor-pointer text-sm leading-6">
          {label}
        </Label>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
