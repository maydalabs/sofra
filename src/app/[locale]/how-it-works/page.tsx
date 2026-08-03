import { CheckCircle2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EditorialPhoto } from '@/components/editorial-photo'
import { Card, CardContent } from '@/components/ui/card'

interface StepCopy {
  title: string
  body: string
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('How')
  const steps = t.raw('steps') as StepCopy[]
  const standards = t.raw('standards') as string[]

  return (
    <div>
      <section className="container-shell grid gap-10 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-24">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-5 max-w-4xl text-5xl leading-[.98] font-medium tracking-tight sm:text-7xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
            {t('intro')}
          </p>
        </div>
        <EditorialPhoto
          label="Replaceable welcome-at-the-door photography"
          className="aspect-[4/3] min-h-0"
          tone="sage"
        />
      </section>
      <section className="container-shell grid gap-5 pb-24 lg:grid-cols-5">
        {steps.map((step, index) => (
          <Card key={step.title} className="bg-card/70">
            <CardContent className="p-5">
              <span className="text-clay font-heading text-3xl">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-8 text-2xl leading-tight font-medium">
                {step.title}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {step.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="bg-secondary/75 border-y">
        <div className="container-shell grid gap-10 py-20 lg:grid-cols-[.8fr_1.2fr]">
          <h2 className="text-4xl font-medium sm:text-5xl">
            {t('standardsTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {standards.map((standard) => (
              <div
                key={standard}
                className="bg-card flex gap-3 rounded-2xl border p-4"
              >
                <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
                <span className="text-sm leading-6">{standard}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
