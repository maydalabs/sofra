import { getTranslations } from 'next-intl/server'

import {
  holdPayoutAction,
  releasePayoutAction,
} from '@/app/[locale]/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PayoutStatus } from '@/server/database/database.types'

/**
 * Hold and release controls for one payout.
 *
 * Release is offered even when an incident is open: the database refuses it and
 * the page reports why. Hiding the control would make the rule invisible, and
 * an operator who cannot see why money is stuck will go looking somewhere less
 * safe.
 */
export async function PayoutControls({
  locale,
  payoutId,
  status,
}: {
  locale: string
  payoutId: string
  status: PayoutStatus
}) {
  const t = await getTranslations('Admin')
  const released = status === 'released'
  const holdReasonId = `hold-reason-${payoutId}`

  if (released) return null

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
      <form action={holdPayoutAction} className="flex items-end gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="payoutId" value={payoutId} />
        <div className="space-y-1">
          <Label htmlFor={holdReasonId} className="text-xs">
            {t('holdReason')}
          </Label>
          <Input
            id={holdReasonId}
            name="holdReason"
            placeholder={t('reasonPlaceholder')}
            required
          />
        </div>
        <Button type="submit" size="sm" variant="outline">
          {t('holdPayout')}
        </Button>
      </form>

      <form action={releasePayoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="payoutId" value={payoutId} />
        <Button type="submit" size="sm">
          {t('releasePayout')}
        </Button>
      </form>
    </div>
  )
}
