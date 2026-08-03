import { cn } from '@/lib/utils'

export function EditorialPhoto({
  label,
  className,
  tone = 'warm',
  showLabel = true,
}: {
  label: string
  className?: string
  tone?: 'warm' | 'sage' | 'ink'
  showLabel?: boolean
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'editorial-photo flex min-h-64 items-end rounded-[1.5rem] border p-5',
        tone === 'sage' && 'hue-rotate-[22deg]',
        tone === 'ink' && 'brightness-75 saturate-75',
        className,
      )}
    >
      {showLabel ? (
        <span className="bg-background/88 relative z-10 max-w-52 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase backdrop-blur">
          {label}
        </span>
      ) : null}
    </div>
  )
}
