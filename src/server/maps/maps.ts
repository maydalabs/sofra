export interface PublicNeighborhoodLocation {
  neighborhood: string
  /** Null when the household has no verified approximate coordinates yet. */
  approximateLatitude: number | null
  approximateLongitude: number | null
}

export type PublicMapModel =
  | { kind: 'google'; apiKey: string; location: PublicNeighborhoodLocation }
  | { kind: 'fallback'; label: string; location: PublicNeighborhoodLocation }

export function getPublicMapModel(
  location: PublicNeighborhoodLocation,
): PublicMapModel {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  // Without coordinates there is nothing to plot, so the neighbourhood name is
  // the honest answer regardless of whether a map key is configured.
  if (
    !apiKey ||
    location.approximateLatitude === null ||
    location.approximateLongitude === null
  ) {
    return {
      kind: 'fallback',
      label: `Approximate area: ${location.neighborhood}`,
      location,
    }
  }
  return { kind: 'google', apiKey, location }
}
