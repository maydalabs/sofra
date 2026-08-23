import {
  ArrowRight,
  Eye,
  House,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { chooseDemoJourneyStep } from '../actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  demoJourneyChapterIds,
  getDemoJourneyChapterSteps,
  type DemoJourneyBoundary,
  type DemoJourneyPersona,
} from '@/features/demo/journey'
import { isDemoMode } from '@/server/auth/demo-session'

const personaIcons = {
  traveler: UserRound,
  host: House,
  operator: ShieldCheck,
} satisfies Record<DemoJourneyPersona, typeof UserRound>

const boundaryIcons = {
  public: Eye,
  private: LockKeyhole,
  restricted: ShieldCheck,
} satisfies Record<DemoJourneyBoundary, typeof Eye>

export default async function DemoJourneyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isDemoMode()) redirect(`/${locale}/unavailable`)
  setRequestLocale(locale)
  const t = await getTranslations('DemoJourney')

  return (
    <div className="container-shell py-12 sm:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-4 text-5xl font-medium sm:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-3xl leading-7">
          {t('intro')}
        </p>
        <Badge variant="outline" className="mt-6">
          {t('readOnly')}
        </Badge>
      </div>

      <div className="mx-auto mt-14 max-w-6xl space-y-10">
        {demoJourneyChapterIds.map((chapter, chapterIndex) => (
          <section key={chapter} aria-labelledby={`chapter-${chapter}`}>
            <div className="mb-5 flex items-start gap-4">
              <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {chapterIndex + 1}
              </span>
              <div>
                <h2 id={`chapter-${chapter}`} className="text-3xl font-medium">
                  {t(`chapters.${chapter}.title`)}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {t(`chapters.${chapter}.body`)}
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {getDemoJourneyChapterSteps(chapter).map((step, stepIndex) => {
                const PersonaIcon = personaIcons[step.persona]
                const BoundaryIcon = boundaryIcons[step.boundary]
                return (
                  <Card key={step.id} className="relative overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="secondary">
                          {t(`personas.${step.persona}`)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {chapterIndex + 1}.{stepIndex + 1}
                        </span>
                      </div>
                      <CardTitle className="mt-4 text-2xl">
                        {t(`steps.${step.id}.title`)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex h-[calc(100%-8rem)] flex-col">
                      <p className="text-muted-foreground text-sm leading-6">
                        {t(`steps.${step.id}.body`)}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs">
                        <span className="bg-secondary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                          <PersonaIcon className="size-3.5" />
                          {step.state}
                        </span>
                        <span className="bg-secondary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                          <BoundaryIcon className="size-3.5" />
                          {t(`boundaries.${step.boundary}`)}
                        </span>
                      </div>
                      <form
                        action={chooseDemoJourneyStep}
                        className="mt-auto pt-6"
                      >
                        <input type="hidden" name="step" value={step.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <Button className="w-full" variant="outline">
                          {t('openStep')}
                          <ArrowRight className="size-4" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
