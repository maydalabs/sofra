import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'

export interface PortalNavigationItem {
  href: string
  label: string
}

export function PortalShell({
  title,
  description,
  items,
  actorLabel,
  children,
}: {
  title: string
  description: string
  items: readonly PortalNavigationItem[]
  actorLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="container-shell py-8 sm:py-12">
      <div className="mb-8 flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Product workspace</p>
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
        <aside>
          <nav
            className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-28 lg:flex-col"
            aria-label={`${title} navigation`}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:bg-secondary shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
