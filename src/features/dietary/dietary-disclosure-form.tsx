'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { dietaryDisclosureSchema, type DietaryDisclosureInput } from './schemas'

export function DietaryDisclosureForm() {
  const t = useTranslations('Dietary')
  const [saved, setSaved] = useState(false)
  const form = useForm<DietaryDisclosureInput>({
    resolver: zodResolver(dietaryDisclosureSchema),
    defaultValues: {
      kind: 'allergy',
      importance: 'important',
      explanation: '',
    },
  })
  const kind = useWatch({ control: form.control, name: 'kind' })
  const importance = useWatch({ control: form.control, name: 'importance' })

  return (
    <form
      onSubmit={form.handleSubmit(() => setSaved(true))}
      className="space-y-6"
    >
      <Alert>
        <LockKeyhole className="size-4" />
        <AlertTitle>{t('privacyTitle')}</AlertTitle>
        <AlertDescription>{t('privacyBody')}</AlertDescription>
      </Alert>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('type')}</Label>
          <Select
            value={kind}
            onValueChange={(value) =>
              form.setValue('kind', value as DietaryDisclosureInput['kind'])
            }
          >
            <SelectTrigger aria-label={t('type')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allergy">{t('types.allergy')}</SelectItem>
              <SelectItem value="intolerance">
                {t('types.intolerance')}
              </SelectItem>
              <SelectItem value="dietary_restriction">
                {t('types.dietaryRestriction')}
              </SelectItem>
              <SelectItem value="religious_food_restriction">
                {t('types.religiousRestriction')}
              </SelectItem>
              <SelectItem value="preference">
                {t('types.preference')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('importance')}</Label>
          <Select
            value={importance}
            onValueChange={(value) =>
              form.setValue(
                'importance',
                value as DietaryDisclosureInput['importance'],
              )
            }
          >
            <SelectTrigger aria-label={t('importance')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('levels.low')}</SelectItem>
              <SelectItem value="important">{t('levels.important')}</SelectItem>
              <SelectItem value="severe">{t('levels.severe')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dietary-explanation">{t('explanation')}</Label>
        <Textarea
          id="dietary-explanation"
          rows={5}
          {...form.register('explanation')}
        />
        {form.formState.errors.explanation ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.explanation.message}
          </p>
        ) : null}
      </div>
      <Button type="submit">{t('save')}</Button>
      {saved ? (
        <p role="status" className="text-primary text-sm font-medium">
          {t('saved')}
        </p>
      ) : null}
    </form>
  )
}
