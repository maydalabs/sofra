import * as React from 'react'

import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A styled native `<select>`, visually matched to `Input`.
 *
 * Used wherever a select must work without client JavaScript: GET filter
 * forms and the server-action operator/host forms. The styled Radix `Select`
 * stays for client-side forms that are interactive anyway (react-hook-form).
 */
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <span className={cn('relative block w-full', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 h-8 w-full min-w-0 appearance-none rounded-lg border bg-transparent py-1 ps-2.5 pe-8 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2"
      />
    </span>
  )
}

export { NativeSelect }
