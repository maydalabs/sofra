import { getTranslations } from 'next-intl/server'

import { decideHostApplicationAction } from '@/app/[locale]/admin/actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ApplicationStatus } from '@/server/database/database.types'

/**
 * The operator's decision on a host application.
 *
 * Approving here is the act that certifies a household and grants the host
 * role, so the capacity field is not decoration -- it becomes the number of
 * travellers that household may ever seat. The rubric behind the number is
 * still an open product decision, which is exactly why it is an operator
 * judgement rather than something derived.
 *
 * Plain form posts with named submit buttons: three decisions, one form, and no
 * dependency on client JavaScript for an action this consequential.
 */
const decidableStatuses: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'changes_requested',
]

export async function ApplicationDecisionPanel({
  locale,
  applicationId,
  status,
  outcome,
  error,
}: {
  locale: string
  applicationId: string
  status: ApplicationStatus
  outcome?: string
  error?: string
}) {
  const t = await getTranslations('Admin')

  const errorMessage =
    error === 'not_authorized'
      ? t('decisionErrorNotAuthorized')
      : error === 'invalid_transition'
        ? t('decisionErrorCapacity')
        : error === 'application_has_no_household'
          ? t('decisionErrorNoHousehold')
          : error === 'application_not_decidable'
            ? t('decisionErrorInvalid')
            : error
              ? t('actionFailed')
              : null

  const outcomeMessage =
    outcome === 'approve'
      ? t('decisionOutcomeApproved')
      : outcome === 'changes_requested'
        ? t('decisionOutcomeChanges')
        : outcome === 'decline'
          ? t('decisionOutcomeDeclined')
          : null

  if (!decidableStatuses.includes(status)) {
    return (
      <div className="space-y-4">
        {outcomeMessage ? (
          <Alert>
            <AlertDescription>{outcomeMessage}</AlertDescription>
          </Alert>
        ) : null}
        <Alert>
          <AlertTitle>{t('decisionSettled')}</AlertTitle>
          <AlertDescription>
            {t(`applicationStatuses.${status}`)}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertTitle>{t('decisionHeading')}</AlertTitle>
        <AlertDescription id="decision-note">
          {t('decisionIntro')}
        </AlertDescription>
      </Alert>

      <form
        action={decideHostApplicationAction}
        aria-describedby="decision-note"
        className="space-y-4"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="applicationId" value={applicationId} />

        <div className="space-y-2">
          <Label htmlFor="certifiedCapacity">{t('certifiedCapacity')}</Label>
          <Input
            id="certifiedCapacity"
            name="certifiedCapacity"
            type="number"
            min={1}
            max={12}
            aria-describedby="capacity-help"
          />
          <p id="capacity-help" className="text-muted-foreground text-xs">
            {t('certifiedCapacityHelp')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">{t('decisionReason')}</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={4}
            placeholder={t('reasonPlaceholder')}
            aria-describedby="reason-help"
          />
          <p id="reason-help" className="text-muted-foreground text-xs">
            {t('decisionReasonHelp')}
          </p>
        </div>

        <div className="space-y-2">
          <Button
            type="submit"
            name="decision"
            value="approve"
            className="w-full"
          >
            {t('decisionApprove')}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="changes_requested"
            variant="outline"
            className="w-full"
          >
            {t('decisionRequestChanges')}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="decline"
            variant="ghost"
            className="w-full"
          >
            {t('decisionDecline')}
          </Button>
        </div>
      </form>
    </div>
  )
}
