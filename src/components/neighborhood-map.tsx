import { MapPin } from 'lucide-react'

import type { PublicHostedTable } from '@/features/hosted-tables/types'
import { getPublicMapModel } from '@/server/maps/maps'

export function NeighborhoodMap({ table }: { table: PublicHostedTable }) {
  const map = getPublicMapModel({
    neighborhood: table.neighborhood,
    approximateLatitude: table.publicCoordinate.latitude,
    approximateLongitude: table.publicCoordinate.longitude,
  })

  return (
    <div className="bg-secondary relative min-h-72 overflow-hidden rounded-3xl border">
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:42px_42px] opacity-70" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card max-w-xs rounded-2xl border p-5 text-center shadow-xl">
          <span className="bg-primary text-primary-foreground mx-auto flex size-10 items-center justify-center rounded-full">
            <MapPin className="size-4" />
          </span>
          <p className="mt-3 font-semibold">{table.neighborhood}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {map.kind === 'fallback'
              ? map.label
              : 'Google Maps adapter configured · approximate area only'}
          </p>
        </div>
      </div>
    </div>
  )
}
