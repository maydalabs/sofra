import { getTranslations } from 'next-intl/server'

import { triageIncidentAction } from '@/app/[locale]/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Label } from '@/components/ui/label'
import type { IncidentStatus } from '@/server/database/database.types'

const statuses: IncidentStatus[] = [
  'open',
  'triaged',
  'investigating',
  'resolved',
  'closed',
]

/**
 * Moves a safety incident through triage.
 *
 * Resolving matters beyond the incident itself: an open incident blocks the
 * payout for that dinner, so this form is also how money becomes releasable
 * again. The database enforces that coupling either way.
 *
 * A native select rather than the styled combobox, so this works without client
 * JavaScript.
 */
export async function IncidentTriageForm({
  locale,
  incidentId,
  status,
}: {
  locale: string
  incidentId: string
  status: IncidentStatus
}) {
  const t = await getTranslations('Admin')
  const settled = status === 'resolved' || status === 'closed'
  const selectId = `incident-status-${incidentId}`
  const reasonId = `incident-reason-${incidentId}`

  return (
    <form
      action={triageIncidentAction}
      className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="incidentId" value={incidentId} />

      <div className="space-y-1">
        <Label htmlFor={selectId} className="text-xs">
          {t('triageStatus')}
        </Label>
        <NativeSelect id={selectId} name="status" defaultValue={status}>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`incidentStatuses.${value}`)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor={reasonId} className="text-xs">
          {t('reason')}
        </Label>
        <Input
          id={reasonId}
          name="reason"
          placeholder={t('optionalNotePlaceholder')}
        />
      </div>

      <Button type="submit" size="sm" variant="outline">
        {t('triageSubmit')}
      </Button>

      {settled ? (
        <p className="text-muted-foreground w-full text-xs">
          {t('incidentPayoutClear')}
        </p>
      ) : null}
    </form>
  )
}
