import { Link } from '@/i18n/navigation'

export function BrandMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-baseline gap-1"
      aria-label="Sofra home"
    >
      <span className="font-heading text-3xl font-semibold tracking-[-0.04em]">
        Sofra
      </span>
      <span className="bg-clay size-1.5 rounded-full transition-transform group-hover:scale-125" />
    </Link>
  )
}
