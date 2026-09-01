import { Badge } from '@/components/ui/badge'

import { PortalNavigation } from './portal-navigation'

export interface PortalNavigationItem {
  href: string
  label: string
}

export function PortalShell({
  title,
  description,
  items,
  actorLabel,
  workspaceLabel,
  navigationLabel,
  children,
}: {
  title: string
  description: string
  items: readonly PortalNavigationItem[]
  actorLabel: string
  workspaceLabel: string
  navigationLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="container-shell py-8 sm:py-12">
      <div className="mb-8 flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{workspaceLabel}</p>
          <h1 className="mt-2 text-4xl font-medium sm:text-5xl">{title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            {description}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {actorLabel}
        </Badge>
      </div>
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <aside className="min-w-0">
          <PortalNavigation items={items} label={navigationLabel} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
