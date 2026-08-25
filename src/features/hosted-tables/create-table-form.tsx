'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { developmentPolicy } from '@/features/policy/config'

import {
  createHostedTableValidationSchema,
  type CreateHostedTableInput,
} from './schemas'

function minimumDateTime() {
  const date = new Date()
  date.setDate(date.getDate() + developmentPolicy.minimumLeadDays)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function maximumDateTime() {
  const date = new Date()
  date.setDate(date.getDate() + developmentPolicy.maximumPublishingHorizonDays)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function CreateTableForm({
  certifiedCapacity,
  minimumStartsAt = minimumDateTime(),
  maximumStartsAt = maximumDateTime(),
}: {
  certifiedCapacity: number
  minimumStartsAt?: string
  maximumStartsAt?: string
}) {
  const t = useTranslations('CreateTable')
  const [result, setResult] = useState<string | null>(null)
  const validationSchema = useMemo(
    () =>
      createHostedTableValidationSchema({
        messages: {
          menuTitleMin: t('validation.menuTitleMin'),
          menuTitleMax: t('validation.menuTitleMax'),
          menuDescriptionMin: t('validation.menuDescriptionMin'),
          menuDescriptionMax: t('validation.menuDescriptionMax'),
          startsAtRequired: t('validation.startsAtRequired'),
          startsAtInvalid: t('validation.startsAtInvalid'),
          startsAtTooEarly: (minimumLeadDays) =>
            t('validation.startsAtTooEarly', { minimumLeadDays }),
          startsAtTooLate: (maximumPublishingHorizonDays) =>
            t('validation.startsAtTooLate', {
              maximumPublishingHorizonDays,
            }),
          capacityNumber: t('validation.capacityNumber'),
          capacityInteger: t('validation.capacityInteger'),
          capacityRange: (maximum) =>
            t('validation.capacityRange', { maximum }),
          minimumGuestCountNumber: t('validation.minimumGuestCountNumber'),
          minimumGuestCountInteger: t('validation.minimumGuestCountInteger'),
          minimumGuestCountRange: (maximum) =>
            t('validation.minimumGuestCountRange', { maximum }),
          minimumExceedsCapacity: t('validation.minimumExceedsCapacity'),
          payoutNumber: t('validation.payoutNumber'),
          payoutInteger: t('validation.payoutInteger'),
          payoutRange: t('validation.payoutRange'),
          atmosphereMin: t('validation.atmosphereMin'),
          atmosphereMax: t('validation.atmosphereMax'),
          participantsMin: t('validation.participantsMin'),
          participantsMax: t('validation.participantsMax'),
          practicalMin: t('validation.practicalMin'),
          practicalMax: t('validation.practicalMax'),
        },
        limits: {
          certifiedCapacity,
          minimumStartsAt,
          maximumStartsAt,
          minimumLeadDays: developmentPolicy.minimumLeadDays,
          maximumPublishingHorizonDays:
            developmentPolicy.maximumPublishingHorizonDays,
        },
      }),
    [certifiedCapacity, maximumStartsAt, minimumStartsAt, t],
  )
  const form = useForm<CreateHostedTableInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      menuTitle: '',
      menuDescription: '',
      startsAt: '',
      format: 'shared',
      proposedCapacity: Math.min(4, certifiedCapacity),
      minimumGuestCount: 2,
      hostNetPayoutTry: 1_200,
      atmosphere: '',
      expectedHouseholdParticipants: '',
      practicalInformation: '',
    },
  })
  const validationErrorCount = Object.keys(form.formState.errors).length
  const submit = form.handleSubmit(
    () => setResult(t('reviewed')),
    () => setResult(null),
  )

  return (
    <form
      aria-label={t('formLabel')}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={submit}
      className="space-y-7"
    >
      <Alert>
        <AlertDescription>
          {t('currentPolicy', {
            minimumLeadDays: developmentPolicy.minimumLeadDays,
            maximumPublishingHorizonDays:
              developmentPolicy.maximumPublishingHorizonDays,
            certifiedCapacity,
          })}
        </AlertDescription>
      </Alert>
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
          id="hosted-table-menu-title"
          label={t('menuTitle')}
          error={form.formState.errors.menuTitle?.message}
        >
          {(accessibilityProps) => (
            <Input {...accessibilityProps} {...form.register('menuTitle')} />
          )}
        </FormField>
        <FormField
          id="hosted-table-starts-at"
          label={t('startsAt')}
          error={form.formState.errors.startsAt?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="datetime-local"
              min={minimumStartsAt}
              max={maximumStartsAt}
              {...form.register('startsAt')}
            />
          )}
        </FormField>
        <div className="space-y-2">
          <Label htmlFor="hosted-table-format">{t('tableFormat')}</Label>
          <Controller
            control={form.control}
            name="format"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="hosted-table-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">{t('shared')}</SelectItem>
                  <SelectItem value="private">{t('private')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <FormField
          id="hosted-table-capacity"
          label={t('proposedCapacity')}
          error={form.formState.errors.proposedCapacity?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="number"
              min={1}
              max={certifiedCapacity}
              {...form.register('proposedCapacity', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField
          id="hosted-table-minimum-guests"
          label={t('minimumGuestCount')}
          error={form.formState.errors.minimumGuestCount?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="number"
              min={1}
              max={certifiedCapacity}
              {...form.register('minimumGuestCount', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField
          id="hosted-table-payout"
          label={t('payout')}
          error={form.formState.errors.hostNetPayoutTry?.message}
        >
          {(accessibilityProps) => (
            <Input
              {...accessibilityProps}
              type="number"
              min={100}
              step={1}
              {...form.register('hostNetPayoutTry', { valueAsNumber: true })}
            />
          )}
        </FormField>
      </div>
      <FormField
        id="hosted-table-menu-description"
        label={t('menuDescription')}
        error={form.formState.errors.menuDescription?.message}
      >
        {(accessibilityProps) => (
          <Textarea
            {...accessibilityProps}
            rows={6}
            {...form.register('menuDescription')}
          />
        )}
      </FormField>
      <FormField
        id="hosted-table-atmosphere"
        label={t('atmosphere')}
        error={form.formState.errors.atmosphere?.message}
      >
        {(accessibilityProps) => (
          <Textarea
            {...accessibilityProps}
            rows={3}
            {...form.register('atmosphere')}
          />
        )}
      </FormField>
      <FormField
        id="hosted-table-participants"
        label={t('participants')}
        error={form.formState.errors.expectedHouseholdParticipants?.message}
      >
        {(accessibilityProps) => (
          <Textarea
            {...accessibilityProps}
            rows={3}
            {...form.register('expectedHouseholdParticipants')}
          />
        )}
      </FormField>
      <FormField
        id="hosted-table-practical-information"
        label={t('practical')}
        error={form.formState.errors.practicalInformation?.message}
      >
        {(accessibilityProps) => (
          <Textarea
            {...accessibilityProps}
            rows={3}
            {...form.register('practicalInformation')}
          />
        )}
      </FormField>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? t('reviewing') : t('review')}
      </Button>
      {result ? (
        <p role="status" className="text-primary text-sm font-medium">
          {result}
        </p>
      ) : null}
    </form>
  )
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
