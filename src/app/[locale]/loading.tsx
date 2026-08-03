import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div
      className="container-shell space-y-7 py-16"
      role="status"
      aria-label="Loading Sofra"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-20 max-w-3xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <Skeleton className="aspect-[4/3] rounded-3xl" />
      </div>
    </div>
  )
}
