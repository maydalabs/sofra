'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
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

import { createHostedTableSchema, type CreateHostedTableInput } from './schemas'

function minimumDateTime() {
  const date = new Date()
  date.setDate(date.getDate() + developmentPolicy.minimumLeadDays)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function CreateTableForm({
  certifiedCapacity = 6,
  minimumStartsAt = minimumDateTime(),
}: {
  certifiedCapacity?: number
  minimumStartsAt?: string
}) {
  const [result, setResult] = useState<string | null>(null)
  const form = useForm<CreateHostedTableInput>({
    resolver: zodResolver(createHostedTableSchema),
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
  const format = useWatch({ control: form.control, name: 'format' })

  const submit = form.handleSubmit((values) => {
    const proposedDate = new Date(values.startsAt)
    const earliest = new Date(minimumStartsAt)
    if (proposedDate < earliest) {
      form.setError('startsAt', {
        message: `Choose a time at least ${developmentPolicy.minimumLeadDays} days away`,
      })
      return
    }
    if (values.proposedCapacity > certifiedCapacity) {
      form.setError('proposedCapacity', {
        message: `Certified maximum is ${certifiedCapacity}`,
      })
      return
    }
    setResult(
      'Draft validated locally. It remains private until submitted and approved by Sofra.',
    )
  })

  return (
    <form onSubmit={submit} className="space-y-7">
      <Alert>
        <AlertDescription>
          Current policy: create at least {developmentPolicy.minimumLeadDays}{' '}
          days ahead, within {developmentPolicy.maximumPublishingHorizonDays}{' '}
          days, and no more than your certified capacity of {certifiedCapacity}{' '}
          travelers.
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Menu title"
          error={form.formState.errors.menuTitle?.message}
        >
          <Input aria-label="Menu title" {...form.register('menuTitle')} />
        </FormField>
        <FormField
          label="Date and start time"
          error={form.formState.errors.startsAt?.message}
        >
          <Input
            aria-label="Date and start time"
            type="datetime-local"
            min={minimumStartsAt}
            {...form.register('startsAt')}
          />
        </FormField>
        <div className="space-y-2">
          <Label>Table format</Label>
          <Select
            value={format}
            onValueChange={(value) =>
              form.setValue('format', value as 'shared' | 'private')
            }
          >
            <SelectTrigger aria-label="Table format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">Shared table</SelectItem>
              <SelectItem value="private">Private table</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FormField
          label="Proposed traveler capacity"
          error={form.formState.errors.proposedCapacity?.message}
        >
          <Input
            aria-label="Proposed traveler capacity"
            type="number"
            min={1}
            max={certifiedCapacity}
            {...form.register('proposedCapacity', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Minimum guest count"
          error={form.formState.errors.minimumGuestCount?.message}
        >
          <Input
            aria-label="Minimum guest count"
            type="number"
            min={1}
            max={certifiedCapacity}
            {...form.register('minimumGuestCount', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Desired net payout per traveler (TRY)"
          error={form.formState.errors.hostNetPayoutTry?.message}
        >
          <Input
            aria-label="Desired net payout per traveler (TRY)"
            type="number"
            min={100}
            step={1}
            {...form.register('hostNetPayoutTry', { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <FormField
        label="Complete household-selected menu"
        error={form.formState.errors.menuDescription?.message}
      >
        <Textarea
          aria-label="Complete household-selected menu"
          rows={6}
          {...form.register('menuDescription')}
        />
      </FormField>
      <FormField
        label="Atmosphere"
        error={form.formState.errors.atmosphere?.message}
      >
        <Textarea
          aria-label="Atmosphere"
          rows={3}
          {...form.register('atmosphere')}
        />
      </FormField>
      <FormField
        label="Expected household participants"
        error={form.formState.errors.expectedHouseholdParticipants?.message}
      >
        <Textarea
          aria-label="Expected household participants"
          rows={3}
          {...form.register('expectedHouseholdParticipants')}
        />
      </FormField>
      <FormField
        label="Practical home information"
        error={form.formState.errors.practicalInformation?.message}
      >
        <Textarea
          aria-label="Practical home information"
          rows={3}
          {...form.register('practicalInformation')}
        />
      </FormField>
      <Button type="submit">Validate and save draft</Button>
      {result ? (
        <p role="status" className="text-primary text-sm font-medium">
          {result}
        </p>
      ) : null}
    </form>
  )
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
