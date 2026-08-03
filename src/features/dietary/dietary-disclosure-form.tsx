'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole } from 'lucide-react'
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
        <AlertTitle>Private compatibility information</AlertTitle>
        <AlertDescription>
          This is kept outside your public profile and excluded from product
          analytics. Hosts receive only the information needed to assess and
          deliver a confirmed dinner.
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Disclosure type</Label>
          <Select
            value={kind}
            onValueChange={(value) =>
              form.setValue('kind', value as DietaryDisclosureInput['kind'])
            }
          >
            <SelectTrigger aria-label="Disclosure type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allergy">Allergy</SelectItem>
              <SelectItem value="intolerance">Intolerance</SelectItem>
              <SelectItem value="dietary_restriction">
                Dietary restriction
              </SelectItem>
              <SelectItem value="religious_food_restriction">
                Religious food restriction
              </SelectItem>
              <SelectItem value="preference">Preference</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Importance</Label>
          <Select
            value={importance}
            onValueChange={(value) =>
              form.setValue(
                'importance',
                value as DietaryDisclosureInput['importance'],
              )
            }
          >
            <SelectTrigger aria-label="Importance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Preference</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="severe">Severe / safety critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dietary-explanation">
          What should the compatibility reviewer understand?
        </Label>
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
      <Button type="submit">Save private disclosure</Button>
      {saved ? (
        <p role="status" className="text-primary text-sm font-medium">
          Saved in the local demo. No analytics payload contains the disclosure.
        </p>
      ) : null}
    </form>
  )
}
