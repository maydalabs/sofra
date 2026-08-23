import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  headingLevel = 2,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: React.ReactNode
  headingLevel?: 2 | 3
  className?: string
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <div className="bg-secondary text-primary flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <Heading className="mt-4 text-2xl font-semibold">{title}</Heading>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
