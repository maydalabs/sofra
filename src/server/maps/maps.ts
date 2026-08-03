export interface PublicNeighborhoodLocation {
  neighborhood: string
  approximateLatitude: number
  approximateLongitude: number
}

export type PublicMapModel =
  | { kind: 'google'; apiKey: string; location: PublicNeighborhoodLocation }
  | { kind: 'fallback'; label: string; location: PublicNeighborhoodLocation }

export function getPublicMapModel(
  location: PublicNeighborhoodLocation,
): PublicMapModel {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return {
      kind: 'fallback',
      label: `Approximate area: ${location.neighborhood}`,
      location,
    }
  }
  return { kind: 'google', apiKey, location }
}
