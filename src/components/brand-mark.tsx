import { Link } from '@/i18n/navigation'

export function BrandMark({ homeLabel }: { homeLabel: string }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-baseline gap-1"
      aria-label={homeLabel}
    >
      <span className="font-heading text-3xl font-semibold tracking-[-0.04em]">
        Sofra
      </span>
      <span
        aria-hidden="true"
        className="bg-clay size-1.5 rounded-full transition-transform group-hover:scale-125"
      />
    </Link>
  )
}
